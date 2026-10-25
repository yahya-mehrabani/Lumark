package watcher

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

func TestFileWatcher_ConcurrentStress(t *testing.T) {
	tmpDir := t.TempDir()
	numFiles := 10
	filePaths := make([]string, numFiles)

	for i := 0; i < numFiles; i++ {
		p := filepath.Join(tmpDir, fmt.Sprintf("doc_%d.md", i))
		if err := os.WriteFile(p, []byte(fmt.Sprintf("initial %d", i)), 0644); err != nil {
			t.Fatalf("failed to create doc_%d: %v", i, err)
		}
		filePaths[i] = p
	}

	w, err := NewService(WithDebounce(20 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer func() { _ = w.Close() }()

	var receivedEvents int32
	w.OnEvent(func(e FileChangeEvent) {
		_ = e.Path
	})

	var wg sync.WaitGroup
	workers := 8
	iterations := 15

	for worker := 0; worker < workers; worker++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for it := 0; it < iterations; it++ {
				target := filePaths[(workerID+it)%numFiles]

				// Alternate between watching, checking, modifying, and unwatching
				switch it % 3 {
				case 0:
					_ = w.WatchFile(target)
				case 1:
					_ = os.WriteFile(target, fmt.Appendf(nil, "worker %d iter %d", workerID, it), 0644)
				default:
					_ = w.IsWatching(target)
					_ = w.WatchedFiles()
					_ = w.UnwatchFile(target)
				}
				time.Sleep(2 * time.Millisecond)
			}
		}(worker)
	}

	wg.Wait()
	_ = receivedEvents
}

func TestFileWatcher_ConcurrentShutdownStress(t *testing.T) {
	tmpDir := t.TempDir()
	p := filepath.Join(tmpDir, "shutdown_stress.md")
	if err := os.WriteFile(p, []byte("start"), 0644); err != nil {
		t.Fatalf("failed to create file: %v", err)
	}

	w, err := NewService(WithDebounce(10 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}

	if err := w.WatchFile(p); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	var wg sync.WaitGroup
	workers := 4
	stopWriters := make(chan struct{})

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			counter := 0
			for {
				select {
				case <-stopWriters:
					return
				default:
					counter++
					_ = os.WriteFile(p, fmt.Appendf(nil, "burst %d-%d", id, counter), 0644)
					time.Sleep(1 * time.Millisecond)
				}
			}
		}(i)
	}

	// Allow writers to run briefly
	time.Sleep(30 * time.Millisecond)

	// Close service while writes are actively occurring
	if err := w.Close(); err != nil {
		t.Fatalf("expected clean close under write pressure, got: %v", err)
	}

	close(stopWriters)
	wg.Wait()

	// Verify service is closed
	if err := w.WatchFile(p); err != ErrServiceClosed {
		t.Fatalf("expected ErrServiceClosed after close, got: %v", err)
	}
}

func TestFileWatcher_RapidAtomicSaveCycle(t *testing.T) {
	tmpDir := t.TempDir()
	p := filepath.Join(tmpDir, "atomic_cycle.md")
	if err := os.WriteFile(p, []byte("start"), 0644); err != nil {
		t.Fatalf("failed to create file: %v", err)
	}

	events := make(chan FileChangeEvent, 20)
	w, err := NewService(WithDebounce(20 * time.Millisecond))
	if err != nil {
		t.Fatalf("failed to create watcher: %v", err)
	}
	defer func() { _ = w.Close() }()

	w.OnEvent(func(e FileChangeEvent) {
		events <- e
	})

	if err := w.WatchFile(p); err != nil {
		t.Fatalf("failed to watch: %v", err)
	}

	time.Sleep(20 * time.Millisecond)

	// Perform 3 sequential atomic saves (write to tmp -> rename over p)
	for i := 0; i < 3; i++ {
		tmp := filepath.Join(tmpDir, fmt.Sprintf("atomic_cycle.tmp.%d", i))
		if err := os.WriteFile(tmp, fmt.Appendf(nil, "content %d", i), 0644); err != nil {
			t.Fatalf("failed to write tmp %d: %v", i, err)
		}
		if err := os.Rename(tmp, p); err != nil {
			t.Fatalf("failed to rename %d: %v", i, err)
		}

		select {
		case ev := <-events:
			if ev.Type != EventModified {
				t.Errorf("iteration %d: expected EventModified, got %v", i, ev.Type)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("iteration %d: timed out waiting for event", i)
		}

		time.Sleep(40 * time.Millisecond)
	}
}
