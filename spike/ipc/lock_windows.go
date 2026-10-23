//go:build windows

package ipc

import (
	"errors"
)

// tryAcquireLock is a stub for Windows cross-compilation in Linux environments.
// Native Windows Named Mutex / Named Pipe implementation will be verified during Phase 6 host validation.
func tryAcquireLock(path string) (FileLock, error) {
	return nil, errors.New("windows native lock not implemented in Linux spike")
}
