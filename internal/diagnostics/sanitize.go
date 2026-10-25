package diagnostics

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

var (
	// Credential and token patterns (case-insensitive)
	bearerPattern    = regexp.MustCompile(`(?i)(Bearer\s+)[A-Za-z0-9_\-\.~+/]+=*`)
	basicAuthPattern = regexp.MustCompile(`(?i)(Basic\s+)[A-Za-z0-9_\-\.~+/]+=*`)
	kvSecretPattern  = regexp.MustCompile(`(?i)(password|passwd|token|api_?key|secret|authorization|access_?token)\s*[:=]\s*["']?([^\s"',;]+)["']?`)
	jwtPattern       = regexp.MustCompile(`\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b`)
	pemKeyPattern    = regexp.MustCompile(`-----BEGIN [A-Z ]+KEY-----[\s\S]*?-----END [A-Z ]+KEY-----`)

	// Sensitive keys that must never appear in structured details or logs
	sensitiveKeys = map[string]bool{
		"password":     true,
		"token":        true,
		"apikey":       true,
		"api_key":      true,
		"secret":       true,
		"auth":         true,
		"credentials":  true,
		"recentfiles":  true,
		"recent_files": true,
		"history":      true,
	}

	// Document content keys that must never be recorded into logs
	documentContentKeys = map[string]bool{
		"content":       true,
		"document":      true,
		"doc":           true,
		"doc_content":   true,
		"body":          true,
		"markdown":      true,
		"markdown_text": true,
		"raw_text":      true,
		"rawtext":       true,
		"raw":           true,
	}
)

// Sanitizer provides path, credential, and document content scrubbing.
type Sanitizer struct {
	homeDir string
}

// NewSanitizer constructs a Sanitizer initialized with the current user's home directory.
func NewSanitizer() *Sanitizer {
	home, err := os.UserHomeDir()
	if err != nil {
		home = ""
	}
	return &Sanitizer{homeDir: home}
}

// NewSanitizerWithHome constructs a Sanitizer with an explicit user home directory for testing.
func NewSanitizerWithHome(home string) *Sanitizer {
	return &Sanitizer{homeDir: home}
}

// SanitizePath redacts user-specific home paths to "~" (preserving privacy across Linux, macOS, and Windows).
func (s *Sanitizer) SanitizePath(path string) string {
	if path == "" {
		return ""
	}

	res := path

	// If home directory is known, substitute it
	if s.homeDir != "" {
		// Clean both paths to have uniform separators
		cleanHome := filepath.Clean(s.homeDir)
		cleanPath := filepath.Clean(path)

		if strings.HasPrefix(cleanPath, cleanHome) {
			rel := strings.TrimPrefix(cleanPath, cleanHome)
			if rel == "" {
				return "~"
			}
			if rel[0] == filepath.Separator || rel[0] == '/' || rel[0] == '\\' {
				rel = rel[1:]
			}
			return filepath.Join("~", rel)
		}
	}

	// Generic heuristics for Linux/macOS: /home/<user>/... or /Users/<user>/...
	genericUnixHome := regexp.MustCompile(`^/(home|Users)/[^/]+(/.*)?$`)
	if genericUnixHome.MatchString(res) {
		res = genericUnixHome.ReplaceAllString(res, "~$2")
	}

	// Generic heuristics for Windows: [A-Za-z]:\Users\<user>\...
	genericWinHome := regexp.MustCompile(`^[A-Za-z]:\\Users\\[^\\]+(\\.*)?$`)
	if genericWinHome.MatchString(res) {
		res = genericWinHome.ReplaceAllString(res, `~$1`)
	}

	return res
}

// SanitizeMessage scrubs credentials, JWTs, PEM blocks, and paths from log messages.
func (s *Sanitizer) SanitizeMessage(msg string) string {
	if msg == "" {
		return ""
	}

	// 1. Redact PEM private keys
	scrubbed := pemKeyPattern.ReplaceAllString(msg, "[REDACTED_PRIVATE_KEY]")

	// 2. Redact JWTs
	scrubbed = jwtPattern.ReplaceAllString(scrubbed, "[REDACTED_JWT_TOKEN]")

	// 3. Redact Bearer and Basic headers
	scrubbed = bearerPattern.ReplaceAllString(scrubbed, "$1[REDACTED]")
	scrubbed = basicAuthPattern.ReplaceAllString(scrubbed, "$1[REDACTED]")

	// 4. Redact key-value secrets (e.g. password=secret)
	scrubbed = kvSecretPattern.ReplaceAllString(scrubbed, "$1=[REDACTED]")

	// 5. Redact paths if user home is present in the message
	if s.homeDir != "" && strings.Contains(scrubbed, s.homeDir) {
		scrubbed = strings.ReplaceAll(scrubbed, s.homeDir, "~")
	}

	return scrubbed
}

// SanitizeFields validates and redacts structured details map:
// - Excludes credential keys
// - Masks document content keys with [REDACTED_DOCUMENT_CONTENT]
// - Redacts paths in string values
// - Enforces maximum length bounds to prevent document body injection
func (s *Sanitizer) SanitizeFields(fields map[string]interface{}) map[string]interface{} {
	if len(fields) == 0 {
		return nil
	}

	cleaned := make(map[string]interface{}, len(fields))

	for k, v := range fields {
		normKey := strings.ToLower(strings.TrimSpace(k))

		// Check sensitive credentials and history
		if sensitiveKeys[normKey] {
			cleaned[k] = "[REDACTED]"
			continue
		}

		// Check document content
		if documentContentKeys[normKey] {
			cleaned[k] = "[REDACTED_DOCUMENT_CONTENT]"
			continue
		}

		// Sanitize string values
		if strVal, ok := v.(string); ok {
			// If string is abnormally large (e.g. > 512 bytes) and not a single path, mask it as potential document content
			if len(strVal) > 512 && !filepath.IsAbs(strVal) {
				cleaned[k] = fmt.Sprintf("[REDACTED_PAYLOAD_LEN_%d]", len(strVal))
				continue
			}

			// Apply path and message sanitization
			cleanedPath := s.SanitizePath(strVal)
			cleaned[k] = s.SanitizeMessage(cleanedPath)
			continue
		}

		cleaned[k] = v
	}

	return cleaned
}
