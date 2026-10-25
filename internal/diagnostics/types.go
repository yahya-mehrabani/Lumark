package diagnostics

import (
	"fmt"
	"path/filepath"
)

// Level represents the severity level of a log entry.
type Level string

const (
	LevelDebug Level = "DEBUG"
	LevelInfo  Level = "INFO"
	LevelWarn  Level = "WARN"
	LevelError Level = "ERROR"
)

// Options defines configuration options for the diagnostics logger.
type Options struct {
	// FilePath is the full destination path for the active log file (e.g. app.log).
	FilePath string

	// MaxSizeBytes is the maximum size in bytes before app.log is rotated to app.log.1.
	// Default is 5 MiB (5 * 1024 * 1024 bytes).
	MaxSizeBytes int64

	// MaxBackups is the maximum number of rotated backup files to retain.
	// Default is 1 (retaining app.log and app.log.1).
	MaxBackups int

	// RedactPaths enables automatic replacement of user home directories with "~".
	RedactPaths bool

	// RedactCredentials enables automatic scrubbing of passwords, tokens, and authorization headers.
	RedactCredentials bool

	// RedactDocumentContent enables strict masking of document text and body payloads.
	RedactDocumentContent bool
}

// DefaultOptions returns standard configuration bounded to 5 MiB with privacy redactions enabled.
func DefaultOptions(filePath string) Options {
	return Options{
		FilePath:              filePath,
		MaxSizeBytes:          5 * 1024 * 1024, // 5 MiB
		MaxBackups:            1,               // 1 backup (app.log.1)
		RedactPaths:           true,
		RedactCredentials:     true,
		RedactDocumentContent: true,
	}
}

// LogEntry represents a single structured log record.
type LogEntry struct {
	Timestamp string                 `json:"timestamp"`
	Level     Level                  `json:"level"`
	Component string                 `json:"component"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
}

// String formats the log entry for plain-text diagnostics logs.
func (e LogEntry) String() string {
	if len(e.Details) == 0 {
		return fmt.Sprintf("[%s] [%s] [%s] %s", e.Timestamp, e.Level, e.Component, e.Message)
	}

	detailsStr := ""
	for k, v := range e.Details {
		detailsStr += fmt.Sprintf(" %s=%v", k, v)
	}
	return fmt.Sprintf("[%s] [%s] [%s] %s%s", e.Timestamp, e.Level, e.Component, e.Message, detailsStr)
}

// BackupFilePath returns the rotated backup path for a given backup index (e.g. app.log.1).
func BackupFilePath(basePath string, index int) string {
	cleanPath := filepath.Clean(basePath)
	return fmt.Sprintf("%s.%d", cleanPath, index)
}
