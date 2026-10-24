package instance

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestCLIArgParsing(t *testing.T) {
	tempDir := t.TempDir()

	t.Run("EmptyArgs", func(t *testing.T) {
		res, err := ParseCLI(tempDir, []string{})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Files) != 0 {
			t.Errorf("expected 0 files, got %d", len(res.Files))
		}
		if res.Help || res.Version {
			t.Errorf("expected Help=false and Version=false")
		}
		if len(res.Diagnostics) != 0 {
			t.Errorf("expected 0 diagnostics, got %v", res.Diagnostics)
		}
	})

	t.Run("SingleFileRelative", func(t *testing.T) {
		res, err := ParseCLI(tempDir, []string{"README.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Files) != 1 {
			t.Fatalf("expected 1 file, got %d", len(res.Files))
		}
		expected := filepath.Join(tempDir, "README.md")
		if res.Files[0] != expected {
			t.Errorf("expected %q, got %q", expected, res.Files[0])
		}
	})

	t.Run("MultipleFilesRelative", func(t *testing.T) {
		args := []string{"doc1.md", "notes/doc2.markdown", "specs/doc3.mdown"}
		res, err := ParseCLI(tempDir, args)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Files) != 3 {
			t.Fatalf("expected 3 files, got %d", len(res.Files))
		}
		expected0 := filepath.Join(tempDir, "doc1.md")
		expected1 := filepath.Join(tempDir, "notes", "doc2.markdown")
		expected2 := filepath.Join(tempDir, "specs", "doc3.mdown")
		if res.Files[0] != expected0 || res.Files[1] != expected1 || res.Files[2] != expected2 {
			t.Errorf("mismatched files: got %v", res.Files)
		}
	})

	t.Run("AbsolutePaths", func(t *testing.T) {
		absPath := filepath.Join(tempDir, "absolute", "test.md")
		res, err := ParseCLI(tempDir, []string{absPath})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Files) != 1 || res.Files[0] != absPath {
			t.Errorf("expected %q, got %v", absPath, res.Files)
		}
	})

	t.Run("RelativeWithDotDot", func(t *testing.T) {
		subDir := filepath.Join(tempDir, "sub", "deep")
		err := os.MkdirAll(subDir, 0755)
		if err != nil {
			t.Fatalf("failed to create test directory: %v", err)
		}
		res, err := ParseCLI(subDir, []string{"../../file.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected := filepath.Join(tempDir, "file.md")
		if len(res.Files) != 1 || res.Files[0] != expected {
			t.Errorf("expected %q, got %v", expected, res.Files)
		}
	})

	t.Run("PathsWithSpaces", func(t *testing.T) {
		arg := "My Documents/My Notes 2026.md"
		res, err := ParseCLI(tempDir, []string{arg})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected := filepath.Join(tempDir, "My Documents", "My Notes 2026.md")
		if len(res.Files) != 1 || res.Files[0] != expected {
			t.Errorf("expected %q, got %v", expected, res.Files)
		}
	})

	t.Run("UnicodePaths", func(t *testing.T) {
		unicodeArgs := []string{
			"документы/план.md",
			"ノート/設計.markdown",
			"مستندات/ملاحظات.md",
		}
		res, err := ParseCLI(tempDir, unicodeArgs)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Files) != 3 {
			t.Fatalf("expected 3 files, got %d", len(res.Files))
		}
		for i, raw := range unicodeArgs {
			expected := filepath.Join(tempDir, raw)
			if res.Files[i] != expected {
				t.Errorf("expected %q, got %q", expected, res.Files[i])
			}
		}
	})

	t.Run("HelpFlag", func(t *testing.T) {
		flags := []string{"-h", "--help", "-help"}
		for _, f := range flags {
			res, err := ParseCLI(tempDir, []string{f})
			if err != nil {
				t.Fatalf("unexpected error with flag %s: %v", f, err)
			}
			if !res.Help {
				t.Errorf("expected Help=true for flag %s", f)
			}
		}
	})

	t.Run("VersionFlag", func(t *testing.T) {
		flags := []string{"-v", "--version", "-version"}
		for _, f := range flags {
			res, err := ParseCLI(tempDir, []string{f})
			if err != nil {
				t.Fatalf("unexpected error with flag %s: %v", f, err)
			}
			if !res.Version {
				t.Errorf("expected Version=true for flag %s", f)
			}
		}
	})

	t.Run("UnrecognizedFlags", func(t *testing.T) {
		res, err := ParseCLI(tempDir, []string{"--unknown-flag", "doc.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(res.Diagnostics) != 1 {
			t.Errorf("expected 1 diagnostic, got %d", len(res.Diagnostics))
		}
		if len(res.Files) != 1 {
			t.Errorf("expected 1 file, got %d", len(res.Files))
		}
	})

	t.Run("DefaultWorkingDirResolution", func(t *testing.T) {
		cwd, err := os.Getwd()
		if err != nil {
			t.Fatalf("getwd failed: %v", err)
		}
		res, err := ParseCLI("", []string{"sample.md"})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected := filepath.Join(cwd, "sample.md")
		if len(res.Files) != 1 || res.Files[0] != expected {
			t.Errorf("expected %q, got %v", expected, res.Files)
		}
	})

	t.Run("WindowsStyleDriveLetter", func(t *testing.T) {
		drivePath := `C:\Users\tester\Documents\test.md`
		normalized, err := NormalizePath(tempDir, drivePath)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if runtime.GOOS == "windows" {
			expected := filepath.Clean(drivePath)
			if normalized != expected {
				t.Errorf("expected %q, got %q", expected, normalized)
			}
		} else {
			// On non-windows, our NormalizePath cleanly preserves the Windows drive letter and path
			expected := filepath.Clean(drivePath)
			if normalized != expected {
				t.Errorf("expected %q, got %q", expected, normalized)
			}
		}
	})
}
