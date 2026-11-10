//go:build windows

package instance

import (
	"fmt"
	"os"

	"golang.org/x/sys/windows"
)

type winLock struct {
	file   *os.File
	handle windows.Handle
}

// tryAcquireLock attempts to acquire an exclusive lock on Windows using CreateFile
// with shareMode=0 (no sharing allowed). If another instance holds the lock,
// Windows returns ERROR_SHARING_VIOLATION or ERROR_ACCESS_DENIED, mapped to ErrAlreadyRunning.
func tryAcquireLock(path string) (FileLock, error) {
	path16, err := windows.UTF16PtrFromString(path)
	if err != nil {
		return nil, fmt.Errorf("invalid lock path %s: %w", path, err)
	}

	handle, err := windows.CreateFile(
		path16,
		windows.GENERIC_READ|windows.GENERIC_WRITE,
		0, // exclusive access, no sharing
		nil,
		windows.OPEN_ALWAYS,
		windows.FILE_ATTRIBUTE_NORMAL,
		0,
	)
	if err != nil {
		if err == windows.ERROR_SHARING_VIOLATION || err == windows.ERROR_ACCESS_DENIED {
			return nil, ErrAlreadyRunning
		}
		return nil, fmt.Errorf("open lock file %s: %w", path, err)
	}

	file := os.NewFile(uintptr(handle), path)
	return &winLock{file: file, handle: handle}, nil
}

func (l *winLock) Unlock() error {
	if l.handle == 0 || l.handle == windows.InvalidHandle {
		return nil
	}
	h := l.handle
	l.handle = windows.InvalidHandle
	if l.file != nil {
		_ = l.file.Close()
		l.file = nil
	} else {
		_ = windows.CloseHandle(h)
	}
	return nil
}

func (l *winLock) File() *os.File {
	return l.file
}
