package platform

import (
	"errors"
	"fmt"
	"net/url"
	"strings"

	"github.com/wailsapp/wails/v3/pkg/application"
)

var (
	// ErrInvalidScheme is returned when a URL uses a disallowed or dangerous protocol scheme.
	ErrInvalidScheme = errors.New("invalid or prohibited URL scheme; only http, https, and mailto are permitted")

	// ErrEmptyURL is returned when an empty URL string is provided.
	ErrEmptyURL = errors.New("URL cannot be empty")
)

// AllowedSchemes contains the authorized external URL schemes per PRD FR-LINK-001 and Section 8.1.
var AllowedSchemes = map[string]bool{
	"http":   true,
	"https":  true,
	"mailto": true,
}

// URLOpener defines the interface for opening validated external URLs in the OS default browser.
type URLOpener interface {
	OpenURL(rawURL string) error
	ValidateURL(rawURL string) (string, error)
}

// BrowserRunner abstracts the OS-level browser open call.
type BrowserRunner interface {
	OpenURL(targetURL string) error
}

// WailsBrowserRunner delegates to Wails v3 application.Get().Browser.OpenURL.
type WailsBrowserRunner struct{}

func (w *WailsBrowserRunner) OpenURL(targetURL string) error {
	app := application.Get()
	if app == nil || app.Browser == nil {
		return errors.New("wails application browser manager is not available")
	}
	return app.Browser.OpenURL(targetURL)
}

// URLService provides URL validation and dispatching to the OS default browser.
type URLService struct {
	runner BrowserRunner
}

// NewURLService creates a new URLService with the default Wails browser runner.
func NewURLService() *URLService {
	return &URLService{
		runner: &WailsBrowserRunner{},
	}
}

// NewURLServiceWithRunner creates a URLService with a custom runner for unit testing.
func NewURLServiceWithRunner(runner BrowserRunner) *URLService {
	return &URLService{
		runner: runner,
	}
}

// ValidateURL validates that rawURL has a safe, authorized scheme and returns the canonical URL string.
func (s *URLService) ValidateURL(rawURL string) (string, error) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" {
		return "", ErrEmptyURL
	}

	// Reject null bytes
	if strings.ContainsRune(trimmed, 0) {
		return "", ErrInvalidScheme
	}

	parsed, err := url.ParseRequestURI(trimmed)
	if err != nil {
		return "", fmt.Errorf("malformed URL: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	if !AllowedSchemes[scheme] {
		return "", fmt.Errorf("%w: %q", ErrInvalidScheme, parsed.Scheme)
	}

	return parsed.String(), nil
}

// OpenURL validates the target URL and launches it in the system default browser.
func (s *URLService) OpenURL(rawURL string) error {
	validatedURL, err := s.ValidateURL(rawURL)
	if err != nil {
		return err
	}

	if s.runner == nil {
		return errors.New("no browser runner configured")
	}

	return s.runner.OpenURL(validatedURL)
}
