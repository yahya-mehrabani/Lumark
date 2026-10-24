package platform

import (
	"errors"
	"testing"
)

type mockBrowserRunner struct {
	openedURLs []string
	shouldFail bool
}

func (m *mockBrowserRunner) OpenURL(targetURL string) error {
	if m.shouldFail {
		return errors.New("simulated launch error")
	}
	m.openedURLs = append(m.openedURLs, targetURL)
	return nil
}

func TestURLService_ValidateURL(t *testing.T) {
	service := NewURLServiceWithRunner(&mockBrowserRunner{})

	tests := []struct {
		name        string
		input       string
		expectError bool
		expectedURL string
	}{
		{
			name:        "Valid HTTPS URL",
			input:       "https://example.com/guide?v=1",
			expectError: false,
			expectedURL: "https://example.com/guide?v=1",
		},
		{
			name:        "Valid HTTP URL",
			input:       "http://docs.example.org",
			expectError: false,
			expectedURL: "http://docs.example.org",
		},
		{
			name:        "Valid mailto URL",
			input:       "mailto:support@example.com?subject=Help",
			expectError: false,
			expectedURL: "mailto:support@example.com?subject=Help",
		},
		{
			name:        "Prohibited javascript: protocol",
			input:       "javascript:alert(1)",
			expectError: true,
		},
		{
			name:        "Prohibited data: protocol",
			input:       "data:text/html,<script>alert(1)</script>",
			expectError: true,
		},
		{
			name:        "Prohibited file: protocol",
			input:       "file:///etc/passwd",
			expectError: true,
		},
		{
			name:        "Prohibited custom unknown scheme",
			input:       "customapp://launch?cmd=calc",
			expectError: true,
		},
		{
			name:        "Empty string",
			input:       "   ",
			expectError: true,
		},
		{
			name:        "Null byte in URL",
			input:       "https://example.com\x00/evil",
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := service.ValidateURL(tt.input)
			if tt.expectError {
				if err == nil {
					t.Errorf("ValidateURL(%q) succeeded; expected error", tt.input)
				}
			} else {
				if err != nil {
					t.Fatalf("ValidateURL(%q) unexpected error: %v", tt.input, err)
				}
				if res != tt.expectedURL {
					t.Errorf("ValidateURL(%q) = %q, want %q", tt.input, res, tt.expectedURL)
				}
			}
		})
	}
}

func TestURLService_OpenURL(t *testing.T) {
	mock := &mockBrowserRunner{}
	service := NewURLServiceWithRunner(mock)

	// Valid link opens via mock runner
	err := service.OpenURL("https://example.com")
	if err != nil {
		t.Fatalf("OpenURL unexpected error: %v", err)
	}
	if len(mock.openedURLs) != 1 || mock.openedURLs[0] != "https://example.com" {
		t.Errorf("mock openedURLs = %v, want ['https://example.com']", mock.openedURLs)
	}

	// Malicious link is blocked before calling runner
	err = service.OpenURL("javascript:void(0)")
	if err == nil {
		t.Errorf("OpenURL(javascript:...) succeeded; expected ErrInvalidScheme")
	}
	if len(mock.openedURLs) != 1 {
		t.Errorf("runner should not have been called for dangerous URL, count = %d", len(mock.openedURLs))
	}
}
