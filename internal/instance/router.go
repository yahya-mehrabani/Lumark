package instance

import (
	"fmt"
	"sync"
)

// DefaultOpenDocumentEvent is the canonical event name emitted when opening a document.
const DefaultOpenDocumentEvent = "wails:open-document"

// WindowController abstracts native window visibility, restoration, and focus operations.
type WindowController interface {
	Show()
	Focus()
	Restore()
	IsMinimised() bool
}

// EventDispatcher abstracts event emission to frontend subscribers.
type EventDispatcher interface {
	Emit(eventName string, data ...any)
}

// RouterOptions configures DocumentRouter behavior.
type RouterOptions struct {
	EventName string
}

// DocumentRouter routes incoming document paths from CLI or IPC secondary instances,
// bringing the native window to the foreground and emitting document open events.
type DocumentRouter struct {
	window    WindowController
	events    EventDispatcher
	eventName string
	mu        sync.Mutex
}

// NewDocumentRouter creates a new DocumentRouter with the provided window and event dispatcher.
func NewDocumentRouter(window WindowController, events EventDispatcher, opts ...RouterOptions) *DocumentRouter {
	eventName := DefaultOpenDocumentEvent
	if len(opts) > 0 && opts[0].EventName != "" {
		eventName = opts[0].EventName
	}
	return &DocumentRouter{
		window:    window,
		events:    events,
		eventName: eventName,
	}
}

// RouteFiles normalizes and dispatches a list of file paths, then activates the window.
// Returns the list of canonical paths dispatched.
func (r *DocumentRouter) RouteFiles(baseDir string, rawPaths []string) ([]string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	parsed, err := ParseCLI(baseDir, rawPaths)
	if err != nil {
		return nil, fmt.Errorf("parse file paths: %w", err)
	}

	dispatched := make([]string, 0, len(parsed.Files))
	for _, file := range parsed.Files {
		if r.events != nil {
			r.events.Emit(r.eventName, file)
		}
		dispatched = append(dispatched, file)
	}

	r.activateWindow()

	return dispatched, nil
}

// RouteMessage handles an incoming IPC Message from a secondary instance.
func (r *DocumentRouter) RouteMessage(msg Message) ([]string, error) {
	workingDir := msg.WorkingDir
	if workingDir == "" {
		workingDir = "."
	}
	return r.RouteFiles(workingDir, msg.Args)
}

// activateWindow brings the native desktop window forward and requests user focus.
func (r *DocumentRouter) activateWindow() {
	if r.window == nil {
		return
	}
	if r.window.IsMinimised() {
		r.window.Restore()
	}
	r.window.Show()
	r.window.Focus()
}

// SetWindow updates the active window controller (e.g. after window creation in Wails).
func (r *DocumentRouter) SetWindow(window WindowController) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.window = window
}

// SetEventDispatcher updates the event dispatcher.
func (r *DocumentRouter) SetEventDispatcher(events EventDispatcher) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.events = events
}

// EventName returns the configured event name for document opening.
func (r *DocumentRouter) EventName() string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.eventName
}
