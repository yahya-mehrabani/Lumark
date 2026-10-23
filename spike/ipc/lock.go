package ipc

import (
	"errors"
	"os"
)

// ErrAlreadyRunning is returned when another process already holds the single-instance lock.
var ErrAlreadyRunning = errors.New("another instance is already running")

// FileLock represents an OS advisory lock held by the primary instance.
type FileLock interface {
	// Unlock releases the lock and closes the underlying file handle.
	Unlock() error
	// File returns the underlying file pointer.
	File() *os.File
}
