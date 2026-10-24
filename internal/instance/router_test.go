package instance

import (
	"context"
	"path/filepath"
	"testing"
	"time"
)

type mockWindowController struct {
	showCalled     int
	focusCalled    int
	restoreCalled  int
	isMinimisedVal bool
}

func (m *mockWindowController) Show() {
	m.showCalled++
}

func (m *mockWindowController) Focus() {
	m.focusCalled++
}

func (m *mockWindowController) Restore() {
	m.restoreCalled++
	m.isMinimisedVal = false
}

func (m *mockWindowController) IsMinimised() bool {
	return m.isMinimisedVal
}

type mockEventDispatcher struct {
	emittedEvents map[string][]any
}

func newMockEventDispatcher() *mockEventDispatcher {
	return &mockEventDispatcher{
		emittedEvents: make(map[string][]any),
	}
}

func (m *mockEventDispatcher) Emit(eventName string, data ...any) {
	var payload any
	if len(data) > 0 {
		payload = data[0]
	}
	m.emittedEvents[eventName] = append(m.emittedEvents[eventName], payload)
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
		emitted := dispatcher.emittedEvents[DefaultOpenDocumentEvent]
		if len(emitted) != 1 {
			t.Fatalf("expected 1 event, got %d", len(emitted))
		}
		if emitted[0] != expectedPath {
			t.Errorf("expected payload %q, got %v", expectedPath, emitted[0])
		}

		// Verify window Show and Focus were invoked
		if win.showCalled != 1 {
			t.Errorf("expected Show() called 1 time, got %d", win.showCalled)
		}
		if win.focusCalled != 1 {
			t.Errorf("expected Focus() called 1 time, got %d", win.focusCalled)
		}
		if win.restoreCalled != 0 {
			t.Errorf("expected Restore() called 0 times, got %d", win.restoreCalled)
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

		emitted := dispatcher.emittedEvents[DefaultOpenDocumentEvent]
		if len(emitted) != 3 {
			t.Fatalf("expected 3 emitted events, got %d", len(emitted))
		}

		for i, expected := range paths {
			if emitted[i] != expected {
				t.Errorf("emitted[%d] = %v, want %s", i, emitted[i], expected)
			}
		}

		if win.showCalled != 1 || win.focusCalled != 1 {
			t.Errorf("expected Show and Focus called once, got show=%d, focus=%d", win.showCalled, win.focusCalled)
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

		if win.restoreCalled != 1 {
			t.Errorf("expected Restore() called 1 time for minimised window, got %d", win.restoreCalled)
		}
		if win.showCalled != 1 {
			t.Errorf("expected Show() called 1 time, got %d", win.showCalled)
		}
		if win.focusCalled != 1 {
			t.Errorf("expected Focus() called 1 time, got %d", win.focusCalled)
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
		emitted := dispatcher.emittedEvents[DefaultOpenDocumentEvent]
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

		if len(dispatcher.emittedEvents[customEvent]) != 1 {
			t.Errorf("expected 1 event under %q, got %d", customEvent, len(dispatcher.emittedEvents[customEvent]))
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
			if len(dispatcher.emittedEvents[DefaultOpenDocumentEvent]) > 0 {
				payload := dispatcher.emittedEvents[DefaultOpenDocumentEvent][0]
				if payload == expectedPath {
					success = true
					break
				}
			}
			time.Sleep(20 * time.Millisecond)
		}

		if !success {
			t.Fatalf("timed out waiting for event emission of %q; received: %v", expectedPath, dispatcher.emittedEvents)
		}

		if win.showCalled < 1 || win.focusCalled < 1 {
			t.Errorf("expected window Show and Focus called, got show=%d, focus=%d", win.showCalled, win.focusCalled)
		}
	})
}
