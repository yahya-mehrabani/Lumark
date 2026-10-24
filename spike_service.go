package main

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"markdown-viewer/internal/assets"
)

// DocumentData encapsulates document path, directory, filename, and markdown content.
type DocumentData struct {
	FilePath string `json:"filePath"`
	Filename string `json:"filename"`
	Dir      string `json:"dir"`
	Content  string `json:"content"`
}

// SpikeDocumentService coordinates document loading and updates the scoped asset resolver root.
type SpikeDocumentService struct {
	mu       sync.RWMutex
	resolver *assets.ScopedResolver
	current  DocumentData
}

// NewSpikeDocumentService creates a new SpikeDocumentService.
func NewSpikeDocumentService(resolver *assets.ScopedResolver) *SpikeDocumentService {
	return &SpikeDocumentService{
		resolver: resolver,
	}
}

// LoadFile reads the specified file, configures the asset resolver root directory, and returns DocumentData.
func (s *SpikeDocumentService) LoadFile(path string) (DocumentData, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	absPath, err := filepath.Abs(path)
	if err != nil {
		return DocumentData{}, fmt.Errorf("failed to resolve absolute path: %w", err)
	}

	contentBytes, err := os.ReadFile(absPath)
	if err != nil {
		return DocumentData{}, fmt.Errorf("failed to read file: %w", err)
	}

	dir := filepath.Dir(absPath)
	if s.resolver != nil {
		if setErr := s.resolver.SetRootDir(dir); setErr != nil {
			return DocumentData{}, fmt.Errorf("failed to update asset resolver root: %w", setErr)
		}
	}

	s.current = DocumentData{
		FilePath: absPath,
		Filename: filepath.Base(absPath),
		Dir:      dir,
		Content:  string(contentBytes),
	}

	return s.current, nil
}

// GetCurrentDocument returns the currently loaded document data.
func (s *SpikeDocumentService) GetCurrentDocument() DocumentData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.current
}
