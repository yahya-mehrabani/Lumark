package recents

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// DefaultRecentFilesPath resolves the OS user configuration directory path:
// - Linux/Unix: ~/.config/markdown-viewer/recent-files.json
// - Windows: %APPDATA%\markdown-viewer\recent-files.json
// - macOS: ~/Library/Application Support/markdown-viewer/recent-files.json
func DefaultRecentFilesPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("unable to determine user config directory: %w", err)
	}
	return filepath.Join(configDir, "markdown-viewer", "recent-files.json"), nil
}

// Service manages bounded recent files tracking, deduplication, existence verification,
// and atomic persistence to disk.
type Service struct {
	mu        sync.RWMutex
	filePath  string
	maxRecent int
	items     []RecentFileDTO
}

// NewService constructs a RecentFilesService using the platform user config path and default bounds.
func NewService() (*Service, error) {
	path, err := DefaultRecentFilesPath()
	if err != nil {
		return nil, err
	}
	return NewServiceWithPath(path, DefaultMaxRecent)
}

// NewServiceWithPath constructs a RecentFilesService targeting a custom file path or in-memory when empty.
func NewServiceWithPath(filePath string, maxRecent int) (*Service, error) {
	if maxRecent <= 0 {
		maxRecent = DefaultMaxRecent
	}

	cleanPath := ""
	if filePath != "" {
		cleanPath = filepath.Clean(filePath)
	}

	s := &Service{
		filePath:  cleanPath,
		maxRecent: maxRecent,
		items:     make([]RecentFileDTO, 0),
	}

	if cleanPath != "" {
		if err := s.loadOrInitialize(); err != nil {
			return nil, err
		}
	}

	return s, nil
}

// GetFilePath returns the active storage path.
func (s *Service) GetFilePath() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.filePath
}

// GetMaxRecent returns the current bound on the recent files list.
func (s *Service) GetMaxRecent() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.maxRecent
}

// SetMaxRecent updates the maximum capacity and trims excess entries if necessary.
func (s *Service) SetMaxRecent(max int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if max <= 0 {
		max = DefaultMaxRecent
	}
	s.maxRecent = max

	if len(s.items) > s.maxRecent {
		s.items = s.items[:s.maxRecent]
		if s.filePath != "" {
			if err := s.atomicWriteLocked(); err != nil {
				return fmt.Errorf("failed to persist trimmed recent files: %w", err)
			}
		}
	}
	return nil
}

// GetRecentFiles returns a copy of the recent files list.
// For each entry, it dynamically checks file existence on disk (os.Stat) and computes
// the filename basename.
func (s *Service) GetRecentFiles() []RecentFileDTO {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]RecentFileDTO, len(s.items))
	for i, item := range s.items {
		// Populate derived metadata
		item.Filename = filepath.Base(item.Path)
		info, err := os.Stat(item.Path)
		item.Exists = (err == nil && !info.IsDir())
		result[i] = item
	}
	return result
}

// AddRecentFile appends or updates a document path in the recent files list.
// In accordance with FR-OPEN-006:
// 1. Reopening an existing file moves it to index 0 rather than creating duplicates.
// 2. Its timestamp is updated to the current UTC ISO timestamp.
// 3. The list is bounded to maxRecent (default 20), dropping the oldest entry.
// 4. File existence is verified and stored.
func (s *Service) AddRecentFile(path string) (RecentFileDTO, error) {
	absPath, err := NormalizePath(path)
	if err != nil {
		return RecentFileDTO{}, fmt.Errorf("invalid path: %w", err)
	}

	info, statErr := os.Stat(absPath)
	exists := (statErr == nil && !info.IsDir())
	now := time.Now().UTC().Format(time.RFC3339)

	newEntry := RecentFileDTO{
		Path:         absPath,
		LastOpenedAt: now,
		Filename:     filepath.Base(absPath),
		Exists:       exists,
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Deduplication: remove existing instance of this path if present
	updated := make([]RecentFileDTO, 0, len(s.items)+1)
	updated = append(updated, newEntry)

	for _, item := range s.items {
		if item.Path != absPath {
			updated = append(updated, item)
		}
	}

	// 2. Bound list to maxRecent
	if len(updated) > s.maxRecent {
		updated = updated[:s.maxRecent]
	}

	s.items = updated

	// 3. Persist atomically
	if s.filePath != "" {
		if writeErr := s.atomicWriteLocked(); writeErr != nil {
			return newEntry, fmt.Errorf("failed to persist recent files: %w", writeErr)
		}
	}

	return newEntry, nil
}

// RemoveRecentFile removes a specific document path from the recent files list.
func (s *Service) RemoveRecentFile(path string) error {
	absPath, err := NormalizePath(path)
	if err != nil {
		absPath = filepath.Clean(path)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	found := false
	filtered := make([]RecentFileDTO, 0, len(s.items))
	for _, item := range s.items {
		if item.Path == absPath {
			found = true
			continue
		}
		filtered = append(filtered, item)
	}

	if !found {
		return nil
	}

	s.items = filtered
	if s.filePath != "" {
		return s.atomicWriteLocked()
	}
	return nil
}

// ClearRecentFiles removes all recent file entries and persists the empty list.
func (s *Service) ClearRecentFiles() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.items = make([]RecentFileDTO, 0)
	if s.filePath != "" {
		return s.atomicWriteLocked()
	}
	return nil
}

// loadOrInitialize reads and parses the recent files JSON file from disk.
// If missing, it creates an empty list file.
// If corrupted or empty, it backs up the file to .corrupt.<timestamp> and starts clean.
func (s *Service) loadOrInitialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", dir, err)
	}

	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			s.items = make([]RecentFileDTO, 0)
			return s.atomicWriteLocked()
		}
		return fmt.Errorf("failed to read recent files %s: %w", s.filePath, err)
	}

	if len(data) == 0 {
		log.Printf("[Recents] Recent files file %s is empty; triggering corruption recovery", s.filePath)
		return s.recoverCorruptedLocked("empty file")
	}

	var parsed []RecentFileDTO
	if unmarshalErr := json.Unmarshal(data, &parsed); unmarshalErr != nil {
		log.Printf("[Recents] Recent files file %s contains invalid JSON (%v); triggering corruption recovery", s.filePath, unmarshalErr)
		return s.recoverCorruptedLocked(fmt.Sprintf("json unmarshal error: %v", unmarshalErr))
	}

	// Validate, normalize paths, and bound to maxRecent
	validated := make([]RecentFileDTO, 0, len(parsed))
	seen := make(map[string]bool)

	for _, item := range parsed {
		if item.Path == "" || seen[item.Path] {
			continue
		}
		seen[item.Path] = true
		item.Filename = filepath.Base(item.Path)
		validated = append(validated, item)
		if len(validated) >= s.maxRecent {
			break
		}
	}

	s.items = validated
	return nil
}

// recoverCorruptedLocked backs up the corrupted recent files file and resets to empty.
func (s *Service) recoverCorruptedLocked(reason string) error {
	timestamp := time.Now().UTC().Format("20060102T150405Z")
	backupPath := fmt.Sprintf("%s.corrupt.%s", s.filePath, timestamp)
	if _, err := os.Stat(backupPath); err == nil {
		backupPath = fmt.Sprintf("%s.corrupt.%s.%d", s.filePath, timestamp, time.Now().UTC().Nanosecond())
	}

	if err := copyFile(s.filePath, backupPath); err != nil {
		log.Printf("[Recents] Warning: failed to backup corrupted recent files to %s: %v", backupPath, err)
	} else {
		log.Printf("[Recents] Corrupted recent files backed up to %s (reason: %s)", backupPath, reason)
	}

	s.items = make([]RecentFileDTO, 0)
	return s.atomicWriteLocked()
}

// atomicWriteLocked writes items to a temporary file, flushes/syncs, and renames atomically.
func (s *Service) atomicWriteLocked() error {
	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to ensure directory exists %s: %w", dir, err)
	}

	encoded, err := json.MarshalIndent(s.items, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal recent files JSON: %w", err)
	}
	encoded = append(encoded, '\n')

	tmpFile, err := os.CreateTemp(dir, "recent-files.*.tmp")
	if err != nil {
		return fmt.Errorf("failed to create temporary file: %w", err)
	}
	tmpName := tmpFile.Name()

	cleanupTmp := true
	defer func() {
		if cleanupTmp {
			_ = os.Remove(tmpName)
		}
	}()

	if _, err := tmpFile.Write(encoded); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("failed to write recent files data: %w", err)
	}

	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("failed to sync temporary recent files: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close temporary file: %w", err)
	}

	if err := os.Rename(tmpName, s.filePath); err != nil {
		return fmt.Errorf("failed to atomically rename %s to %s: %w", tmpName, s.filePath, err)
	}

	cleanupTmp = false
	return nil
}

// copyFile copies a file from src to dst.
func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() {
		_ = in.Close()
	}()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return err
	}
	defer func() {
		_ = out.Close()
	}()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}
