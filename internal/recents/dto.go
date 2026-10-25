package recents

import (
	"path/filepath"
	"strings"
)

// DefaultMaxRecent defines the default limit of 20 items per PRD Section 10.1 and FR-OPEN-006.
const DefaultMaxRecent = 20

// RecentFileDTO represents a recently opened document path with metadata.
// In strict accordance with FR-SET-003 and FR-OPEN-006 (Data Minimization),
// it stores only normalized paths and timestamps, never document contents or extracted text.
type RecentFileDTO struct {
	Path         string `json:"path"`
	LastOpenedAt string `json:"lastOpenedAt"`
	Filename     string `json:"filename,omitempty"`
	Exists       bool   `json:"exists"`
}

// NormalizePath cleans and resolves the absolute path for consistent deduplication across platforms.
func NormalizePath(path string) (string, error) {
	trimmed := strings.TrimSpace(path)
	if trimmed == "" {
		return "", filepath.ErrBadPattern
	}
	cleaned := filepath.Clean(trimmed)
	absPath, err := filepath.Abs(cleaned)
	if err != nil {
		return cleaned, err
	}
	return absPath, nil
}
