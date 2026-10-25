package watcher

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestWatcherDebounce_DefaultWindowIs300ms(t *testing.T) {
	w, err := NewService()
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	if w.GetDebounceDuration() != 300*time.Millisecond {
		t.Errorf("expected default debounce window of 300ms, got %v", w.GetDebounceDuration())
	}

	w.SetDebounceDuration(150 * time.Millisecond)
	if w.GetDebounceDuration() != 150*time.Millisecond {
		t.Errorf("expected updated debounce window of 150ms, got %v", w.GetDebounceDuration())
	}
}

func TestWatcherDebounce_RapidWritesCoalesce(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "debounce_rapid.md")
	if err := os.WriteFile(filePath, []byte("start"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	var eventCount int32
	events := make(chan FileChangeEvent, 20)

	// Use a 100ms debounce window for reliable test timing
	w, err := NewService(WithDebounce(100 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		atomic.AddInt32(&eventCount, 1)
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch file: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Perform 10 rapid writes within 60ms (every 6ms)
	for i := 0; i < 10; i++ {
		content := fmt.Sprintf("line %d\n", i)
		if err := os.WriteFile(filePath, []byte(content), 0644); err != nil {
			t.Fatalf("failed to write iteration %d: %v", i, err)
		}
		time.Sleep(6 * time.Millisecond)
	}

	// Expect exactly 1 event to fire after the 100ms debounce window completes
	select {
	case event := <-events:
		if event.Type != EventModified {
			t.Errorf("expected EventModified, got %v", event.Type)
		}
		if event.Path != filePath {
			t.Errorf("expected path %s, got %s", filePath, event.Path)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for debounced modification event")
	}

	// Wait an additional 250ms to ensure no trailing/duplicate events occur
	time.Sleep(250 * time.Millisecond)

	count := atomic.LoadInt32(&eventCount)
	if count != 1 {
		t.Errorf("expected exactly 1 coalesced event from 10 rapid writes, received %d", count)
	}
}

func TestWatcherDebounce_DistinctSavesSeparatedByWindow(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "debounce_distinct.md")
	if err := os.WriteFile(filePath, []byte("initial"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	var eventCount int32
	events := make(chan FileChangeEvent, 20)

	w, err := NewService(WithDebounce(50 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		atomic.AddInt32(&eventCount, 1)
		events <- e
	})

	if err := w.WatchFile(filePath); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// First save
	if err := os.WriteFile(filePath, []byte("save 1"), 0644); err != nil {
		t.Fatalf("failed to write 1: %v", err)
	}

	select {
	case <-events:
		// First event received
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for first event")
	}

	// Wait until debounce window has completely elapsed and settled
	time.Sleep(100 * time.Millisecond)

	// Second save well after the debounce window
	if err := os.WriteFile(filePath, []byte("save 2"), 0644); err != nil {
		t.Fatalf("failed to write 2: %v", err)
	}

	select {
	case <-events:
		// Second event received
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for second event")
	}

	time.Sleep(100 * time.Millisecond)

	count := atomic.LoadInt32(&eventCount)
	if count != 2 {
		t.Errorf("expected 2 distinct events separated by window, got %d", count)
	}
}

func TestWatcherDebounce_MultipleFilesIndependent(t *testing.T) {
	tmpDir := t.TempDir()
	fileA := filepath.Join(tmpDir, "docA.md")
	fileB := filepath.Join(tmpDir, "docB.md")

	if err := os.WriteFile(fileA, []byte("A"), 0644); err != nil {
		t.Fatalf("failed to write fileA: %v", err)
	}
	if err := os.WriteFile(fileB, []byte("B"), 0644); err != nil {
		t.Fatalf("failed to write fileB: %v", err)
	}

	events := make(chan FileChangeEvent, 20)
	w, err := NewService(WithDebounce(80 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher service: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(fileA); err != nil {
		t.Fatalf("failed to watch fileA: %v", err)
	}
	if err := w.WatchFile(fileB); err != nil {
		t.Fatalf("failed to watch fileB: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Concurrently write rapidly to fileA and fileB
	var wg sync.WaitGroup
	wg.Add(2)

	go func() {
		defer wg.Done()
		for i := 0; i < 5; i++ {
			_ = os.WriteFile(fileA, fmt.Appendf(nil, "A-%d", i), 0644)
			time.Sleep(5 * time.Millisecond)
		}
	}()

	go func() {
		defer wg.Done()
		for i := 0; i < 5; i++ {
			_ = os.WriteFile(fileB, fmt.Appendf(nil, "B-%d", i), 0644)
			time.Sleep(5 * time.Millisecond)
		}
	}()

	wg.Wait()

	// Expect exactly one event for fileA and one event for fileB
	receivedFiles := make(map[string]int)
	timeout := time.After(2 * time.Second)

	for len(receivedFiles) < 2 {
		select {
		case ev := <-events:
			receivedFiles[ev.Path]++
		case <-timeout:
			t.Fatalf("timed out waiting for events on both files; received: %v", receivedFiles)
		}
	}

	// Extra wait to verify no secondary coalescing leakage
	time.Sleep(150 * time.Millisecond)

	// Drain any additional events
drainLoop:
	for {
		select {
		case ev := <-events:
			receivedFiles[ev.Path]++
		default:
			break drainLoop
		}
	}

	if receivedFiles[fileA] != 1 {
		t.Errorf("expected 1 event for fileA, got %d", receivedFiles[fileA])
	}
	if receivedFiles[fileB] != 1 {
		t.Errorf("expected 1 event for fileB, got %d", receivedFiles[fileB])
	}
}

func TestWatcherDebounce_UnwatchCancelsPendingTimer(t *testing.T) {
	tmpDir := t.TempDir()
	filePath := filepath.Join(tmpDir, "cancel_debounce.md")
	if err := os.WriteFile(filePath, []byte("cancel"), 0644); err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}

	events := make(chan FileChangeEvent, 10)
	w, err := NewService(WithDebounce(100 * time.Millisecond))
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

	// Write to schedule a debounce timer
	if err := os.WriteFile(filePath, []byte("scheduled"), 0644); err != nil {
		t.Fatalf("failed to write: %v", err)
	}

	// Immediately unwatch before debounce timer (100ms) fires
	time.Sleep(10 * time.Millisecond)
	if err := w.UnwatchFile(filePath); err != nil {
		t.Fatalf("failed to unwatch: %v", err)
	}

	// Wait 200ms
	select {
	case ev := <-events:
		t.Fatalf("unexpected event received after unwatching cancelled timer: %v", ev)
	case <-time.After(200 * time.Millisecond):
		// Success: timer was cancelled
	}
}
