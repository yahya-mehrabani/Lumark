package instance

import (
	"context"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

type mockWindowController struct {
	mu             sync.Mutex
	showCalled     int
	focusCalled    int
	restoreCalled  int
	isMinimisedVal bool
}

func (m *mockWindowController) Show() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.showCalled++
}

func (m *mockWindowController) Focus() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.focusCalled++
}

func (m *mockWindowController) Restore() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.restoreCalled++
	m.isMinimisedVal = false
}

func (m *mockWindowController) IsMinimised() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.isMinimisedVal
}

func (m *mockWindowController) Counts() (show, focus, restore int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.showCalled, m.focusCalled, m.restoreCalled
}

type mockEventDispatcher struct {
	mu            sync.Mutex
	emittedEvents map[string][]any
}

func newMockEventDispatcher() *mockEventDispatcher {
	return &mockEventDispatcher{
		emittedEvents: make(map[string][]any),
	}
}

func (m *mockEventDispatcher) Emit(eventName string, data ...any) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var payload any
	if len(data) > 0 {
		payload = data[0]
	}
	m.emittedEvents[eventName] = append(m.emittedEvents[eventName], payload)
}

func (m *mockEventDispatcher) Events(eventName string) []any {
	m.mu.Lock()
	defer m.mu.Unlock()
	list := m.emittedEvents[eventName]
	copied := make([]any, len(list))
	copy(copied, list)
	return copied
}

func TestWindowEventDispatch(t *testing.T) {
	tempDir := t.TempDir()

	t.Run("SingleDocumentDispatch", func(t *testing.T) {
		win := &mockWindowController{}
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(win, dispatcher)

		paths, err := router.RouteFiles(tempDir, []string{"document.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		expectedPath := filepath.Join(tempDir, "document.md")
		if len(paths) != 1 || paths[0] != expectedPath {
			t.Errorf("expected paths [%s], got %v", expectedPath, paths)
		}

		// Verify event was emitted
		emitted := dispatcher.Events(DefaultOpenDocumentEvent)
		if len(emitted) != 1 {
			t.Fatalf("expected 1 event, got %d", len(emitted))
		}
		if emitted[0] != expectedPath {
			t.Errorf("expected payload %q, got %v", expectedPath, emitted[0])
		}

		// Verify window Show and Focus were invoked
		show, focus, restore := win.Counts()
		if show != 1 {
			t.Errorf("expected Show() called 1 time, got %d", show)
		}
		if focus != 1 {
			t.Errorf("expected Focus() called 1 time, got %d", focus)
		}
		if restore != 0 {
			t.Errorf("expected Restore() called 0 times, got %d", restore)
		}
	})

	t.Run("MultipleDocumentsDispatch", func(t *testing.T) {
		win := &mockWindowController{}
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(win, dispatcher)

		files := []string{"doc1.md", "doc2.markdown", "notes/doc3.mdown"}
		paths, err := router.RouteFiles(tempDir, files)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(paths) != 3 {
			t.Fatalf("expected 3 paths, got %d", len(paths))
		}

		emitted := dispatcher.Events(DefaultOpenDocumentEvent)
		if len(emitted) != 3 {
			t.Fatalf("expected 3 emitted events, got %d", len(emitted))
		}

		for i, expected := range paths {
			if emitted[i] != expected {
				t.Errorf("emitted[%d] = %v, want %s", i, emitted[i], expected)
			}
		}

		show, focus, _ := win.Counts()
		if show != 1 || focus != 1 {
			t.Errorf("expected Show and Focus called once, got show=%d, focus=%d", show, focus)
		}
	})

	t.Run("MinimisedWindowRestoration", func(t *testing.T) {
		win := &mockWindowController{isMinimisedVal: true}
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(win, dispatcher)

		_, err := router.RouteFiles(tempDir, []string{"test.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		show, focus, restore := win.Counts()
		if restore != 1 {
			t.Errorf("expected Restore() called 1 time for minimised window, got %d", restore)
		}
		if show != 1 {
			t.Errorf("expected Show() called 1 time, got %d", show)
		}
		if focus != 1 {
			t.Errorf("expected Focus() called 1 time, got %d", focus)
		}
	})

	t.Run("NilWindowSafe", func(t *testing.T) {
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(nil, dispatcher)

		paths, err := router.RouteFiles(tempDir, []string{"safe.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(paths) != 1 {
			t.Errorf("expected 1 path, got %d", len(paths))
		}
		emitted := dispatcher.Events(DefaultOpenDocumentEvent)
		if len(emitted) != 1 {
			t.Errorf("expected 1 event emitted, got %d", len(emitted))
		}
	})

	t.Run("CustomEventName", func(t *testing.T) {
		customEvent := "custom:open-document"
		win := &mockWindowController{}
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(win, dispatcher, RouterOptions{EventName: customEvent})

		if router.EventName() != customEvent {
			t.Errorf("expected EventName %q, got %q", customEvent, router.EventName())
		}

		_, err := router.RouteFiles(tempDir, []string{"doc.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(dispatcher.Events(customEvent)) != 1 {
			t.Errorf("expected 1 event under %q, got %d", customEvent, len(dispatcher.Events(customEvent)))
		}
	})

	t.Run("CoordinatorIntegration", func(t *testing.T) {
		opts := Options{
			AppID: "test-window-dispatch-coord",
			Dir:   tempDir,
		}

		primary, err := New(opts)
		if err != nil {
			t.Fatalf("primary New() failed: %v", err)
		}
		defer func() { _ = primary.Close() }()

		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		pRole, err := primary.Start(ctx)
		if err != nil || pRole != RolePrimary {
			t.Fatalf("primary start failed: %v (role: %v)", err, pRole)
		}

		win := &mockWindowController{}
		dispatcher := newMockEventDispatcher()
		router := NewDocumentRouter(win, dispatcher)

		// Goroutine listening to coordinator messages and routing them
		stopChan := make(chan struct{})
		go func() {
			for {
				select {
				case <-stopChan:
					return
				case msg, ok := <-primary.Messages():
					if !ok {
						return
					}
					_, _ = router.RouteMessage(msg)
				}
			}
		}()
		defer close(stopChan)

		// Secondary connects and sends message
		secondary, err := New(opts)
		if err != nil {
			t.Fatalf("secondary New() failed: %v", err)
		}
		defer func() { _ = secondary.Close() }()

		sRole, err := secondary.Start(ctx)
		if err != nil || sRole != RoleSecondary {
			t.Fatalf("secondary start failed: %v (role: %v)", err, sRole)
		}

		sendMsg := Message{
			Args:       []string{"forwarded_doc.md"},
			WorkingDir: tempDir,
		}

		if err := secondary.Send(ctx, sendMsg); err != nil {
			t.Fatalf("secondary Send() failed: %v", err)
		}

		// Wait for event emission on primary
		expectedPath := filepath.Join(tempDir, "forwarded_doc.md")
		success := false
		for start := time.Now(); time.Since(start) < 2*time.Second; {
			events := dispatcher.Events(DefaultOpenDocumentEvent)
			if len(events) > 0 {
				payload := events[0]
				if payload == expectedPath {
					success = true
					break
				}
			}
			time.Sleep(20 * time.Millisecond)
		}

		if !success {
			t.Fatalf("timed out waiting for event emission of %q; received: %v", expectedPath, dispatcher.Events(DefaultOpenDocumentEvent))
		}

		show, focus, _ := win.Counts()
		if show < 1 || focus < 1 {
			t.Errorf("expected window Show and Focus called, got show=%d, focus=%d", show, focus)
		}
	})
}
