//go:build unix || linux || darwin

package ipc

import (
	"errors"
	"fmt"
	"os"
	"syscall"
)

type unixLock struct {
	file *os.File
}

// tryAcquireLock attempts to acquire a non-blocking exclusive POSIX advisory lock (flock).
// If another instance already holds the lock, ErrAlreadyRunning is returned.
func tryAcquireLock(path string) (FileLock, error) {
	file, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0600)
	if err != nil {
		return nil, fmt.Errorf("open lock file %s: %w", path, err)
	}

	err = syscall.Flock(int(file.Fd()), syscall.LOCK_EX|syscall.LOCK_NB)
	if err != nil {
		_ = file.Close()
		if errors.Is(err, syscall.EWOULDBLOCK) || errors.Is(err, syscall.EAGAIN) {
			return nil, ErrAlreadyRunning
		}
		return nil, fmt.Errorf("flock on %s: %w", path, err)
	}

	return &unixLock{file: file}, nil
}

func (l *unixLock) Unlock() error {
	if l.file == nil {
		return nil
	}
	file := l.file
	l.file = nil

	unlockErr := syscall.Flock(int(file.Fd()), syscall.LOCK_UN)
	closeErr := file.Close()
	if unlockErr != nil {
		return fmt.Errorf("unlock file: %w", unlockErr)
	}
	if closeErr != nil {
		return fmt.Errorf("close lock file: %w", closeErr)
	}
	return nil
}

func (l *unixLock) File() *os.File {
	return l.file
}
