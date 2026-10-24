package documents

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// MaxFileSizeBytes defines the 20 MiB document size limit per PRD Section 9.5.
const MaxFileSizeBytes int64 = 20 * 1024 * 1024 // 20 MiB

// SupportedExtensions lists the supported Markdown file extensions.
var SupportedExtensions = []string{".md", ".markdown", ".mdown", ".mkd"}

// DocumentService defines the interface for reading Markdown documents safely.
type DocumentService interface {
	ReadDocument(path string) (*DocumentDTO, error)
	ValidatePath(path string) (string, os.FileInfo, error)
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

// IsSupportedExtension reports whether the given extension (with dot) is supported.
func IsSupportedExtension(ext string) bool {
	ext = strings.ToLower(ext)
	for _, supported := range SupportedExtensions {
		if ext == supported {
			return true
		}
	}
	return false
}

// ValidatePath validates file existence, extension, and size limits without reading file contents into memory.
// Returns the resolved absolute file path and os.FileInfo, or a structured *DocumentError.
func (s *Service) ValidatePath(path string) (string, os.FileInfo, error) {
	if strings.TrimSpace(path) == "" {
		return "", nil, &DocumentError{
			Code:    ErrCodeInvalidPath,
			Message: "file path cannot be empty",
			Path:    path,
		}
	}

	cleanPath := filepath.Clean(path)
	absPath, err := filepath.Abs(cleanPath)
	if err != nil {
		return "", nil, &DocumentError{
			Code:    ErrCodeInvalidPath,
			Message: "failed to resolve absolute file path",
			Path:    path,
			Err:     err,
		}
	}

	// Validate file extension before following or statting
	ext := filepath.Ext(absPath)
	if !IsSupportedExtension(ext) {
		return "", nil, &DocumentError{
			Code:    ErrCodeUnsupportedType,
			Message: fmt.Sprintf("unsupported file extension %q; expected .md, .markdown, .mdown, or .mkd", ext),
			Path:    absPath,
		}
	}

	// Resolve symlinks safely
	resolvedPath, err := filepath.EvalSymlinks(absPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil, &DocumentError{
				Code:    ErrCodeFileNotFound,
				Message: "file not found",
				Path:    absPath,
				Err:     err,
			}
		}
		if errors.Is(err, os.ErrPermission) {
			return "", nil, &DocumentError{
				Code:    ErrCodePermissionDenied,
				Message: "permission denied resolving path",
				Path:    absPath,
				Err:     err,
			}
		}
		return "", nil, &DocumentError{
			Code:    ErrCodeInvalidPath,
			Message: "failed to evaluate path symlinks",
			Path:    absPath,
			Err:     err,
		}
	}

	// Stat the resolved file
	info, err := os.Stat(resolvedPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return "", nil, &DocumentError{
				Code:    ErrCodeFileNotFound,
				Message: "file not found",
				Path:    resolvedPath,
				Err:     err,
			}
		}
		if errors.Is(err, os.ErrPermission) {
			return "", nil, &DocumentError{
				Code:    ErrCodePermissionDenied,
				Message: "permission denied reading file",
				Path:    resolvedPath,
				Err:     err,
			}
		}
		return "", nil, &DocumentError{
			Code:    ErrCodeReadFailed,
			Message: "failed to stat file",
			Path:    resolvedPath,
			Err:     err,
		}
	}

	if info.IsDir() {
		return "", nil, &DocumentError{
			Code:    ErrCodeInvalidPath,
			Message: "path is a directory, not a Markdown document",
			Path:    resolvedPath,
		}
	}

	// Enforce 20 MiB size limit per PRD Section 9.5 without memory allocation
	if s.maxSizeBytes > 0 && info.Size() > s.maxSizeBytes {
		return "", nil, &DocumentError{
			Code: ErrCodeFileTooLarge,
			Message: fmt.Sprintf("file size (%d bytes) exceeds maximum allowed limit (%d bytes)",
				info.Size(), s.maxSizeBytes),
			Path: resolvedPath,
		}
	}

	return resolvedPath, info, nil
}

// ReadDocument reads, validates, and decodes a Markdown document from disk.
func (s *Service) ReadDocument(path string) (*DocumentDTO, error) {
	resolvedPath, info, err := s.ValidatePath(path)
	if err != nil {
		return nil, err
	}

	f, err := os.Open(resolvedPath)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, &DocumentError{
				Code:    ErrCodeFileNotFound,
				Message: "file not found",
				Path:    resolvedPath,
				Err:     err,
			}
		}
		if errors.Is(err, os.ErrPermission) {
			return nil, &DocumentError{
				Code:    ErrCodePermissionDenied,
				Message: "permission denied reading file",
				Path:    resolvedPath,
				Err:     err,
			}
		}
		return nil, &DocumentError{
			Code:    ErrCodeReadFailed,
			Message: "failed to open file",
			Path:    resolvedPath,
			Err:     err,
		}
	}
	defer func() {
		_ = f.Close()
	}()

	// Guard with LimitReader (maxSizeBytes + 1) to protect against concurrent file growth
	var reader io.Reader = f
	if s.maxSizeBytes > 0 {
		reader = io.LimitReader(f, s.maxSizeBytes+1)
	}

	raw, err := io.ReadAll(reader)
	if err != nil {
		return nil, &DocumentError{
			Code:    ErrCodeReadFailed,
			Message: "failed to read file contents",
			Path:    resolvedPath,
			Err:     err,
		}
	}

	if s.maxSizeBytes > 0 && int64(len(raw)) > s.maxSizeBytes {
		return nil, &DocumentError{
			Code: ErrCodeFileTooLarge,
			Message: fmt.Sprintf("file size exceeds maximum allowed limit (%d bytes)",
				s.maxSizeBytes),
			Path: resolvedPath,
		}
	}

	content, hasEncodingErrors := DecodeUTF8(raw)
	isReadOnly := (info.Mode().Perm() & 0200) == 0

	return &DocumentDTO{
		Path:              resolvedPath,
		FileName:          info.Name(),
		Content:           content,
		FileSizeBytes:     int64(len(raw)),
		LastModified:      info.ModTime(),
		IsReadOnly:        isReadOnly,
		HasEncodingErrors: hasEncodingErrors,
	}, nil
}
