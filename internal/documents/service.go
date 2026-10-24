package documents

import (
	"errors"
)

// MaxFileSizeBytes defines the 20 MiB document size limit per PRD Section 9.5.
const MaxFileSizeBytes int64 = 20 * 1024 * 1024 // 20 MiB

// SupportedExtensions lists the supported Markdown file extensions.
var SupportedExtensions = []string{".md", ".markdown", ".mdown", ".mkd"}

// DocumentService defines the interface for reading Markdown documents safely.
type DocumentService interface {
	ReadDocument(path string) (*DocumentDTO, error)
}

// Service implements the DocumentService interface.
type Service struct {
	maxSizeBytes int64
}

// NewService creates a new DocumentService with default production limits.
func NewService() *Service {
	return &Service{
		maxSizeBytes: MaxFileSizeBytes,
	}
}

// NewServiceWithLimit creates a DocumentService with a custom maximum file size limit.
func NewServiceWithLimit(maxSizeBytes int64) *Service {
	return &Service{
		maxSizeBytes: maxSizeBytes,
	}
}

// Ensure Service implements DocumentService at compile time.
var _ DocumentService = (*Service)(nil)

// ReadDocument reads and validates a Markdown document from disk.
func (s *Service) ReadDocument(path string) (*DocumentDTO, error) {
	// Full validation and reader implementation is in US-005.2 and US-005.3.
	return nil, errors.New("not implemented")
}
