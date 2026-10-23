package ipc

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

// EnvGetter abstracts environment variable lookup for testability.
type EnvGetter interface {
	Getenv(key string) string
}

type osEnv struct{}

func (osEnv) Getenv(key string) string {
	return os.Getenv(key)
}

// ResolveSocketDir resolves the directory for IPC socket and lock files based on current environment.
func ResolveSocketDir() (string, error) {
	home, _ := os.UserHomeDir()
	return ResolveDir(osEnv{}, home, os.TempDir(), os.Getuid())
}

// ResolveDir resolves the candidate runtime directory using standard Linux XDG hierarchy and fallbacks:
// 1. $XDG_RUNTIME_DIR (recommended for POSIX user sessions, typically /run/user/<uid>)
// 2. ~/.cache/markdown-viewer (fallback if XDG_RUNTIME_DIR is unavailable)
// 3. <tempDir>/markdown-viewer-<uid> (secure fallback in temp directory with 0700 permissions)
// 4. <tempDir> (last resort if subdirectories cannot be created)
func ResolveDir(env EnvGetter, userHome string, tempDir string, uid int) (string, error) {
	// 1. Check XDG_RUNTIME_DIR
	if xdg := env.Getenv("XDG_RUNTIME_DIR"); xdg != "" {
		if info, err := os.Stat(xdg); err == nil && info.IsDir() {
			return xdg, nil
		}
	}

	// 2. Check ~/.cache/markdown-viewer
	if userHome != "" {
		cacheDir := filepath.Join(userHome, ".cache", "markdown-viewer")
		if err := os.MkdirAll(cacheDir, 0700); err == nil {
			return cacheDir, nil
		}
	}

	// 3. Check tempDir/markdown-viewer-<uid>
	if tempDir != "" {
		uidDir := filepath.Join(tempDir, fmt.Sprintf("markdown-viewer-%d", uid))
		if err := os.MkdirAll(uidDir, 0700); err == nil {
			return uidDir, nil
		}
		// 4. Return tempDir itself if directory creation failed but tempDir is available
		if info, err := os.Stat(tempDir); err == nil && info.IsDir() {
			return tempDir, nil
		}
	}

	return "", errors.New("failed to resolve a valid runtime directory for IPC")
}
