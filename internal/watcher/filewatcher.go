package watcher

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
)

// DefaultDebounceDuration is the default coalescing window for rapid write events.
const DefaultDebounceDuration = 300 * time.Millisecond

// ErrServiceClosed is returned when an operation is attempted on a closed watcher service.
var ErrServiceClosed = errors.New("file watcher service is closed")

// Service monitors individual files on disk using fsnotify and emits coalesced change notifications.
type Service struct {
	mu           sync.RWMutex
	watcher      *fsnotify.Watcher
	watched      map[string]struct{}
	debounceTime time.Duration
	timers       map[string]*time.Timer
	handlers     []EventHandler
	done         chan struct{}
	closed       bool
	wg           sync.WaitGroup
}

// Option configures Service settings.
type Option func(*Service)

// WithDebounce sets a custom debounce duration for coalescing file modification events.
func WithDebounce(d time.Duration) Option {
	return func(s *Service) {
		s.debounceTime = d
	}
}

// NewService constructs a new file watcher Service with default options.
func NewService(opts ...Option) (*Service, error) {
	fsWatcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, fmt.Errorf("failed to create fsnotify watcher: %w", err)
	}

	s := &Service{
		watcher:      fsWatcher,
		watched:      make(map[string]struct{}),
		debounceTime: DefaultDebounceDuration,
		timers:       make(map[string]*time.Timer),
		handlers:     make([]EventHandler, 0),
		done:         make(chan struct{}),
	}

	for _, opt := range opts {
		opt(s)
	}

	s.wg.Add(1)
	go s.eventLoop()

	return s, nil
}

// OnEvent registers an event listener callback for file change events.
func (s *Service) OnEvent(handler EventHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.handlers = append(s.handlers, handler)
}

// WatchFile adds the specified file path to the active OS file watcher list.
// The file path is cleaned and converted to an absolute path.
func (s *Service) WatchFile(path string) error {
	absPath, err := s.cleanPath(path)
	if err != nil {
		return err
	}

	// Verify the file exists on disk
	if _, err := os.Stat(absPath); err != nil {
		return fmt.Errorf("cannot watch file %s: %w", absPath, err)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return ErrServiceClosed
	}

	if _, exists := s.watched[absPath]; exists {
		return nil // already watched
	}

	if err := s.watcher.Add(absPath); err != nil {
		return fmt.Errorf("failed to register file watch for %s: %w", absPath, err)
	}

	s.watched[absPath] = struct{}{}
	return nil
}

// UnwatchFile removes the specified file path from the active OS file watcher list.
func (s *Service) UnwatchFile(path string) error {
	absPath, err := s.cleanPath(path)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return ErrServiceClosed
	}

	delete(s.watched, absPath)
	if timer, ok := s.timers[absPath]; ok {
		timer.Stop()
		delete(s.timers, absPath)
	}

	// Ignore errors removing watch handle (e.g. if file was already removed by OS)
	_ = s.watcher.Remove(absPath)
	return nil
}

// IsWatching reports whether the given file path is currently actively watched.
func (s *Service) IsWatching(path string) bool {
	absPath, err := s.cleanPath(path)
	if err != nil {
		return false
	}

	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.watched[absPath]
	return exists
}

// WatchedFiles returns a copy of all currently watched canonical file paths.
func (s *Service) WatchedFiles() []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]string, 0, len(s.watched))
	for p := range s.watched {
		result = append(result, p)
	}
	return result
}

// GetDebounceDuration returns the current debounce window.
func (s *Service) GetDebounceDuration() time.Duration {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.debounceTime
}

// SetDebounceDuration sets the active debounce duration window.
func (s *Service) SetDebounceDuration(d time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.debounceTime = d
}

// Close terminates the watcher loop, stops all pending debounce timers, and cleans up OS handles.
func (s *Service) Close() error {
	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		return nil
	}
	s.closed = true
	close(s.done)

	for p, timer := range s.timers {
		timer.Stop()
		delete(s.timers, p)
	}
	s.mu.Unlock()

	err := s.watcher.Close()
	s.wg.Wait()
	return err
}

func (s *Service) cleanPath(path string) (string, error) {
	if path == "" {
		return "", errors.New("file path cannot be empty")
	}
	clean := filepath.Clean(path)
	abs, err := filepath.Abs(clean)
	if err != nil {
		return clean, nil
	}
	return abs, nil
}

func (s *Service) eventLoop() {
	defer s.wg.Done()

	for {
		select {
		case <-s.done:
			return
		case err, ok := <-s.watcher.Errors:
			if !ok {
				return
			}
			log.Printf("[Watcher] System error: %v", err)
		case event, ok := <-s.watcher.Events:
			if !ok {
				return
			}
			s.handleFsEvent(event)
		}
	}
}

func (s *Service) handleFsEvent(event fsnotify.Event) {
	cleanPath, err := s.cleanPath(event.Name)
	if err != nil {
		return
	}

	s.mu.RLock()
	_, isWatched := s.watched[cleanPath]
	closed := s.closed
	s.mu.RUnlock()

	if closed || !isWatched {
		return
	}

	if event.Has(fsnotify.Remove) || event.Has(fsnotify.Rename) {
		s.mu.Lock()
		if t, ok := s.timers[cleanPath]; ok {
			t.Stop()
			delete(s.timers, cleanPath)
		}
		s.mu.Unlock()

		// Atomic save or file deletion: inspect disk in background
		go s.handleAtomicSaveOrDeletion(cleanPath)
	} else if event.Has(fsnotify.Write) || event.Has(fsnotify.Create) || event.Has(fsnotify.Chmod) {
		s.scheduleEvent(cleanPath, EventModified)
	}
}

func (s *Service) handleAtomicSaveOrDeletion(path string) {
	// Check immediately if the file already exists (e.g. atomic rename)
	if _, err := os.Stat(path); err == nil {
		s.mu.Lock()
		if !s.closed && s.isPathWatched(path) {
			_ = s.watcher.Remove(path)
			_ = s.watcher.Add(path)
		}
		s.mu.Unlock()

		s.scheduleEvent(path, EventModified)
		return
	}

	// For slower multi-step atomic saves (temp write -> delete -> move), retry briefly
	retries := 2
	for i := 0; i < retries; i++ {
		time.Sleep(30 * time.Millisecond)

		s.mu.RLock()
		closed := s.closed
		_, stillWatched := s.watched[path]
		s.mu.RUnlock()

		if closed || !stillWatched {
			return
		}

		if _, err := os.Stat(path); err == nil {
			// File recreated! Re-attach watch handle
			s.mu.Lock()
			if !s.closed && s.isPathWatched(path) {
				_ = s.watcher.Remove(path)
				_ = s.watcher.Add(path)
			}
			s.mu.Unlock()

			s.scheduleEvent(path, EventModified)
			return
		}
	}

	// File is genuinely deleted or moved away
	s.scheduleEvent(path, EventDeleted)
}

func (s *Service) isPathWatched(path string) bool {
	_, ok := s.watched[path]
	return ok
}

func (s *Service) scheduleEvent(path string, eventType EventType) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.closed {
		return
	}

	if _, ok := s.watched[path]; !ok {
		return
	}

	// Deletion events trigger immediately without waiting for write debounce
	if eventType == EventDeleted {
		if timer, exists := s.timers[path]; exists {
			timer.Stop()
			delete(s.timers, path)
		}
		s.emitEventLocked(FileChangeEvent{
			Path:      path,
			Type:      EventDeleted,
			Timestamp: time.Now(),
		})
		return
	}

	// If debounce duration is zero, emit immediately
	if s.debounceTime <= 0 {
		if _, err := os.Stat(path); err == nil {
			s.emitEventLocked(FileChangeEvent{
				Path:      path,
				Type:      eventType,
				Timestamp: time.Now(),
			})
		}
		return
	}

	// Coalesce rapid modification events
	if existingTimer, exists := s.timers[path]; exists {
		existingTimer.Stop()
	}

	s.timers[path] = time.AfterFunc(s.debounceTime, func() {
		s.mu.Lock()
		defer s.mu.Unlock()

		delete(s.timers, path)
		if s.closed || !s.isPathWatched(path) {
			return
		}

		// Ensure file still exists before emitting modification event
		if _, err := os.Stat(path); err != nil {
			return
		}

		s.emitEventLocked(FileChangeEvent{
			Path:      path,
			Type:      eventType,
			Timestamp: time.Now(),
		})
	})
}

func (s *Service) emitEventLocked(event FileChangeEvent) {
	handlers := make([]EventHandler, len(s.handlers))
	copy(handlers, s.handlers)

	// Invoke handlers asynchronously to prevent blocking the watcher lock/event loop
	go func() {
		for _, h := range handlers {
			if h != nil {
				h(event)
			}
		}
	}()
}
