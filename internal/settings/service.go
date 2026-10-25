package settings

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

// DefaultConfigPath resolves the OS user configuration directory path:
// - Linux/Unix: ~/.config/markdown-viewer/settings.json
// - Windows: %APPDATA%\markdown-viewer\settings.json
// - macOS: ~/Library/Application Support/markdown-viewer/settings.json
func DefaultConfigPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("unable to determine user config directory: %w", err)
	}
	return filepath.Join(configDir, "markdown-viewer", "settings.json"), nil
}

// Service manages loading, validation, atomic saving, and corruption recovery for application preferences.
type Service struct {
	mu       sync.RWMutex
	filePath string
	current  SettingsDTO
}

// NewService constructs a Settings service targeting the default platform user config path.
func NewService() (*Service, error) {
	path, err := DefaultConfigPath()
	if err != nil {
		return nil, err
	}
	return NewServiceWithPath(path)
}

// NewServiceWithPath constructs a Settings service targeting a custom file path (primarily for testing and custom storage).
func NewServiceWithPath(filePath string) (*Service, error) {
	cleanPath := filepath.Clean(filePath)
	s := &Service{
		filePath: cleanPath,
		current:  DefaultSettings(),
	}

	if err := s.loadOrInitialize(); err != nil {
		return nil, err
	}

	return s, nil
}

// GetFilePath returns the active settings file path.
func (s *Service) GetFilePath() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.filePath
}

// GetSettings returns a copy of the currently active settings.
func (s *Service) GetSettings() SettingsDTO {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.current
}

// SaveSettings validates, normalizes, and atomically persists user preferences to disk.
func (s *Service) SaveSettings(settings SettingsDTO) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	settings.NormalizeAndValidate()
	if err := s.atomicWriteLocked(settings); err != nil {
		return fmt.Errorf("failed to save settings: %w", err)
	}

	s.current = settings
	return nil
}

// ResetSettings restores default preferences, persists them atomically, and returns the defaults.
// In accordance with FR-SET-004, it only resets application preferences and never touches document files.
func (s *Service) ResetSettings() (SettingsDTO, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	defaults := DefaultSettings()
	if err := s.atomicWriteLocked(defaults); err != nil {
		return defaults, fmt.Errorf("failed to reset settings: %w", err)
	}

	s.current = defaults
	log.Printf("[Settings] Preferences successfully reset to defaults")
	return s.current, nil
}

// loadOrInitialize attempts to read and parse the settings file.
// If missing, it creates the file with default settings.
// If corrupted or empty, it backs up the bad file and restores defaults without crashing.
func (s *Service) loadOrInitialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to create config directory %s: %w", dir, err)
	}

	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Initialize with clean defaults
			defaults := DefaultSettings()
			if writeErr := s.atomicWriteLocked(defaults); writeErr != nil {
				return fmt.Errorf("failed to initialize default settings: %w", writeErr)
			}
			s.current = defaults
			return nil
		}
		return fmt.Errorf("failed to read settings file %s: %w", s.filePath, err)
	}

	if len(data) == 0 {
		log.Printf("[Settings] Settings file %s is empty; triggering corruption recovery", s.filePath)
		return s.recoverCorruptedLocked("empty file")
	}

	var parsed SettingsDTO
	if unmarshalErr := json.Unmarshal(data, &parsed); unmarshalErr != nil {
		log.Printf("[Settings] Settings file %s contains invalid JSON (%v); triggering corruption recovery", s.filePath, unmarshalErr)
		return s.recoverCorruptedLocked(fmt.Sprintf("json unmarshal error: %v", unmarshalErr))
	}

	parsed.NormalizeAndValidate()
	s.current = parsed
	return nil
}

// recoverCorruptedLocked backs up the corrupted settings file to settings.json.corrupt.<timestamp>
// and restores fresh default settings.
func (s *Service) recoverCorruptedLocked(reason string) error {
	timestamp := time.Now().UTC().Format("20060102T150405Z")
	backupPath := fmt.Sprintf("%s.corrupt.%s", s.filePath, timestamp)
	if _, err := os.Stat(backupPath); err == nil {
		backupPath = fmt.Sprintf("%s.corrupt.%s.%d", s.filePath, timestamp, time.Now().UTC().Nanosecond())
	}

	if err := copyFile(s.filePath, backupPath); err != nil {
		log.Printf("[Settings] Warning: failed to backup corrupted settings to %s: %v", backupPath, err)
	} else {
		log.Printf("[Settings] Corrupted settings backed up to %s (reason: %s)", backupPath, reason)
	}

	defaults := DefaultSettings()
	if err := s.atomicWriteLocked(defaults); err != nil {
		return fmt.Errorf("failed to write fresh defaults during recovery: %w", err)
	}

	s.current = defaults
	return nil
}

// atomicWriteLocked writes the provided settings to a temporary file, syncs to disk, and renames atomically.
func (s *Service) atomicWriteLocked(settings SettingsDTO) error {
	dir := filepath.Dir(s.filePath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return fmt.Errorf("failed to ensure directory exists: %w", err)
	}

	encoded, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal settings JSON: %w", err)
	}
	encoded = append(encoded, '\n')

	tmpFile, err := os.CreateTemp(dir, "settings.*.tmp")
	if err != nil {
		return fmt.Errorf("failed to create temporary settings file: %w", err)
	}
	tmpName := tmpFile.Name()

	// Ensure cleanup in case of failure before successful rename
	cleanupTmp := true
	defer func() {
		if cleanupTmp {
			_ = os.Remove(tmpName)
		}
	}()

	if _, err := tmpFile.Write(encoded); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("failed to write settings data: %w", err)
	}

	// Flush to disk
	if err := tmpFile.Sync(); err != nil {
		_ = tmpFile.Close()
		return fmt.Errorf("failed to sync temporary settings file: %w", err)
	}

	if err := tmpFile.Close(); err != nil {
		return fmt.Errorf("failed to close temporary settings file: %w", err)
	}

	// Atomic rename
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
