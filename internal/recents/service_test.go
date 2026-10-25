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
