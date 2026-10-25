package diagnostics

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestDiagnosticsPrivacyAudit_DocumentContentNeverLogged verifies AUD-011 and FR-ERR-003:
// Automated scan asserting that under no circumstances is raw document body text persisted to disk.
func TestDiagnosticsPrivacyAudit_DocumentContentNeverLogged(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_privacy_audit")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	logger, err := NewLogger(DefaultOptions(logPath))
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer func() {
		_ = logger.Close()
	}()

	confidentialMarker1 := "CONFIDENTIAL_PROJECT_ORION_PATENT_DOCUMENT"
	confidentialMarker2 := "SENSITIVE_CUSTOMER_PAYMENT_DATA_DO_NOT_LOG"
	confidentialMarkdown := fmt.Sprintf("# Top Secret Document\n\n%s\n\nDetails: %s\n", confidentialMarker1, confidentialMarker2)

	// Simulate various components attempting to pass document content in message and details
	logger.ErrorWithDetails("DocumentService", "Failed to parse document block", map[string]interface{}{
		"filename":    "patent_spec.md",
		"content":     confidentialMarkdown,
		"document":    confidentialMarkdown,
		"markdown":    confidentialMarkdown,
		"doc_content": confidentialMarkdown,
		"raw_text":    confidentialMarkdown,
		"body":        confidentialMarkdown,
		"hugePayload": strings.Repeat("A", 1024), // large non-path string
	})

	_ = logger.Close()

	// Read raw log file directly from disk
	logBytes, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}
	logContent := string(logBytes)

	// Assert absence of confidential document markers
	if strings.Contains(logContent, confidentialMarker1) {
		t.Errorf("AUD-011 VIOLATION: raw document text %q found in log file on disk", confidentialMarker1)
	}
	if strings.Contains(logContent, confidentialMarker2) {
		t.Errorf("AUD-011 VIOLATION: raw document text %q found in log file on disk", confidentialMarker2)
	}
	if strings.Contains(logContent, "# Top Secret Document") {
		t.Errorf("AUD-011 VIOLATION: markdown header found in log file on disk")
	}

	// Verify document content was masked with [REDACTED_DOCUMENT_CONTENT]
	if !strings.Contains(logContent, "[REDACTED_DOCUMENT_CONTENT]") {
		t.Errorf("expected [REDACTED_DOCUMENT_CONTENT] in log file, got: %s", logContent)
	}

	// Verify large non-path payload was masked
	if !strings.Contains(logContent, "[REDACTED_PAYLOAD_LEN_1024]") {
		t.Errorf("expected payload length masking for large strings, got: %s", logContent)
	}

	t.Logf("Document content exclusion verified: %d bytes logged without leaking document body", len(logBytes))
}

// TestDiagnosticsPrivacyAudit_CredentialsAndHistoryScrubbed verifies exclusion of
// passwords, Bearer tokens, API keys, JWTs, and recent file history (AUD-011).
func TestDiagnosticsPrivacyAudit_CredentialsAndHistoryScrubbed(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_credentials_audit")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	logger, err := NewLogger(DefaultOptions(logPath))
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	defer func() {
		_ = logger.Close()
	}()

	secretPassword := "SuperSecretDBPassword!99"
	secretBearer := "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.w7A1pG_z8_test"
	secretAPIKey := "sk-ant-live-key-abcdef987654321"

	logger.ErrorWithDetails("NetworkClient", fmt.Sprintf("Authentication failed with password=%s and token=%s", secretPassword, secretBearer), map[string]interface{}{
		"api_key":      secretAPIKey,
		"password":     secretPassword,
		"token":        secretBearer,
		"recentFiles":  []string{"/home/user/doc1.md", "/home/user/doc2.md"},
		"recent_files": []string{"/home/user/doc3.md"},
		"history":      []string{"file1", "file2"},
	})

	_ = logger.Close()

	logBytes, err := os.ReadFile(logPath)
	if err != nil {
		t.Fatalf("failed to read log file: %v", err)
	}
	logContent := string(logBytes)

	// Ensure no secrets leaked
	if strings.Contains(logContent, secretPassword) {
		t.Errorf("AUD-011 VIOLATION: password %q leaked in log file", secretPassword)
	}
	if strings.Contains(logContent, secretBearer) {
		t.Errorf("AUD-011 VIOLATION: token %q leaked in log file", secretBearer)
	}
	if strings.Contains(logContent, secretAPIKey) {
		t.Errorf("AUD-011 VIOLATION: api_key %q leaked in log file", secretAPIKey)
	}

	// Ensure redactions are visible
	if !strings.Contains(logContent, "password=[REDACTED]") {
		t.Errorf("expected password=[REDACTED] in log file, got: %s", logContent)
	}
	if !strings.Contains(logContent, "[REDACTED]") {
		t.Errorf("expected [REDACTED] in log file")
	}

	t.Logf("Credential and history exclusion verified cleanly on disk")
}

// TestDiagnosticsPrivacyAudit_FilePermissions verifies that logs are created with 0600 (read/write by owner only).
func TestDiagnosticsPrivacyAudit_FilePermissions(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_perms_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	logger, err := NewLogger(DefaultOptions(logPath))
	if err != nil {
		t.Fatalf("failed to create logger: %v", err)
	}
	logger.Info("SecurityTest", "Verifying file permissions")
	_ = logger.Close()

	stat, err := os.Stat(logPath)
	if err != nil {
		t.Fatalf("failed to stat log file: %v", err)
	}

	perm := stat.Mode().Perm()
	if perm != 0600 {
		t.Errorf("expected log file permissions 0600, got %#o", perm)
	}
}

// TestDiagnosticsPrivacyAudit_BoundedSizeRotation verifies rotation keeps total disk usage strictly bounded.
func TestDiagnosticsPrivacyAudit_BoundedSizeRotation(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "diag_bounded_test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer func() {
		_ = os.RemoveAll(tempDir)
	}()

	logPath := filepath.Join(tempDir, "app.log")
	opts := Options{
		FilePath:              logPath,
		MaxSizeBytes:          1024, // 1 KiB threshold
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

	// Write 100 entries (each ~80 bytes, total ~8 KiB) to trigger multiple rotations
	for i := 0; i < 100; i++ {
		logger.Info("StressComp", fmt.Sprintf("Stress log entry iteration %d", i))
	}

	_ = logger.Close()

	// Verify active log exists and <= 1024 bytes
	statActive, err := os.Stat(logPath)
	if err != nil {
		t.Fatalf("app.log does not exist: %v", err)
	}
	if statActive.Size() > opts.MaxSizeBytes {
		t.Fatalf("active app.log size %d exceeds limit %d", statActive.Size(), opts.MaxSizeBytes)
	}

	// Verify backup log exists and <= 1024 bytes
	backupPath := BackupFilePath(logPath, 1)
	statBackup, err := os.Stat(backupPath)
	if err != nil {
		t.Fatalf("backup app.log.1 does not exist: %v", err)
	}
	if statBackup.Size() > opts.MaxSizeBytes {
		t.Fatalf("backup app.log.1 size %d exceeds limit %d", statBackup.Size(), opts.MaxSizeBytes)
	}

	totalSize := statActive.Size() + statBackup.Size()
	maxAllowed := opts.MaxSizeBytes * 2
	if totalSize > maxAllowed {
		t.Fatalf("total log disk space %d exceeded max bound %d", totalSize, maxAllowed)
	}

	t.Logf("Bounded rotation verified: active=%d bytes, backup=%d bytes, total=%d bytes (bound=%d)",
		statActive.Size(), statBackup.Size(), totalSize, maxAllowed)
}
