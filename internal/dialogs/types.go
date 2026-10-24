package dialogs

import (
	"errors"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// ErrNoApplication is returned when a dialog is invoked without an active Wails application.
var ErrNoApplication = errors.New("wails application instance is not initialized")

// DialogRunner abstracts the platform dialog execution for testability and portability.
type DialogRunner interface {
	PromptForSingleSelection(opts application.OpenFileDialogOptions) (string, error)
	PromptForMultipleSelection(opts application.OpenFileDialogOptions) ([]string, error)
}

// WailsDialogRunner implements DialogRunner using the Wails v3 DialogManager.
type WailsDialogRunner struct{}

// PromptForSingleSelection prompts the user to select a single file using Wails DialogManager.
func (r *WailsDialogRunner) PromptForSingleSelection(opts application.OpenFileDialogOptions) (string, error) {
	app := application.Get()
	if app == nil {
		return "", ErrNoApplication
	}
	dialog := app.Dialog.OpenFileWithOptions(&opts)
	return dialog.PromptForSingleSelection()
}

// PromptForMultipleSelection prompts the user to select multiple files using Wails DialogManager.
func (r *WailsDialogRunner) PromptForMultipleSelection(opts application.OpenFileDialogOptions) ([]string, error) {
	app := application.Get()
	if app == nil {
		return nil, ErrNoApplication
	}
	dialog := app.Dialog.OpenFileWithOptions(&opts)
	return dialog.PromptForMultipleSelection()
}

// DefaultMarkdownFilters returns the extension filters prioritizing Markdown files per FR-OPEN-001.
func DefaultMarkdownFilters() []application.FileFilter {
	return []application.FileFilter{
		{
			DisplayName: "Markdown Files (*.md, *.markdown, *.mdown, *.mkd)",
			Pattern:     "*.md;*.markdown;*.mdown;*.mkd",
		},
		{
			DisplayName: "All Files (*.*)",
			Pattern:     "*.*",
		},
	}
}
