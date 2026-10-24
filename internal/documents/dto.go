package documents

import (
	"fmt"
	"time"
)

// Document error codes per PRD Section 7.3, 9.5 and FR-ERR-001.
const (
	ErrCodeFileTooLarge      = "FILE_TOO_LARGE"
	ErrCodeUnsupportedType  = "UNSUPPORTED_TYPE"
	ErrCodeFileNotFound     = "FILE_NOT_FOUND"
	ErrCodePermissionDenied = "PERMISSION_DENIED"
	ErrCodeReadFailed       = "READ_FAILED"
	ErrCodeInvalidPath      = "INVALID_PATH"
)

// DocumentDTO represents structured metadata and content of a loaded Markdown document.
type DocumentDTO struct {
	Path              string    `json:"path"`
	FileName          string    `json:"fileName"`
	Content           string    `json:"content"`
	FileSizeBytes     int64     `json:"fileSizeBytes"`
	LastModified      time.Time `json:"lastModified"`
	IsReadOnly        bool      `json:"isReadOnly"`
	HasEncodingErrors bool      `json:"hasEncodingErrors"`
}

// DocumentError represents a structured, actionable error returned by the DocumentService.
type DocumentError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Path    string `json:"path"`
	Err     error  `json:"-"`
}

// Error implements the error interface.
func (e *DocumentError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s (%s): %v", e.Code, e.Message, e.Path, e.Err)
	}
	return fmt.Sprintf("[%s] %s (%s)", e.Code, e.Message, e.Path)
}

// Unwrap returns the underlying wrapped error, enabling errors.Is and errors.As.
func (e *DocumentError) Unwrap() error {
	return e.Err
}
