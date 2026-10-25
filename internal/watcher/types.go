package watcher

import (
	"time"
)

// EventType specifies the type of file system notification observed.
type EventType string

const (
	// EventModified indicates that the watched file content or attributes were modified.
	EventModified EventType = "modified"

	// EventDeleted indicates that the watched file was deleted or moved from its location.
	EventDeleted EventType = "deleted"

	// EventRenamed indicates that the watched file was renamed.
	EventRenamed EventType = "renamed"
)

// FileChangeEvent describes a disk modification or deletion event for a watched file.
type FileChangeEvent struct {
	Path      string    `json:"path"`
	Type      EventType `json:"type"`
	Timestamp time.Time `json:"timestamp"`
}

// EventHandler is a callback invoked when a file change event is emitted.
type EventHandler func(event FileChangeEvent)
