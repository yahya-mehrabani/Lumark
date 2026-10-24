package documents

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestFileValidation(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	t.Run("empty path", func(t *testing.T) {
		_, _, err := svc.ValidatePath("")
		if err == nil {
			t.Fatal("expected error for empty path, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeInvalidPath {
			t.Fatalf("expected ErrCodeInvalidPath, got: %v", err)
		}
	})

	t.Run("unsupported extensions", func(t *testing.T) {
		unsupported := []string{"test.txt", "doc.docx", "script.sh", "archive.tar.gz", "noextension"}
		for _, name := range unsupported {
			path := filepath.Join(tempDir, name)
			if err := os.WriteFile(path, []byte("content"), 0o600); err != nil {
				t.Fatalf("failed to create dummy file: %v", err)
			}
			_, _, err := svc.ValidatePath(path)
			if err == nil {
				t.Fatalf("expected error for unsupported extension %s, got nil", name)
			}
			var docErr *DocumentError
			if !errors.As(err, &docErr) || docErr.Code != ErrCodeUnsupportedType {
				t.Fatalf("expected ErrCodeUnsupportedType for %s, got: %v", name, err)
			}
		}
	})

	t.Run("supported extensions with various casings", func(t *testing.T) {
		extensions := []string{".md", ".MD", ".markdown", ".MARKDOWN", ".mdown", ".MDown", ".mkd", ".MKD"}
		for _, ext := range extensions {
			path := filepath.Join(tempDir, "sample"+ext)
			if err := os.WriteFile(path, []byte("# Heading"), 0o600); err != nil {
				t.Fatalf("failed to create test file: %v", err)
			}
			resolved, info, err := svc.ValidatePath(path)
			if err != nil {
				t.Fatalf("expected success for supported extension %s, got err: %v", ext, err)
			}
			if resolved != path {
				t.Errorf("expected resolved path %s, got %s", path, resolved)
			}
			if info == nil || info.Size() != int64(len("# Heading")) {
				t.Errorf("unexpected file info: %v", info)
			}
		}
	})

	t.Run("non-existent file", func(t *testing.T) {
		missingPath := filepath.Join(tempDir, "missing.md")
		_, _, err := svc.ValidatePath(missingPath)
		if err == nil {
			t.Fatal("expected error for non-existent file, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileNotFound {
			t.Fatalf("expected ErrCodeFileNotFound, got: %v", err)
		}
	})

	t.Run("directory path", func(t *testing.T) {
		dirPath := filepath.Join(tempDir, "folder.md")
		if err := os.Mkdir(dirPath, 0o750); err != nil {
			t.Fatalf("failed to create test directory: %v", err)
		}
		_, _, err := svc.ValidatePath(dirPath)
		if err == nil {
			t.Fatal("expected error for directory path, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeInvalidPath {
			t.Fatalf("expected ErrCodeInvalidPath for directory, got: %v", err)
		}
	})

	t.Run("file exceeding 20 MiB default limit", func(t *testing.T) {
		largeFilePath := filepath.Join(tempDir, "oversized.md")
		f, err := os.Create(largeFilePath)
		if err != nil {
			t.Fatalf("failed to create sparse file: %v", err)
		}
		// Create a 21 MiB sparse file without allocating 21 MiB of disk blocks
		const size21MiB = 21 * 1024 * 1024
		if err := f.Truncate(size21MiB); err != nil {
			_ = f.Close()
			t.Fatalf("failed to truncate sparse file: %v", err)
		}
		_ = f.Close()

		_, _, err = svc.ValidatePath(largeFilePath)
		if err == nil {
			t.Fatal("expected error for file exceeding 20 MiB, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileTooLarge {
			t.Fatalf("expected ErrCodeFileTooLarge, got: %v", err)
		}
	})

	t.Run("custom size limit", func(t *testing.T) {
		customSvc := NewServiceWithLimit(50) // 50 bytes limit
		smallFile := filepath.Join(tempDir, "small.md")
		if err := os.WriteFile(smallFile, []byte("short content"), 0o600); err != nil {
			t.Fatalf("failed to create small file: %v", err)
		}
		_, _, err := customSvc.ValidatePath(smallFile)
		if err != nil {
			t.Fatalf("expected 13-byte file to pass 50-byte limit, got: %v", err)
		}

		limitExceededFile := filepath.Join(tempDir, "limit_exceeded.md")
		content60Bytes := make([]byte, 60)
		if err := os.WriteFile(limitExceededFile, content60Bytes, 0o600); err != nil {
			t.Fatalf("failed to write 60 byte file: %v", err)
		}
		_, _, err = customSvc.ValidatePath(limitExceededFile)
		if err == nil {
			t.Fatal("expected error for file exceeding custom limit, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileTooLarge {
			t.Fatalf("expected ErrCodeFileTooLarge for custom limit, got: %v", err)
		}
	})

	t.Run("symlink resolution", func(t *testing.T) {
		targetFile := filepath.Join(tempDir, "target.md")
		if err := os.WriteFile(targetFile, []byte("# Symlink Target"), 0o600); err != nil {
			t.Fatalf("failed to create symlink target: %v", err)
		}
		linkFile := filepath.Join(tempDir, "link.md")
		if err := os.Symlink(targetFile, linkFile); err != nil {
			t.Fatalf("failed to create symlink: %v", err)
		}

		resolved, _, err := svc.ValidatePath(linkFile)
		if err != nil {
			t.Fatalf("expected symlink to resolve, got error: %v", err)
		}
		if resolved != targetFile {
			t.Errorf("expected resolved path %s, got %s", targetFile, resolved)
		}

		// Dangling symlink
		danglingLink := filepath.Join(tempDir, "dangling.md")
		if err := os.Symlink(filepath.Join(tempDir, "nonexistent.md"), danglingLink); err != nil {
			t.Fatalf("failed to create dangling symlink: %v", err)
		}
		_, _, err = svc.ValidatePath(danglingLink)
		if err == nil {
			t.Fatal("expected error for dangling symlink, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileNotFound {
			t.Fatalf("expected ErrCodeFileNotFound for dangling symlink, got: %v", err)
		}
	})
}
