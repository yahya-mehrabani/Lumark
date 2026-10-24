package dialogs

import (
	"errors"
	"strings"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type mockDialogRunner struct {
	singlePath    string
	singleErr     error
	multiPaths    []string
	multiErr      error
	lastOpts      application.OpenFileDialogOptions
	singleInvoked bool
	multiInvoked  bool
}

func (m *mockDialogRunner) PromptForSingleSelection(opts application.OpenFileDialogOptions) (string, error) {
	m.singleInvoked = true
	m.lastOpts = opts
	return m.singlePath, m.singleErr
}

func (m *mockDialogRunner) PromptForMultipleSelection(opts application.OpenFileDialogOptions) ([]string, error) {
	m.multiInvoked = true
	m.lastOpts = opts
	return m.multiPaths, m.multiErr
}

func TestNativeFileDialog(t *testing.T) {
	t.Run("single file selection success", func(t *testing.T) {
		runner := &mockDialogRunner{
			singlePath: "/home/user/notes/test.md",
		}
		service := NewServiceWithRunner(runner)

		path, err := service.OpenFile()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if path != "/home/user/notes/test.md" {
			t.Errorf("expected '/home/user/notes/test.md', got %q", path)
		}
		if !runner.singleInvoked {
			t.Errorf("expected PromptForSingleSelection to be invoked")
		}
		if runner.lastOpts.AllowsMultipleSelection {
			t.Errorf("expected AllowsMultipleSelection to be false for single selection")
		}
		if !runner.lastOpts.CanChooseFiles {
			t.Errorf("expected CanChooseFiles to be true")
		}
		if runner.lastOpts.CanChooseDirectories {
			t.Errorf("expected CanChooseDirectories to be false")
		}
	})

	t.Run("single file selection canceled by user", func(t *testing.T) {
		runner := &mockDialogRunner{
			singlePath: "",
			singleErr:  nil,
		}
		service := NewServiceWithRunner(runner)

		path, err := service.OpenFile()
		if err != nil {
			t.Fatalf("unexpected error on cancellation: %v", err)
		}
		if path != "" {
			t.Errorf("expected empty string on cancel, got %q", path)
		}
	})

	t.Run("single file selection runner error", func(t *testing.T) {
		expectedErr := errors.New("OS dialog failed")
		runner := &mockDialogRunner{
			singleErr: expectedErr,
		}
		service := NewServiceWithRunner(runner)

		path, err := service.OpenFile()
		if !errors.Is(err, expectedErr) {
			t.Fatalf("expected error %v, got %v", expectedErr, err)
		}
		if path != "" {
			t.Errorf("expected empty path on error, got %q", path)
		}
	})

	t.Run("multiple files selection success", func(t *testing.T) {
		expectedPaths := []string{
			"/home/user/doc1.md",
			"/home/user/doc2.markdown",
			"/home/user/doc3.mkd",
		}
		runner := &mockDialogRunner{
			multiPaths: expectedPaths,
		}
		service := NewServiceWithRunner(runner)

		paths, err := service.OpenFiles()
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(paths) != 3 {
			t.Fatalf("expected 3 paths, got %d", len(paths))
		}
		for i, p := range paths {
			if p != expectedPaths[i] {
				t.Errorf("path[%d]: expected %q, got %q", i, expectedPaths[i], p)
			}
		}
		if !runner.multiInvoked {
			t.Errorf("expected PromptForMultipleSelection to be invoked")
		}
		if !runner.lastOpts.AllowsMultipleSelection {
			t.Errorf("expected AllowsMultipleSelection to be true for multi selection")
		}
	})

	t.Run("multiple files selection canceled by user", func(t *testing.T) {
		runner := &mockDialogRunner{
			multiPaths: nil,
			multiErr:   nil,
		}
		service := NewServiceWithRunner(runner)

		paths, err := service.OpenFiles()
		if err != nil {
			t.Fatalf("unexpected error on cancel: %v", err)
		}
		if len(paths) != 0 {
			t.Errorf("expected 0 paths on cancel, got %d", len(paths))
		}
	})

	t.Run("default markdown filters validation", func(t *testing.T) {
		filters := DefaultMarkdownFilters()
		if len(filters) < 2 {
			t.Fatalf("expected at least 2 filters (Markdown + All Files), got %d", len(filters))
		}

		mdFilter := filters[0]
		expectedExtensions := []string{"*.md", "*.markdown", "*.mdown", "*.mkd"}
		for _, ext := range expectedExtensions {
			if !strings.Contains(mdFilter.Pattern, ext) {
				t.Errorf("filter pattern %q missing extension %s", mdFilter.Pattern, ext)
			}
		}

		allFilter := filters[1]
		if allFilter.Pattern != "*.*" {
			t.Errorf("expected all files pattern '*.*', got %q", allFilter.Pattern)
		}
	})

	t.Run("custom title configuration", func(t *testing.T) {
		runner := &mockDialogRunner{
			singlePath: "/test/file.md",
		}
		service := NewServiceWithRunner(runner)

		_, err := service.OpenFileDialog("Custom Open Title")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if runner.lastOpts.Title != "Custom Open Title" {
			t.Errorf("expected title 'Custom Open Title', got %q", runner.lastOpts.Title)
		}
	})

	t.Run("wails runner without running application returns ErrNoApplication", func(t *testing.T) {
		wailsRunner := &WailsDialogRunner{}
		opts := application.OpenFileDialogOptions{}

		_, err := wailsRunner.PromptForSingleSelection(opts)
		if !errors.Is(err, ErrNoApplication) {
			t.Errorf("expected ErrNoApplication, got %v", err)
		}

		_, err = wailsRunner.PromptForMultipleSelection(opts)
		if !errors.Is(err, ErrNoApplication) {
			t.Errorf("expected ErrNoApplication, got %v", err)
		}
	})
}
