package documents

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestUTF8Reader(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	t.Run("valid UTF-8 without BOM", func(t *testing.T) {
		samples := []struct {
			name     string
			rawText  string
		}{
			{"plain ascii", "# Document Title\n\nParagraph text."},
			{"persian unicode", "# مستند فارسی\n\nاین یک پاراگراف آزمایشی است."},
			{"german umlauts", "# Übergrößen & Äpfel\n\nGröße und Öl."},
			{"emoji unicode", "# Icons & Emoji 🚀 ✨ 🎉\n\nDone!"},
		}

		for _, tc := range samples {
			t.Run(tc.name, func(t *testing.T) {
				decoded, hasErr := DecodeUTF8([]byte(tc.rawText))
				if hasErr {
					t.Errorf("expected no encoding error for %s, got hasErr=true", tc.name)
				}
				if decoded != tc.rawText {
					t.Errorf("expected %q, got %q", tc.rawText, decoded)
				}
			})
		}
	})

	t.Run("BOM stripping", func(t *testing.T) {
		t.Run("text with UTF-8 BOM prefix", func(t *testing.T) {
			rawWithBOM := append([]byte{0xEF, 0xBB, 0xBF}, []byte("# Title with BOM")...)
			decoded, hasErr := DecodeUTF8(rawWithBOM)
			if hasErr {
				t.Errorf("expected no encoding errors, got hasErr=true")
			}
			if strings.HasPrefix(decoded, "\uFEFF") {
				t.Errorf("decoded text still has BOM character prefix")
			}
			if decoded != "# Title with BOM" {
				t.Errorf("expected %q, got %q", "# Title with BOM", decoded)
			}
		})

		t.Run("only BOM without text", func(t *testing.T) {
			onlyBOM := []byte{0xEF, 0xBB, 0xBF}
			decoded, hasErr := DecodeUTF8(onlyBOM)
			if hasErr {
				t.Errorf("expected no encoding error for BOM-only, got hasErr=true")
			}
			if decoded != "" {
				t.Errorf("expected empty string, got %q", decoded)
			}
		})
	})

	t.Run("invalid UTF-8 replacement with U+FFFD", func(t *testing.T) {
		corrupted := []byte("Header \xFF\xFE content \x80")
		decoded, hasErr := DecodeUTF8(corrupted)
		if !hasErr {
			t.Errorf("expected hasErr=true for corrupted UTF-8 bytes")
		}
		if !strings.Contains(decoded, "\uFFFD") {
			t.Errorf("expected decoded content to contain replacement character U+FFFD (\\uFFFD), got %q", decoded)
		}
		if !strings.HasPrefix(decoded, "Header ") {
			t.Errorf("expected valid ASCII prefix to be preserved, got %q", decoded)
		}
	})

	t.Run("ReadDocument integration with BOM and invalid bytes", func(t *testing.T) {
		// Test file with BOM
		bomFile := filepath.Join(tempDir, "bom_document.md")
		bomData := append([]byte{0xEF, 0xBB, 0xBF}, []byte("# Clean Header\n\nContent body.")...)
		if err := os.WriteFile(bomFile, bomData, 0o600); err != nil {
			t.Fatalf("failed to write test file: %v", err)
		}

		dto, err := svc.ReadDocument(bomFile)
		if err != nil {
			t.Fatalf("ReadDocument failed: %v", err)
		}
		if dto.Content != "# Clean Header\n\nContent body." {
			t.Errorf("expected BOM stripped from content, got %q", dto.Content)
		}
		if dto.HasEncodingErrors {
			t.Errorf("expected HasEncodingErrors=false for BOM file")
		}
		if dto.FileSizeBytes != int64(len(bomData)) {
			t.Errorf("expected FileSizeBytes=%d, got %d", len(bomData), dto.FileSizeBytes)
		}

		// Test file with corrupted UTF-8 bytes
		corruptedFile := filepath.Join(tempDir, "corrupted.md")
		corruptedData := []byte("# Corrupted \xFF Section")
		if err := os.WriteFile(corruptedFile, corruptedData, 0o600); err != nil {
			t.Fatalf("failed to write corrupted file: %v", err)
		}

		dto, err = svc.ReadDocument(corruptedFile)
		if err != nil {
			t.Fatalf("ReadDocument failed on corrupted file: %v", err)
		}
		if !dto.HasEncodingErrors {
			t.Errorf("expected HasEncodingErrors=true for corrupted file")
		}
		if !strings.Contains(dto.Content, "\uFFFD") {
			t.Errorf("expected content to contain \\uFFFD, got %q", dto.Content)
		}
	})
}
