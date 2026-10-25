package diagnostics

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// DefaultLogPath returns the canonical path to the diagnostics log file:
// - Linux/Unix: ~/.config/markdown-viewer/app.log
// - Windows: %APPDATA%\markdown-viewer\app.log
// - macOS: ~/Library/Application Support/markdown-viewer/app.log
func DefaultLogPath() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("unable to determine user config directory: %w", err)
	}
	return filepath.Join(configDir, "markdown-viewer", "app.log"), nil
}

// Logger provides bounded, privacy-preserving file logging with size-based rotation.
type Logger struct {
	mu          sync.Mutex
	opts        Options
	file        *os.File
	currentSize int64
	sanitizer   *Sanitizer
}

// NewDefaultLogger constructs a diagnostics logger using default options and default config path.
func NewDefaultLogger() (*Logger, error) {
	path, err := DefaultLogPath()
	if err != nil {
		return nil, err
	}
	return NewLogger(DefaultOptions(path))
}

// NewLogger constructs a diagnostics logger with custom options.
func NewLogger(opts Options) (*Logger, error) {
	if opts.FilePath == "" {
		path, err := DefaultLogPath()
		if err != nil {
			return nil, err
		}
		opts.FilePath = path
	}

	if opts.MaxSizeBytes <= 0 {
		opts.MaxSizeBytes = 5 * 1024 * 1024 // 5 MiB default
	}

	if opts.MaxBackups < 0 {
		opts.MaxBackups = 1
	}

	cleanPath := filepath.Clean(opts.FilePath)
	opts.FilePath = cleanPath

	// Ensure parent directory exists
	dir := filepath.Dir(cleanPath)
	if err := os.MkdirAll(dir, 0700); err != nil {
		return nil, fmt.Errorf("failed to create log directory %s: %w", dir, err)
	}

	sanitizer := NewSanitizer()

	l := &Logger{
		opts:      opts,
		sanitizer: sanitizer,
	}

	// Open or create the active log file
	if err := l.openActiveFile(); err != nil {
		return nil, err
	}

	return l, nil
}

// openActiveFile opens the log file in append mode and initializes the current byte counter.
// Must be called with lock held or during initialization.
func (l *Logger) openActiveFile() error {
	f, err := os.OpenFile(l.opts.FilePath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return fmt.Errorf("failed to open log file %s: %w", l.opts.FilePath, err)
	}

	stat, err := f.Stat()
	if err != nil {
		_ = f.Close()
		return fmt.Errorf("failed to stat log file %s: %w", l.opts.FilePath, err)
	}

	l.file = f
	l.currentSize = stat.Size()
	return nil
}

// GetLogPath returns the active log file path.
func (l *Logger) GetLogPath() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.opts.FilePath
}

// CurrentSizeBytes returns the current size of the active log file in bytes.
func (l *Logger) CurrentSizeBytes() int64 {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.currentSize
}

// Log writes a sanitized entry to the log file, performing rotation if size bounds are reached.
func (l *Logger) Log(level Level, component string, message string, details map[string]interface{}) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	// Apply privacy redactions
	sanitizedMsg := message
	if l.opts.RedactCredentials || l.opts.RedactPaths {
		sanitizedMsg = l.sanitizer.SanitizeMessage(sanitizedMsg)
		if l.opts.RedactPaths {
			sanitizedMsg = l.sanitizer.SanitizePath(sanitizedMsg)
		}
	}

	sanitizedDetails := details
	if len(details) > 0 {
		sanitizedDetails = l.sanitizer.SanitizeFields(details)
	}

	entry := LogEntry{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Level:     level,
		Component: component,
		Message:   sanitizedMsg,
		Details:   sanitizedDetails,
	}

	line := entry.String() + "\n"
	lineBytes := []byte(line)
	lineLen := int64(len(lineBytes))

	// Check if write would exceed maximum size bound
	if l.opts.MaxSizeBytes > 0 && (l.currentSize+lineLen) > l.opts.MaxSizeBytes {
		if err := l.rotateLocked(); err != nil {
			return fmt.Errorf("log rotation failed: %w", err)
		}
	}

	if l.file == nil {
		if err := l.openActiveFile(); err != nil {
			return err
		}
	}

	n, err := l.file.Write(lineBytes)
	if err != nil {
		return fmt.Errorf("failed writing to log file: %w", err)
	}

	l.currentSize += int64(n)
	return nil
}

// Info logs an informational message.
func (l *Logger) Info(component, message string) {
	_ = l.Log(LevelInfo, component, message, nil)
}

// Warn logs a warning message.
func (l *Logger) Warn(component, message string) {
	_ = l.Log(LevelWarn, component, message, nil)
}

// Error logs an error message.
func (l *Logger) Error(component, message string) {
	_ = l.Log(LevelError, component, message, nil)
}

// ErrorWithDetails logs an error message with contextual details.
func (l *Logger) ErrorWithDetails(component, message string, details map[string]interface{}) {
	_ = l.Log(LevelError, component, message, details)
}

// Rotate manually triggers log rotation.
func (l *Logger) Rotate() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.rotateLocked()
}

// rotateLocked performs file rotation (app.log -> app.log.1).
// Must be called with l.mu held.
func (l *Logger) rotateLocked() error {
	if l.file != nil {
		_ = l.file.Sync()
		_ = l.file.Close()
		l.file = nil
	}

	basePath := l.opts.FilePath

	// Manage backups from oldest to newest: if maxBackups = 1, app.log -> app.log.1
	for i := l.opts.MaxBackups; i >= 1; i-- {
		src := basePath
		if i > 1 {
			src = BackupFilePath(basePath, i-1)
		}
		dst := BackupFilePath(basePath, i)

		if i == l.opts.MaxBackups {
			// Discard the oldest backup file if it exists
			_ = os.Remove(dst)
		}

		if _, err := os.Stat(src); err == nil {
			_ = os.Rename(src, dst)
		}
	}

	// Create fresh active log file
	f, err := os.OpenFile(basePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		return fmt.Errorf("failed to create new log file after rotation: %w", err)
	}

	l.file = f
	l.currentSize = 0
	return nil
}

// ReadLogs reads all lines from the active log file (for local diagnostics inspection).
func (l *Logger) ReadLogs() ([]string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.file != nil {
		_ = l.file.Sync()
	}

	f, err := os.Open(l.opts.FilePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}
	defer func() {
		_ = f.Close()
	}()

	var lines []string
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		lines = append(lines, scanner.Text())
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed reading logs: %w", err)
	}

	return lines, nil
}

// Close flushes and closes the active log file.
func (l *Logger) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()

	if l.file != nil {
		_ = l.file.Sync()
		err := l.file.Close()
		l.file = nil
		return err
	}
	return nil
}
