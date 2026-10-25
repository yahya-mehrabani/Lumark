package diagnostics

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
)

func TestDiagnosticsLog_DefaultOptions(t *testing.T) {
	opts := DefaultOptions("/tmp/test/app.log")
	if opts.MaxSizeBytes != 5*1024*1024 {
		t.Fatalf("expected MaxSizeBytes 5 MiB (5242880), got %d", opts.MaxSizeBytes)
	}
	if opts.MaxBackups != 1 {
		t.Fatalf("expected MaxBackups 1, got %d", opts.MaxBackups)
	}
	if !opts.RedactPaths || !opts.RedactCredentials || !opts.RedactDocumentContent {
		t.Fatalf("expected privacy flags to be enabled by default")
	}
}

func TestDiagnosticsLog_Rotation(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_rotation_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	backupPath := filepath.Join(tempDir, "app.log.1")

	// Set small rotation limit (256 bytes) to verify rotation triggering
	opts := Options{
		FilePath:              logPath,
		MaxSizeBytes:          256,
		MaxBackups:            1,
		RedactPaths:           true,
		RedactCredentials:     true,
		RedactDocumentContent: true,
	}

	logger, err := NewLogger(opts)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer func() {
		_ = logger.Close()
	}()

	// Write first batch of logs
	for i := 0; i < 5; i++ {
		logger.Info("TestComp", fmt.Sprintf("Log message iteration %d", i))
	}

	// Verify app.log exists and has content
	stat, err := os.Stat(logPath)
	if err != nil {
		t.Fatalf("expected app.log to exist: %v", err)
	}
	if stat.Size() == 0 {
		t.Fatalf("expected app.log to have non-zero size")
	}

	// Write more logs to exceed the 256-byte threshold and force rotation
	for i := 5; i < 20; i++ {
		logger.Info("TestComp", fmt.Sprintf("Additional log message iteration %d with padding to reach threshold", i))
	}

	_ = logger.Close()

	// Verify backup app.log.1 exists
	bStat, err := os.Stat(backupPath)
	if err != nil {
		t.Fatalf("expected app.log.1 to exist after rotation: %v", err)
	}
	if bStat.Size() == 0 {
		t.Fatalf("expected app.log.1 to have content")
	}

	// Verify active app.log exists and is bounded
	aStat, err := os.Stat(logPath)
	if err != nil {
		t.Fatalf("expected app.log to exist after rotation: %v", err)
	}
	if aStat.Size() > opts.MaxSizeBytes {
		t.Fatalf("app.log size %d exceeded max bound %d", aStat.Size(), opts.MaxSizeBytes)
	}

	totalSize := aStat.Size() + bStat.Size()
	t.Logf("Rotation verified: active app.log = %d bytes, backup app.log.1 = %d bytes, total = %d bytes",
		aStat.Size(), bStat.Size(), totalSize)
}

func TestDiagnosticsLog_PathRedaction(t *testing.T) {
	fakeHome := filepath.Join(string(filepath.Separator), "home", "alice")
	sanitizer := NewSanitizerWithHome(fakeHome)

	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "User home document path",
			input:    filepath.Join(fakeHome, "documents", "project", "readme.md"),
			expected: filepath.Join("~", "documents", "project", "readme.md"),
		},
		{
			name:     "Direct user home",
			input:    fakeHome,
			expected: "~",
		},
		{
			name:     "Generic Linux user home",
			input:    "/home/bob/notes.md",
			expected: "~/notes.md",
		},
		{
			name:     "Generic macOS user home",
			input:    "/Users/charlie/notes.md",
			expected: "~/notes.md",
		},
		{
			name:     "System path outside home",
			input:    "/var/log/syslog",
			expected: "/var/log/syslog",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := sanitizer.SanitizePath(tc.input)
			if got != tc.expected {
				t.Errorf("SanitizePath(%q) = %q, expected %q", tc.input, got, tc.expected)
			}
		})
	}
}

func TestDiagnosticsLog_CredentialRedaction(t *testing.T) {
	sanitizer := NewSanitizer()

	testCases := []struct {
		name        string
		input       string
		mustContain string
		mustNotHave string
	}{
		{
			name:        "Bearer token",
			input:       "Request failed with Bearer secret-token-1234567890",
			mustContain: "Bearer [REDACTED]",
			mustNotHave: "secret-token-1234567890",
		},
		{
			name:        "Basic auth",
			input:       "Authorization header Basic dXNlcjpwYXNzd29yZA==",
			mustContain: "Basic [REDACTED]",
			mustNotHave: "dXNlcjpwYXNzd29yZA==",
		},
		{
			name:        "Password key-value",
			input:       "Connection failed with password=super_secret_pwd_99",
			mustContain: "password=[REDACTED]",
			mustNotHave: "super_secret_pwd_99",
		},
		{
			name:        "API key key-value",
			input:       "Config error: api_key='sk-ant-api03-abcdef123456'",
			mustContain: "api_key=[REDACTED]",
			mustNotHave: "sk-ant-api03-abcdef123456",
		},
		{
			name:        "JWT token",
			input:       "User session eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG4B1sW7Fp7",
			mustContain: "[REDACTED_JWT_TOKEN]",
			mustNotHave: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		},
		{
			name:        "PEM Private Key block",
			input:       "Error loading key: -----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0\n-----END RSA PRIVATE KEY-----",
			mustContain: "[REDACTED_PRIVATE_KEY]",
			mustNotHave: "MIIEowIBAAKCAQEA0",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			got := sanitizer.SanitizeMessage(tc.input)
			if !strings.Contains(got, tc.mustContain) {
				t.Errorf("SanitizeMessage(%q) = %q, missing expected %q", tc.input, got, tc.mustContain)
			}
			if strings.Contains(got, tc.mustNotHave) {
				t.Errorf("SanitizeMessage(%q) leaked sensitive value %q in %q", tc.input, tc.mustNotHave, got)
			}
		})
	}
}

func TestDiagnosticsLog_DocumentContentAndHistoryMasking(t *testing.T) {
	sanitizer := NewSanitizer()

	rawMarkdown := "# Confidential Document\n\nThis is secret customer document text with PII.\n"

	fields := map[string]interface{}{
		"filename":      "report.md",
		"content":       rawMarkdown,
		"document":      rawMarkdown,
		"markdown":      rawMarkdown,
		"doc_content":   rawMarkdown,
		"recentFiles":   []string{"/home/user/doc1.md", "/home/user/doc2.md"},
		"password":      "supersecret",
		"fileSizeBytes": 1024,
	}

	cleaned := sanitizer.SanitizeFields(fields)

	// Check content masking
	for _, key := range []string{"content", "document", "markdown", "doc_content"} {
		if cleaned[key] != "[REDACTED_DOCUMENT_CONTENT]" {
			t.Errorf("expected field %q to be masked with [REDACTED_DOCUMENT_CONTENT], got: %v", key, cleaned[key])
		}
	}

	// Check credentials and history masking
	if cleaned["password"] != "[REDACTED]" {
		t.Errorf("expected password to be masked with [REDACTED], got: %v", cleaned["password"])
	}
	if cleaned["recentFiles"] != "[REDACTED]" {
		t.Errorf("expected recentFiles to be masked with [REDACTED], got: %v", cleaned["recentFiles"])
	}

	// Normal fields preserved
	if cleaned["filename"] != "report.md" {
		t.Errorf("expected filename to be preserved, got: %v", cleaned["filename"])
	}
	if cleaned["fileSizeBytes"] != 1024 {
		t.Errorf("expected fileSizeBytes to be preserved, got: %v", cleaned["fileSizeBytes"])
	}
}

func TestDiagnosticsLog_ConcurrentWrites(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_concurrent_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	opts := Options{
		FilePath:              logPath,
		MaxSizeBytes:          4096,
		MaxBackups:            1,
		RedactPaths:           true,
		RedactCredentials:     true,
		RedactDocumentContent: true,
	}

	logger, err := NewLogger(opts)
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer func() {
		_ = logger.Close()
	}()

	var wg sync.WaitGroup
	workers := 10
	iterations := 25

	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for i := 0; i < iterations; i++ {
				logger.Info("WorkerComp", fmt.Sprintf("Worker %d message %d", workerID, i))
			}
		}(w)
	}

	wg.Wait()
	_ = logger.Close()

	// Verify log file is readable and not corrupt
	lines, err := logger.ReadLogs()
	if err != nil {
		t.Fatalf("failed to read logs after concurrent writes: %v", err)
	}
	if len(lines) == 0 {
		t.Fatalf("expected log lines to be present")
	}
	t.Logf("Concurrent test successfully wrote %d lines in active log", len(lines))
}
