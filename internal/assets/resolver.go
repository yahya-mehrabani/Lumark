package assets

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	// ErrForbidden is returned when a path traversal attempt is detected or the path resolves outside the root directory.
	ErrForbidden = errors.New("access forbidden: path traversal detected or path outside root directory")

	// ErrNotFound is returned when the requested asset does not exist within the allowed root directory.
	ErrNotFound = errors.New("asset not found")

	// ErrInvalidMethod is returned when an HTTP method other than GET or HEAD is received.
	ErrInvalidMethod = errors.New("method not allowed: only GET and HEAD are permitted")

	// ErrEmptyRoot is returned when the root directory has not been configured.
	ErrEmptyRoot = errors.New("root directory not configured")

	// ErrNotFile is returned when the requested resource is a directory rather than a regular file.
	ErrNotFile = errors.New("access forbidden: requested resource is not a regular file")
)

// defaultMIMETypes provides standard fallback MIME mappings for image assets.
var defaultMIMETypes = map[string]string{
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".svg":  "image/svg+xml",
	".webp": "image/webp",
	".avif": "image/avif",
	".bmp":  "image/bmp",
	".ico":  "image/x-icon",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
}

// DetectMIMEType determines the Content-Type of an asset from its filename extension and content bytes.
func DetectMIMEType(filePath string, data []byte) string {
	ext := strings.ToLower(filepath.Ext(filePath))
	if mt, ok := defaultMIMETypes[ext]; ok {
		return mt
	}
	if mt := mime.TypeByExtension(ext); mt != "" {
		return mt
	}
	if len(data) > 0 {
		return http.DetectContentType(data)
	}
	return "application/octet-stream"
}

// ScopedResolver resolves and serves local assets strictly within an authorized document directory boundary.
type ScopedResolver struct {
	mu      sync.RWMutex
	rootDir string
	prefix  string
}

// NewScopedResolver creates a new ScopedResolver with the specified document root directory.
func NewScopedResolver(rootDir string) (*ScopedResolver, error) {
	r := &ScopedResolver{
		prefix: "/local-asset",
	}
	if rootDir != "" {
		if err := r.SetRootDir(rootDir); err != nil {
			return nil, err
		}
	}
	return r, nil
}

// SetRootDir updates the active document root directory in a thread-safe manner.
func (s *ScopedResolver) SetRootDir(rootDir string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if rootDir == "" {
		s.rootDir = ""
		return nil
	}

	absPath, err := filepath.Abs(rootDir)
	if err != nil {
		return fmt.Errorf("failed to resolve absolute path for root directory: %w", err)
	}

	// Evaluate symlinks on root directory so path comparisons are canonical
	if realPath, err := filepath.EvalSymlinks(absPath); err == nil {
		absPath = realPath
	}

	s.rootDir = filepath.Clean(absPath)
	return nil
}

// RootDir returns the currently configured root directory.
func (s *ScopedResolver) RootDir() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.rootDir
}

// SetPrefix updates the URL prefix used to identify local asset requests.
func (s *ScopedResolver) SetPrefix(prefix string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.prefix = prefix
}

// Prefix returns the configured URL prefix.
func (s *ScopedResolver) Prefix() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.prefix
}

// ResolvePath checks document directory boundaries and returns the canonical absolute filesystem path
// and MIME type for the requested relative path. It returns ErrForbidden if path traversal or escape is detected.
func (s *ScopedResolver) ResolvePath(relPath string) (string, string, error) {
	s.mu.RLock()
	rootDir := s.rootDir
	s.mu.RUnlock()

	if rootDir == "" {
		return "", "", ErrEmptyRoot
	}

	// 1. Strip query string or fragment if present
	if idx := strings.IndexAny(relPath, "?#"); idx != -1 {
		relPath = relPath[:idx]
	}

	// 2. Reject paths containing null bytes
	if strings.ContainsRune(relPath, 0) {
		return "", "", ErrForbidden
	}

	// 3. Reject absolute paths, Windows drive prefixes, UNC paths, and leading slashes
	// Check Windows drive letter: "C:", "d:", etc.
	if len(relPath) >= 2 && relPath[1] == ':' &&
		((relPath[0] >= 'a' && relPath[0] <= 'z') || (relPath[0] >= 'A' && relPath[0] <= 'Z')) {
		return "", "", ErrForbidden
	}

	// Check UNC path "\\..." or "//..."
	if strings.HasPrefix(relPath, "\\\\") || strings.HasPrefix(relPath, "//") {
		return "", "", ErrForbidden
	}

	// Cross-platform check: normalize slashes to forward slashes to inspect regardless of host OS
	slashPath := filepath.ToSlash(relPath)
	if strings.HasPrefix(slashPath, "/") {
		return "", "", ErrForbidden
	}

	// Clean forward-slash representation to check for escapes
	cleanSlash := filepath.ToSlash(filepath.Clean(slashPath))
	if cleanSlash == ".." || strings.HasPrefix(cleanSlash, "../") {
		return "", "", ErrForbidden
	}

	cleanInput := filepath.Clean(relPath)
	if filepath.IsAbs(relPath) || filepath.IsAbs(cleanInput) {
		return "", "", ErrForbidden
	}
	if filepath.VolumeName(cleanInput) != "" || filepath.VolumeName(relPath) != "" {
		return "", "", ErrForbidden
	}
	if strings.HasPrefix(relPath, "/") || strings.HasPrefix(relPath, "\\") {
		return "", "", ErrForbidden
	}
	if strings.HasPrefix(cleanInput, "/") || strings.HasPrefix(cleanInput, "\\") {
		return "", "", ErrForbidden
	}

	// 4. Reject explicit parent directory traversal
	if cleanInput == ".." ||
		strings.HasPrefix(cleanInput, ".."+string(filepath.Separator)) ||
		strings.HasPrefix(cleanInput, "../") ||
		strings.HasPrefix(cleanInput, "..\\") {
		return "", "", ErrForbidden
	}

	// 5. Construct candidate target path
	targetPath := filepath.Clean(filepath.Join(rootDir, cleanInput))

	// 6. Verify targetPath remains within rootDir boundary using filepath.Rel
	rel, err := filepath.Rel(rootDir, targetPath)
	if err != nil || rel == ".." ||
		strings.HasPrefix(rel, ".."+string(filepath.Separator)) ||
		strings.HasPrefix(rel, "../") ||
		strings.HasPrefix(rel, "..\\") {
		return "", "", ErrForbidden
	}

	// 7. Check file existence and verify target is not a directory
	info, err := os.Stat(targetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("failed to access asset: %w", err)
	}

	if info.IsDir() {
		return "", "", ErrNotFile
	}

	// 8. Evaluate symlinks to guard against symlinks pointing outside rootDir
	realTarget, err := filepath.EvalSymlinks(targetPath)
	if err != nil {
		if os.IsNotExist(err) {
			return "", "", ErrNotFound
		}
		return "", "", fmt.Errorf("failed to evaluate symlinks: %w", err)
	}

	realRel, err := filepath.Rel(rootDir, realTarget)
	if err != nil || realRel == ".." ||
		strings.HasPrefix(realRel, ".."+string(filepath.Separator)) ||
		strings.HasPrefix(realRel, "../") ||
		strings.HasPrefix(realRel, "..\\") {
		return "", "", ErrForbidden
	}

	mimeType := DetectMIMEType(realTarget, nil)
	return realTarget, mimeType, nil
}

// Resolve reads and returns the raw file bytes, detected MIME type, and any error.
func (s *ScopedResolver) Resolve(relPath string) ([]byte, string, error) {
	filePath, mimeType, err := s.ResolvePath(relPath)
	if err != nil {
		return nil, "", err
	}

	data, err := os.ReadFile(filePath)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read asset file: %w", err)
	}

	if mimeType == "application/octet-stream" {
		mimeType = DetectMIMEType(filePath, data)
	}

	return data, mimeType, nil
}

// ServeHTTP implements http.Handler, serving relative assets while enforcing root boundaries and returning 403 on traversal.
func (s *ScopedResolver) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, ErrInvalidMethod.Error(), http.StatusMethodNotAllowed)
		return
	}

	// Query parameter takes precedence ("?file=..." or "?path=...")
	rawPath := r.URL.Query().Get("file")
	if rawPath == "" {
		rawPath = r.URL.Query().Get("path")
	}

	// Otherwise, extract path from URL path, stripping configured prefix
	if rawPath == "" {
		p := r.URL.Path
		prefix := s.Prefix()
		if prefix != "" && strings.HasPrefix(p, prefix) {
			p = strings.TrimPrefix(p, prefix)
		}
		p = strings.TrimPrefix(p, "/")
		rawPath = p
	}

	decodedPath, err := url.PathUnescape(rawPath)
	if err != nil {
		http.Error(w, "400 Bad Request: invalid path encoding", http.StatusBadRequest)
		return
	}

	filePath, mimeType, err := s.ResolvePath(decodedPath)
	if err != nil {
		switch {
		case errors.Is(err, ErrForbidden), errors.Is(err, ErrNotFile):
			http.Error(w, "403 Forbidden: "+err.Error(), http.StatusForbidden)
		case errors.Is(err, ErrNotFound):
			http.Error(w, "404 Not Found: "+err.Error(), http.StatusNotFound)
		case errors.Is(err, ErrEmptyRoot):
			http.Error(w, "500 Internal Server Error: "+err.Error(), http.StatusInternalServerError)
		default:
			http.Error(w, "500 Internal Server Error: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	f, err := os.Open(filePath)
	if err != nil {
		http.Error(w, "500 Internal Server Error: failed to open asset", http.StatusInternalServerError)
		return
	}
	defer func() { _ = f.Close() }()

	stat, err := f.Stat()
	if err != nil {
		http.Error(w, "500 Internal Server Error: failed to stat asset", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", fmt.Sprintf("%d", stat.Size()))
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")

	if r.Method == http.MethodHead {
		return
	}

	_, _ = io.Copy(w, f)
}

// Middleware returns an HTTP middleware compatible with Wails v3 AssetOptions.
func (s *ScopedResolver) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		prefix := s.Prefix()
		if prefix != "" && (r.URL.Path == prefix || strings.HasPrefix(r.URL.Path, prefix+"/")) {
			s.ServeHTTP(w, r)
			return
		}
		if next != nil {
			next.ServeHTTP(w, r)
		}
	})
}
