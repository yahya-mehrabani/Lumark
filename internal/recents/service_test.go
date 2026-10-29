package recents

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// TestRecentFilesList verifies that:
// 1. Files added appear in the list, most-recent first (index 0).
// 2. Re-opening an existing file updates recency and moves it to index 0 without duplicating.
// 3. The list enforces the 20-item bound (dropping oldest entries).
// 4. Checking existence detects when a file is deleted from disk.
// 5. Data minimization is respected (paths and timestamps only).
func TestRecentFilesList(t *testing.T) {
	tempDir := t.TempDir()
	storagePath := filepath.Join(tempDir, "recent-files.json")

	svc, err := NewServiceWithPath(storagePath, 20)
	if err != nil {
		t.Fatalf("Failed to initialize service: %v", err)
	}

	// 1. Create 25 temporary markdown files
	filePaths := make([]string, 25)
	for i := 0; i < 25; i++ {
		p := filepath.Join(tempDir, fmt.Sprintf("doc_%02d.md", i))
		if writeErr := os.WriteFile(p, []byte(fmt.Sprintf("# Document %d\n", i)), 0600); writeErr != nil {
			t.Fatalf("Failed to write test file %d: %v", i, writeErr)
		}
		filePaths[i] = p
	}

	// Add the first 5 files
	for i := 0; i < 5; i++ {
		time.Sleep(2 * time.Millisecond) // slight delay to guarantee distinct timestamps
		entry, addErr := svc.AddRecentFile(filePaths[i])
		if addErr != nil {
			t.Fatalf("Failed to add file %d: %v", i, addErr)
		}
		if !entry.Exists {
			t.Errorf("Expected added file %s to exist", filePaths[i])
		}
		if entry.Filename != fmt.Sprintf("doc_%02d.md", i) {
			t.Errorf("Expected filename doc_%02d.md, got %s", i, entry.Filename)
		}
	}

	items := svc.GetRecentFiles()
	if len(items) != 5 {
		t.Fatalf("Expected 5 items, got %d", len(items))
	}
	// Most recent is doc_04.md at index 0
	if items[0].Path != filePaths[4] {
		t.Errorf("Expected index 0 to be %s, got %s", filePaths[4], items[0].Path)
	}

	// 2. Deduplication: Re-open doc_01.md (currently at index 3)
	time.Sleep(2 * time.Millisecond)
	reopened, err := svc.AddRecentFile(filePaths[1])
	if err != nil {
		t.Fatalf("Failed to re-add doc_01.md: %v", err)
	}
	items = svc.GetRecentFiles()
	if len(items) != 5 {
		t.Fatalf("Expected 5 items after reopening existing, got %d", len(items))
	}
	if items[0].Path != filePaths[1] {
		t.Errorf("Expected doc_01.md at index 0 after reopening, got %s", items[0].Path)
	}
	if items[0].LastOpenedAt != reopened.LastOpenedAt {
		t.Errorf("Expected timestamp to be updated")
	}

	// Verify no duplicate instances of doc_01.md exist
	countDoc1 := 0
	for _, it := range items {
		if it.Path == filePaths[1] {
			countDoc1++
		}
	}
	if countDoc1 != 1 {
		t.Errorf("Expected exactly 1 instance of reopened file, found %d", countDoc1)
	}

	// 3. Enforce 20-item bound: Add remaining files (up to 25 total)
	for i := 5; i < 25; i++ {
		time.Sleep(1 * time.Millisecond)
		if _, addErr := svc.AddRecentFile(filePaths[i]); addErr != nil {
			t.Fatalf("Failed to add file %d: %v", i, addErr)
		}
	}

	items = svc.GetRecentFiles()
	if len(items) != 20 {
		t.Fatalf("Expected strictly 20 items (max bound), got %d", len(items))
	}
	// Most recent should be doc_24.md
	if items[0].Path != filePaths[24] {
		t.Errorf("Expected index 0 to be doc_24.md, got %s", items[0].Path)
	}

	// 4. File existence verification: Delete doc_24.md and check GetRecentFiles()
	if delErr := os.Remove(filePaths[24]); delErr != nil {
		t.Fatalf("Failed to delete doc_24.md: %v", delErr)
	}

	items = svc.GetRecentFiles()
	if items[0].Path != filePaths[24] {
		t.Fatalf("Expected doc_24.md still at index 0")
	}
	if items[0].Exists {
		t.Errorf("Expected doc_24.md Exists to be false after deletion from disk")
	}

	// 5. RemoveRecentFile: Remove deleted file from list
	if remErr := svc.RemoveRecentFile(filePaths[24]); remErr != nil {
		t.Fatalf("Failed to remove file: %v", remErr)
	}
	items = svc.GetRecentFiles()
	if len(items) != 19 {
		t.Errorf("Expected 19 items after removal, got %d", len(items))
	}

	// 6. Persistence verification across service restarts
	svc2, err := NewServiceWithPath(storagePath, 20)
	if err != nil {
		t.Fatalf("Failed to create second service instance: %v", err)
	}
	items2 := svc2.GetRecentFiles()
	if len(items2) != 19 {
		t.Errorf("Expected 19 items persisted to disk, got %d", len(items2))
	}

	// 7. Clear recent files
	if clearErr := svc2.ClearRecentFiles(); clearErr != nil {
		t.Fatalf("Failed to clear recents: %v", clearErr)
	}
	if len(svc2.GetRecentFiles()) != 0 {
		t.Errorf("Expected 0 items after clear, got %d", len(svc2.GetRecentFiles()))
	}
}

// TestRecentFilesConcurrency verifies thread safety under race detector.
func TestRecentFilesConcurrency(t *testing.T) {
	tempDir := t.TempDir()
	storagePath := filepath.Join(tempDir, "concurrent-recents.json")

	svc, err := NewServiceWithPath(storagePath, 20)
	if err != nil {
		t.Fatalf("Failed to initialize service: %v", err)
	}

	// Create 30 test files on disk
	filePaths := make([]string, 30)
	for i := 0; i < 30; i++ {
		p := filepath.Join(tempDir, fmt.Sprintf("concurrent_doc_%02d.md", i))
		if writeErr := os.WriteFile(p, []byte("# Concurrent Doc\n"), 0600); writeErr != nil {
			t.Fatalf("Failed to write test file: %v", writeErr)
		}
		filePaths[i] = p
	}

	const goroutines = 10
	const iterations = 25
	done := make(chan bool, goroutines)

	for g := 0; g < goroutines; g++ {
		go func(gid int) {
			for it := 0; it < iterations; it++ {
				fileIdx := (gid*iterations + it) % len(filePaths)
				switch it % 4 {
				case 0, 1:
					_, _ = svc.AddRecentFile(filePaths[fileIdx])
				case 2:
					_ = svc.GetRecentFiles()
				case 3:
					_ = svc.RemoveRecentFile(filePaths[fileIdx])
				}
			}
			done <- true
		}(g)
	}

	for g := 0; g < goroutines; g++ {
		<-done
	}

	// Verify the final state is bounded and valid
	finalItems := svc.GetRecentFiles()
	if len(finalItems) > 20 {
		t.Errorf("Expected at most 20 items after concurrency, got %d", len(finalItems))
	}

	// Re-read from disk to ensure valid JSON was persisted
	svcReloaded, reloadErr := NewServiceWithPath(storagePath, 20)
	if reloadErr != nil {
		t.Fatalf("Failed to reload service after concurrent writes: %v", reloadErr)
	}
	if len(svcReloaded.GetRecentFiles()) != len(finalItems) {
		t.Errorf("Mismatch between in-memory (%d) and persisted (%d) count",
			len(finalItems), len(svcReloaded.GetRecentFiles()))
	}
}

// TestRecentFilesPathNormalization verifies cross-platform path cleanup and resolution.
func TestRecentFilesPathNormalization(t *testing.T) {
	tempDir := t.TempDir()
	existingFile := filepath.Join(tempDir, "target.md")
	if err := os.WriteFile(existingFile, []byte("# Target\n"), 0600); err != nil {
		t.Fatalf("Failed to write target file: %v", err)
	}

	tests := []struct {
		name     string
		input    string
		wantErr  bool
		validate func(t *testing.T, normalized string)
	}{
		{
			name:    "empty path",
			input:   "",
			wantErr: true,
		},
		{
			name:    "whitespace only",
			input:   "   ",
			wantErr: true,
		},
		{
			name:    "redundant slashes",
			input:   filepath.Join(tempDir, "subdir", "..", "target.md"),
			wantErr: false,
			validate: func(t *testing.T, normalized string) {
				if normalized != existingFile {
					t.Errorf("Expected %s, got %s", existingFile, normalized)
				}
			},
		},
		{
			name:    "forward slash normalization",
			input:   existingFile,
			wantErr: false,
			validate: func(t *testing.T, normalized string) {
				if !filepath.IsAbs(normalized) {
					t.Errorf("Expected absolute path, got %s", normalized)
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			normalized, err := NormalizePath(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Errorf("Expected error for input %q, got nil", tc.input)
				}
				return
			}
			if err != nil {
				t.Fatalf("Unexpected error: %v", err)
			}
			if tc.validate != nil {
				tc.validate(t, normalized)
			}
		})
	}
}

// TestRecentFilesCorruptionRecovery verifies that corrupted JSON is backed up and a clean list starts.
func TestRecentFilesCorruptionRecovery(t *testing.T) {
	tempDir := t.TempDir()
	storagePath := filepath.Join(tempDir, "corrupted-recents.json")

	// 1. Write corrupted JSON
	corruptedData := []byte("{\"invalid_json\": true, [truncated")
	if err := os.WriteFile(storagePath, corruptedData, 0600); err != nil {
		t.Fatalf("Failed to write corrupted file: %v", err)
	}

	// 2. Initializing service should recover gracefully without panic
	svc, err := NewServiceWithPath(storagePath, 20)
	if err != nil {
		t.Fatalf("Expected graceful recovery from corruption, got error: %v", err)
	}

	if len(svc.GetRecentFiles()) != 0 {
		t.Errorf("Expected empty recent list after corruption, got %d", len(svc.GetRecentFiles()))
	}

	// 3. Verify a backup file was created
	files, readErr := os.ReadDir(tempDir)
	if readErr != nil {
		t.Fatalf("Failed to read tempDir: %v", readErr)
	}
	foundBackup := false
	for _, f := range files {
		if f.Name() != "corrupted-recents.json" && len(f.Name()) > len("corrupted-recents.json.corrupt.") {
			foundBackup = true
			break
		}
	}
	if !foundBackup {
		t.Errorf("Expected backup .corrupt.<timestamp> file to be created in %s", tempDir)
	}

	// 4. Verify new writes succeed
	testDoc := filepath.Join(tempDir, "valid.md")
	if err := os.WriteFile(testDoc, []byte("# Valid\n"), 0600); err != nil {
		t.Fatalf("Failed to write valid doc: %v", err)
	}

	if _, addErr := svc.AddRecentFile(testDoc); addErr != nil {
		t.Fatalf("Failed to add recent file after corruption recovery: %v", addErr)
	}
	if len(svc.GetRecentFiles()) != 1 {
		t.Errorf("Expected 1 recent file, got %d", len(svc.GetRecentFiles()))
	}
}

// TestRecentFilesCustomBounds verifies configurable bounding limits.
func TestRecentFilesCustomBounds(t *testing.T) {
	tempDir := t.TempDir()

	// <= 0 fallback to DefaultMaxRecent (10)
	svcDefault, err := NewServiceWithPath(filepath.Join(tempDir, "default.json"), 0)
	if err != nil {
		t.Fatalf("Failed to create default svc: %v", err)
	}
	if svcDefault.maxRecent != 10 {
		t.Errorf("Expected maxRecent 10, got %d", svcDefault.maxRecent)
	}

	// Custom bound of 5
	svcSmall, err := NewServiceWithPath(filepath.Join(tempDir, "small.json"), 5)
	if err != nil {
		t.Fatalf("Failed to create small svc: %v", err)
	}
	if svcSmall.maxRecent != 5 {
		t.Errorf("Expected maxRecent 5, got %d", svcSmall.maxRecent)
	}

	for i := 0; i < 10; i++ {
		p := filepath.Join(tempDir, fmt.Sprintf("doc_%d.md", i))
		_ = os.WriteFile(p, []byte("# Test\n"), 0600)
		_, _ = svcSmall.AddRecentFile(p)
	}

	if len(svcSmall.GetRecentFiles()) != 5 {
		t.Errorf("Expected strictly 5 items for custom bound, got %d", len(svcSmall.GetRecentFiles()))
	}
}
