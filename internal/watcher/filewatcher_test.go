package watcher

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestFileWatcher_WatchAndUnwatch(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "test.md")
	if err := os.WriteFile(filePath, []byte("# Initial"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	w, err := NewService(WithDebounce(10 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("expected WatchFile to succeed, got %v", err)
	}

	if !w.IsWatching(filePath) {
		t.Fatalf("expected IsWatching to be true for %s", filePath)
	}

	watched := w.WatchedFiles()
	if len(watched) != 1 {
		t.Fatalf("expected 1 watched file, got %d", len(watched))
	}

	// Idempotent re-watch
	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("expected redundant WatchFile to succeed, got %v", err)
	}
	if len(w.WatchedFiles()) != 1 {
		t.Fatalf("expected still 1 watched file, got %d", len(w.WatchedFiles()))
	}

	// Unwatch
	if err := w.UnwatchFile(filePath); err != nil {
		t.Fatalf("expected UnwatchFile to succeed, got %v", err)
	}

	if w.IsWatching(filePath) {
		t.Fatalf("expected IsWatching to be false after unwatch")
	}

	if len(w.WatchedFiles()) != 0 {
		t.Fatalf("expected 0 watched files after unwatch, got %d", len(w.WatchedFiles()))
	}
}

func TestFileWatcher_ModifyDetection(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "doc.md")
	if err := os.WriteFile(filePath, []byte("# Heading"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	events := make(chan FileChangeEvent, 10)
	w, err := NewService(WithDebounce(20 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch file: %v", err)
	}

	// Wait briefly for watcher to stabilize
	time.Sleep(20 * time.Millisecond)

	// Modify file
	if err := os.WriteFile(filePath, []byte("# Heading\n\nNew paragraph"), 0644); err != nil {
		t.Fatalf("failed to modify file: %v", err)
	}

	select {
	case event := <-events:
		if event.Type != EventModified {
			t.Errorf("expected EventModified, got %v", event.Type)
		}
		if event.Path != filePath {
			t.Errorf("expected path %s, got %s", filePath, event.Path)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for modification event")
	}
}

func TestFileWatcher_NonexistentAndInvalidFile(t *testing.T) {
	w, err := NewService()
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	if err := w.WatchFile(""); err == nil {
		t.Fatal("expected error for empty file path")
	}

	if err := w.WatchFile("/path/does/not/exist/surely.md"); err == nil {
		t.Fatal("expected error for nonexistent file path")
	}
}

func TestFileWatcher_UnwatchStopsNotifications(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "unwatch.md")
	if err := os.WriteFile(filePath, []byte("start"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	events := make(chan FileChangeEvent, 10)
	w, err := NewService(WithDebounce(10 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch file: %v", err)
	}

	if err := w.UnwatchFile(filePath); err != nil {
		t.Fatalf("failed to unwatch file: %v", err)
	}

	// Modify file after unwatch
	if err := os.WriteFile(filePath, []byte("changed after unwatch"), 0644); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	select {
	case ev := <-events:
		t.Fatalf("unexpected event received after unwatch: %v", ev)
	case <-time.After(150 * time.Millisecond):
		// Expected: no event received
	}
}

func TestFileWatcher_Close(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "close.md")
	if err := os.WriteFile(filePath, []byte("close test"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	w, err := NewService()
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	if err := w.Close(); err != nil {
		t.Fatalf("failed to close watcher: %v", err)
	}

	// Subsequent operations should return ErrServiceClosed
	if err := w.WatchFile(filePath); err != ErrServiceClosed {
		t.Fatalf("expected ErrServiceClosed, got %v", err)
	}

	if err := w.UnwatchFile(filePath); err != ErrServiceClosed {
		t.Fatalf("expected ErrServiceClosed, got %v", err)
	}

	// Redundant close should be safe
	if err := w.Close(); err != nil {
		t.Fatalf("expected redundant close to succeed, got %v", err)
	}
}

func TestFileWatcher_AtomicSaveRecreation(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "atomic.md")
	if err := os.WriteFile(filePath, []byte("original content"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	events := make(chan FileChangeEvent, 10)
	w, err := NewService(WithDebounce(20 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Simulate atomic write: create temp file and rename over original
	tmpFile := filepath.Join(tmpDir, "atomic.md.tmp")
	if err := os.WriteFile(tmpFile, []byte("new atomic content"), 0644); err != nil {
		t.Fatalf("failed to write temp file: %v", err)
	}
	if err := os.Rename(tmpFile, filePath); err != nil {
		t.Fatalf("failed to rename temp file: %v", err)
	}

	select {
	case event := <-events:
		if event.Type != EventModified {
			t.Errorf("expected EventModified for atomic save, got %v", event.Type)
		}
		if event.Path != filePath {
			t.Errorf("expected path %s, got %s", filePath, event.Path)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for atomic save modification event")
	}

	// Verify that the watcher re-attached and still detects subsequent writes
	time.Sleep(50 * time.Millisecond)
	if err := os.WriteFile(filePath, []byte("second write after atomic save"), 0644); err != nil {
		t.Fatalf("failed to write to file: %v", err)
	}

	select {
	case event := <-events:
		if event.Type != EventModified {
			t.Errorf("expected EventModified for subsequent write, got %v", event.Type)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for subsequent write event after atomic save")
	}
}

func TestFileWatcher_Deletion(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "delete.md")
	if err := os.WriteFile(filePath, []byte("will be deleted"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	events := make(chan FileChangeEvent, 10)
	w, err := NewService(WithDebounce(20 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Remove the file
	if err := os.Remove(filePath); err != nil {
		t.Fatalf("failed to remove file: %v", err)
	}

	select {
	case event := <-events:
		if event.Type != EventDeleted {
			t.Errorf("expected EventDeleted, got %v", event.Type)
		}
		if event.Path != filePath {
			t.Errorf("expected path %s, got %s", filePath, event.Path)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for deletion event")
	}
}
