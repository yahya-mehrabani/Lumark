package documents

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// generateMarkdownContent generates a synthetic Markdown document of approximately targetBytes.
func generateMarkdownContent(targetBytes int) []byte {
	var builder strings.Builder
	builder.Grow(targetBytes + 1024)

	builder.WriteString("# Synthetic Benchmark Document\n\n")
	builder.WriteString("This document is generated dynamically for performance benchmarking against PRD Section 12.1.\n\n")

	paragraph := "Lumark is an offline-capable, cross-platform Markdown document viewer designed for technical writers and developers. It supports CommonMark, GitHub Flavored Markdown, Bidirectional text (Arabic/Persian), LaTeX math expressions via KaTeX, and Mermaid diagrams.\n\n"
	codeBlock := "```go\nfunc ProcessMarkdown(content string) (int, error) {\n\tlines := strings.Split(content, \"\\n\")\n\treturn len(lines), nil\n}\n```\n\n"
	table := "| Feature | Status | Notes |\n| :--- | :---: | ---: |\n| Offline First | Active | No remote dependencies |\n| KaTeX Math | Bundled | Local WOFF2 fonts |\n| Mermaid | Safe | Isolated rendering |\n\n"

	counter := 1
	for builder.Len() < targetBytes {
		fmt.Fprintf(&builder, "## Section %d: System Architecture & Performance\n\n", counter)
		builder.WriteString(paragraph)
		builder.WriteString(table)
		builder.WriteString(codeBlock)
		counter++
	}

	return []byte(builder.String()[:targetBytes])
}

func BenchmarkDecodeUTF8_1MiB(b *testing.B) {
	data := generateMarkdownContent(1024 * 1024)
	b.ResetTimer()
	b.SetBytes(int64(len(data)))

	for b.Loop() {
		_, hasErr := DecodeUTF8(data)
		if hasErr {
			b.Fatal("unexpected encoding error")
		}
	}
}

func BenchmarkDecodeUTF8_5MiB(b *testing.B) {
	data := generateMarkdownContent(5 * 1024 * 1024)
	b.ResetTimer()
	b.SetBytes(int64(len(data)))

	for b.Loop() {
		_, hasErr := DecodeUTF8(data)
		if hasErr {
			b.Fatal("unexpected encoding error")
		}
	}
}

func BenchmarkReadDocument_1MiB(b *testing.B) {
	tempDir := b.TempDir()
	filePath := filepath.Join(tempDir, "bench_1mib.md")
	data := generateMarkdownContent(1024 * 1024)
	if err := os.WriteFile(filePath, data, 0o600); err != nil {
		b.Fatalf("failed to write bench file: %v", err)
	}

	svc := NewService()
	b.ResetTimer()
	b.SetBytes(int64(len(data)))

	for b.Loop() {
		dto, err := svc.ReadDocument(filePath)
		if err != nil {
			b.Fatalf("ReadDocument failed: %v", err)
		}
		if dto.FileSizeBytes != int64(len(data)) {
			b.Fatalf("expected file size %d, got %d", len(data), dto.FileSizeBytes)
		}
	}
}

func BenchmarkReadDocument_5MiB(b *testing.B) {
	tempDir := b.TempDir()
	filePath := filepath.Join(tempDir, "bench_5mib.md")
	data := generateMarkdownContent(5 * 1024 * 1024)
	if err := os.WriteFile(filePath, data, 0o600); err != nil {
		b.Fatalf("failed to write bench file: %v", err)
	}

	svc := NewService()
	b.ResetTimer()
	b.SetBytes(int64(len(data)))

	for b.Loop() {
		dto, err := svc.ReadDocument(filePath)
		if err != nil {
			b.Fatalf("ReadDocument failed: %v", err)
		}
		if dto.FileSizeBytes != int64(len(data)) {
			b.Fatalf("expected file size %d, got %d", len(data), dto.FileSizeBytes)
		}
	}
}

func TestPerformanceTargets_BackendRead(t *testing.T) {
	tempDir := t.TempDir()
	svc := NewService()

	// 1 MiB target: < 1.0s (backend read target < 200ms)
	t.Run("1 MiB Document Read < 200ms", func(t *testing.T) {
		filePath := filepath.Join(tempDir, "target_1mib.md")
		data := generateMarkdownContent(1024 * 1024)
		if err := os.WriteFile(filePath, data, 0o600); err != nil {
			t.Fatalf("failed to write test file: %v", err)
		}

		start := time.Now()
		dto, err := svc.ReadDocument(filePath)
		elapsed := time.Since(start)

		if err != nil {
			t.Fatalf("ReadDocument failed: %v", err)
		}
		if elapsed > 200*time.Millisecond {
			t.Errorf("1 MiB read took %v; expected < 200ms", elapsed)
		}
		if dto.FileSizeBytes != 1024*1024 {
			t.Errorf("expected 1 MiB size, got %d", dto.FileSizeBytes)
		}
		t.Logf("1 MiB read duration: %v (target < 200ms)", elapsed)
	})

	// 5 MiB target: < 3.0s (backend read target < 500ms)
	t.Run("5 MiB Document Read < 500ms", func(t *testing.T) {
		filePath := filepath.Join(tempDir, "target_5mib.md")
		data := generateMarkdownContent(5 * 1024 * 1024)
		if err := os.WriteFile(filePath, data, 0o600); err != nil {
			t.Fatalf("failed to write test file: %v", err)
		}

		start := time.Now()
		dto, err := svc.ReadDocument(filePath)
		elapsed := time.Since(start)

		if err != nil {
			t.Fatalf("ReadDocument failed: %v", err)
		}
		if elapsed > 500*time.Millisecond {
			t.Errorf("5 MiB read took %v; expected < 500ms", elapsed)
		}
		if dto.FileSizeBytes != 5*1024*1024 {
			t.Errorf("expected 5 MiB size, got %d", dto.FileSizeBytes)
		}
		t.Logf("5 MiB read duration: %v (target < 500ms)", elapsed)
	})
}
