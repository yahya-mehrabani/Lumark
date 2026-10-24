package dialogs

import (
	"github.com/wailsapp/wails/v3/pkg/application"
)

// DialogService defines the operations for opening files via native OS dialogs.
type DialogService interface {
	OpenFile() (string, error)
	OpenFiles() ([]string, error)
	OpenFileDialog(title string) (string, error)
	OpenMultipleFilesDialog(title string) ([]string, error)
}

// Service provides native file dialog operations.
type Service struct {
	runner  DialogRunner
	filters []application.FileFilter
}

// NewService creates a new Service with standard WailsDialogRunner and default Markdown filters.
func NewService() *Service {
	return &Service{
		runner:  &WailsDialogRunner{},
		filters: DefaultMarkdownFilters(),
	}
}

// NewServiceWithRunner creates a Service with a custom DialogRunner and optional custom filters.
func NewServiceWithRunner(runner DialogRunner, filters ...application.FileFilter) *Service {
	f := filters
	if len(f) == 0 {
		f = DefaultMarkdownFilters()
	}
	return &Service{
		runner:  runner,
		filters: f,
	}
}

// Ensure Service implements DialogService at compile time.
var _ DialogService = (*Service)(nil)

// OpenFile opens a native file dialog for selecting a single Markdown file.
func (s *Service) OpenFile() (string, error) {
	return s.OpenFileDialog("Open Markdown File")
}

// OpenFiles opens a native file dialog for selecting one or more Markdown files.
func (s *Service) OpenFiles() ([]string, error) {
	return s.OpenMultipleFilesDialog("Open Markdown Files")
}

// OpenFileDialog prompts the user to select a single file with custom title.
// If the user cancels the dialog, it returns an empty string and a nil error.
func (s *Service) OpenFileDialog(title string) (string, error) {
	if title == "" {
		title = "Open Markdown File"
	}

	opts := application.OpenFileDialogOptions{
		Title:                   title,
		Filters:                 s.filters,
		CanChooseFiles:          true,
		CanChooseDirectories:    false,
		ShowHiddenFiles:         false,
		ResolvesAliases:         true,
		AllowsMultipleSelection: false,
	}

	path, err := s.runner.PromptForSingleSelection(opts)
	if err != nil {
		return "", err
	}
	return path, nil
}

// OpenMultipleFilesDialog prompts the user to select multiple files with custom title.
// If the user cancels the dialog, it returns an empty slice and a nil error.
func (s *Service) OpenMultipleFilesDialog(title string) ([]string, error) {
	if title == "" {
		title = "Open Markdown Files"
	}

	opts := application.OpenFileDialogOptions{
		Title:                   title,
		Filters:                 s.filters,
		CanChooseFiles:          true,
		CanChooseDirectories:    false,
		ShowHiddenFiles:         false,
		ResolvesAliases:         true,
		AllowsMultipleSelection: true,
	}

	paths, err := s.runner.PromptForMultipleSelection(opts)
	if err != nil {
		return nil, err
	}
	return paths, nil
}
