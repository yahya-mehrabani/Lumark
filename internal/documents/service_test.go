package documents

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"testing"
)

func TestDocumentError_FormattingAndUnwrap(t *testing.T) {
	t.Run("without wrapped error", func(t *testing.T) {
		docErr := &DocumentError{
			Code:    ErrCodeInvalidPath,
			Message: "path is empty",
			Path:    "/tmp/test.md",
		}
		expected := "[INVALID_PATH] path is empty (/tmp/test.md)"
		if docErr.Error() != expected {
			t.Errorf("expected %q, got %q", expected, docErr.Error())
		}
		if docErr.Unwrap() != nil {
			t.Errorf("expected nil wrapped error, got %v", docErr.Unwrap())
		}
	})

	t.Run("with wrapped error and errors.Is", func(t *testing.T) {
		underlying := os.ErrNotExist
		docErr := &DocumentError{
			Code:    ErrCodeFileNotFound,
			Message: "document missing",
			Path:    "/tmp/missing.md",
			Err:     underlying,
		}
		expected := fmt.Sprintf("[FILE_NOT_FOUND] document missing (/tmp/missing.md): %v", underlying)
		if docErr.Error() != expected {
			t.Errorf("expected %q, got %q", expected, docErr.Error())
		}
		if !errors.Is(docErr, os.ErrNotExist) {
			t.Errorf("expected errors.Is(docErr, os.ErrNotExist) to be true")
		}
	})
}

func TestReadDocument_Success(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	filePath := filepath.Join(tempDir, "sample.md")
	content := "# Heading\n\nThis is standard Markdown content."
	if err := os.WriteFile(filePath, []byte(content), 0o644); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	dto, err := svc.ReadDocument(filePath)
	if err != nil {
		t.Fatalf("unexpected error reading valid document: %v", err)
	}

	if dto.Path != filePath {
		t.Errorf("expected Path %s, got %s", filePath, dto.Path)
	}
	if dto.FileName != "sample.md" {
		t.Errorf("expected FileName 'sample.md', got %s", dto.FileName)
	}
	if dto.Content != content {
		t.Errorf("expected Content %q, got %q", content, dto.Content)
	}
	if dto.FileSizeBytes != int64(len(content)) {
		t.Errorf("expected FileSizeBytes %d, got %d", len(content), dto.FileSizeBytes)
	}
	if dto.HasEncodingErrors {
		t.Errorf("expected HasEncodingErrors=false")
	}
	if dto.IsReadOnly {
		t.Errorf("expected IsReadOnly=false for 0644 file")
	}
	if dto.LastModified.IsZero() {
		t.Errorf("expected non-zero LastModified time")
	}
}

func TestReadDocument_ReadOnly(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	filePath := filepath.Join(tempDir, "readonly.md")
	if err := os.WriteFile(filePath, []byte("# Readonly"), 0o444); err != nil {
		t.Fatalf("failed to write readonly file: %v", err)
	}

	dto, err := svc.ReadDocument(filePath)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !dto.IsReadOnly {
		t.Errorf("expected IsReadOnly=true for 0444 permission file")
	}
}

func TestReadDocument_UnicodeAndSpaces(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	// Subfolder with spaces and non-Latin characters per PRD Section 12.4
	subDir := filepath.Join(tempDir, "پوشه اسناد و یادداشت\u200cها")
	if err := os.Mkdir(subDir, 0o750); err != nil {
		t.Fatalf("failed to create unicode directory: %v", err)
	}

	fileName := "فایل آزمایشی شماره ۱.markdown"
	filePath := filepath.Join(subDir, fileName)
	content := "# متن فارسی با ایموجی 🚀\n\nاین یک سند معتبر با کاراکترهای یونیکد است."
	if err := os.WriteFile(filePath, []byte(content), 0o600); err != nil {
		t.Fatalf("failed to write unicode file: %v", err)
	}

	dto, err := svc.ReadDocument(filePath)
	if err != nil {
		t.Fatalf("failed to read unicode document: %v", err)
	}

	if dto.Path != filePath {
		t.Errorf("expected Path %q, got %q", filePath, dto.Path)
	}
	if dto.FileName != fileName {
		t.Errorf("expected FileName %q, got %q", fileName, dto.FileName)
	}
	if dto.Content != content {
		t.Errorf("expected Content %q, got %q", content, dto.Content)
	}
	if dto.HasEncodingErrors {
		t.Errorf("expected HasEncodingErrors=false for valid unicode")
	}
}

func TestReadDocument_RelativePath(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	fileName := "relative.mdown"
	filePath := filepath.Join(tempDir, fileName)
	if err := os.WriteFile(filePath, []byte("# Relative test"), 0o600); err != nil {
		t.Fatalf("failed to write test file: %v", err)
	}

	// Change working directory to tempDir for relative path test
	cwd, err := os.Getwd()
	if err != nil {
		t.Fatalf("failed to get working dir: %v", err)
	}
	defer func() { _ = os.Chdir(cwd) }()

	if err := os.Chdir(tempDir); err != nil {
		t.Fatalf("failed to chdir to tempDir: %v", err)
	}

	dto, err := svc.ReadDocument("./" + fileName)
	if err != nil {
		t.Fatalf("ReadDocument failed for relative path: %v", err)
	}

	if !filepath.IsAbs(dto.Path) {
		t.Errorf("expected resolved path to be absolute, got %q", dto.Path)
	}
	if dto.FileName != fileName {
		t.Errorf("expected FileName %q, got %q", fileName, dto.FileName)
	}
}

func TestReadDocument_ValidationErrors(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	t.Run("missing file", func(t *testing.T) {
		_, err := svc.ReadDocument(filepath.Join(tempDir, "missing.md"))
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileNotFound {
			t.Fatalf("expected ErrCodeFileNotFound, got: %v", err)
		}
	})

	t.Run("directory path", func(t *testing.T) {
		dir := filepath.Join(tempDir, "folder.md")
		if err := os.Mkdir(dir, 0o750); err != nil {
			t.Fatalf("failed to create directory: %v", err)
		}
		_, err := svc.ReadDocument(dir)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeInvalidPath {
			t.Fatalf("expected ErrCodeInvalidPath, got: %v", err)
		}
	})

	t.Run("unsupported extension", func(t *testing.T) {
		txtFile := filepath.Join(tempDir, "notes.txt")
		if err := os.WriteFile(txtFile, []byte("plain text"), 0o600); err != nil {
			t.Fatalf("failed to write txt file: %v", err)
		}
		_, err := svc.ReadDocument(txtFile)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeUnsupportedType {
			t.Fatalf("expected ErrCodeUnsupportedType, got: %v", err)
		}
	})

	t.Run("file too large", func(t *testing.T) {
		customSvc := NewServiceWithLimit(20)
		largeFile := filepath.Join(tempDir, "oversized.mkd")
		if err := os.WriteFile(largeFile, []byte("this content is more than 20 bytes long"), 0o600); err != nil {
			t.Fatalf("failed to write oversized file: %v", err)
		}
		_, err := customSvc.ReadDocument(largeFile)
		if err == nil {
			t.Fatal("expected error, got nil")
		}
		var docErr *DocumentError
		if !errors.As(err, &docErr) || docErr.Code != ErrCodeFileTooLarge {
			t.Fatalf("expected ErrCodeFileTooLarge, got: %v", err)
		}
	})
}

func TestReadDocument_PermissionDenied(t *testing.T) {
	// Skip if running as root since root bypasses standard POSIX file permission checks
	if os.Getuid() == 0 {
		t.Skip("skipping permission denied test as root (root ignores POSIX permissions)")
	}

	tempDir := t.TempDir()
	svc := NewService()

	unreadableFile := filepath.Join(tempDir, "unreadable.md")
	if err := os.WriteFile(unreadableFile, []byte("# Secret"), 0o000); err != nil {
		t.Fatalf("failed to write file: %v", err)
	}

	_, err := svc.ReadDocument(unreadableFile)
	if err == nil {
		t.Fatal("expected permission error, got nil")
	}
	var docErr *DocumentError
	if !errors.As(err, &docErr) || (docErr.Code != ErrCodePermissionDenied && !errors.Is(docErr, fs.ErrPermission)) {
		t.Fatalf("expected ErrCodePermissionDenied, got: %v", err)
	}
}

func TestIsSupportedExtension(t *testing.T) {
	tests := []struct {
		ext      string
		expected bool
	}{
		{".md", true},
		{".MD", true},
		{".markdown", true},
		{".MARKDOWN", true},
		{".mdown", true},
		{".MDown", true},
		{".mkd", true},
		{".MKD", true},
		{".txt", false},
		{".html", false},
		{".pdf", false},
		{"", false},
		{"md", false},
	}

	for _, tc := range tests {
		result := IsSupportedExtension(tc.ext)
		if result != tc.expected {
			t.Errorf("IsSupportedExtension(%q) = %v; expected %v", tc.ext, result, tc.expected)
		}
	}
}
