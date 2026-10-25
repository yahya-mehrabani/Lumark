package platform

import (
	"errors"
	"testing"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type mockLoader struct {
	lastPath   string
	shouldFail bool
}

func (m *mockLoader) LoadFile(path string) (interface{}, error) {
	m.lastPath = path
	if m.shouldFail {
		return nil, errors.New("load error")
	}
	return map[string]string{"path": path}, nil
}

type mockWindow struct {
	focused   bool
	shown     bool
	restored  bool
	minimised bool
}

func (w *mockWindow) Focus() { w.focused = true }
func (w *mockWindow) Show() application.Window {
	w.shown = true
	return nil
}
func (w *mockWindow) Restore() {
	w.restored = true
	w.minimised = false
}
func (w *mockWindow) IsMinimised() bool { return w.minimised }

func TestHandleMacOpenFile(t *testing.T) {
	loader := &mockLoader{}
	window := &mockWindow{minimised: true}

	HandleMacOpenFile("test.md", nil, loader, window)

	if loader.lastPath == "" {
		t.Fatalf("expected lastPath to be populated, got empty string")
	}
	if !window.restored {
		t.Errorf("expected window to be restored")
	}
	if !window.shown {
		t.Errorf("expected window to be shown")
	}
	if !window.focused {
		t.Errorf("expected window to be focused")
	}
}

func TestHandleMacOpenFileEmpty(t *testing.T) {
	loader := &mockLoader{}
	window := &mockWindow{}

	HandleMacOpenFile("", nil, loader, window)
	if loader.lastPath != "" {
		t.Errorf("expected no loader call for empty path")
	}
}

func TestHandleMacOpenFileError(t *testing.T) {
	loader := &mockLoader{shouldFail: true}
	window := &mockWindow{}

	HandleMacOpenFile("bad.md", nil, loader, window)
	if loader.lastPath == "" {
		t.Errorf("expected loader to be called even on failure")
	}
	if !window.shown {
		t.Errorf("expected window to still be shown")
	}
}
