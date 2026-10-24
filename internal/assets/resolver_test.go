package assets

import (
	"bytes"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"sync"
	"testing"
)

func setupTestEnvironment(t *testing.T) (string, func()) {
	t.Helper()

	// Create a temporary directory structure:
	//   tempDir/
	//     document_root/
	//       assets/
	//         sample.png
	//         vector.svg
	//         photo.jpg
	//         spaces in name.png
	//         تصویر فارسی.png
	//       sub/
	//         nested.gif
	//     outside_root/
	//       secret.txt
	//       secret.png
	tempDir, err := os.MkdirTemp("", "assets_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	docRoot := filepath.Join(tempDir, "document_root")
	assetsDir := filepath.Join(docRoot, "assets")
	subDir := filepath.Join(docRoot, "sub")
	outsideDir := filepath.Join(tempDir, "outside_root")

	for _, dir := range []string{assetsDir, subDir, outsideDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			t.Fatalf("failed to create dir %s: %v", dir, err)
		}
	}

	// Create test files
	files := map[string][]byte{
		filepath.Join(assetsDir, "sample.png"):         []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		filepath.Join(assetsDir, "vector.svg"):         []byte("<svg xmlns=\"http://www.w3.org/2000/svg\"><rect/></svg>"),
		filepath.Join(assetsDir, "photo.jpg"):          []byte("\xff\xd8\xff\xe0\x00\x10JFIF"),
		filepath.Join(assetsDir, "spaces in name.png"): []byte("PNG_SPACE_DATA"),
		filepath.Join(assetsDir, "تصویر فارسی.png"):    []byte("PNG_PERSIAN_DATA"),
		filepath.Join(subDir, "nested.gif"):            []byte("GIF89a"),
		filepath.Join(outsideDir, "secret.txt"):        []byte("CONFIDENTIAL"),
		filepath.Join(outsideDir, "secret.png"):        []byte("SECRET_PNG"),
	}

	for path, content := range files {
		if err := os.WriteFile(path, content, 0644); err != nil {
			t.Fatalf("failed to write test file %s: %v", path, err)
		}
	}

	// Create a symlink inside document_root pointing outside
	symlinkPath := filepath.Join(docRoot, "evil_symlink")
	_ = os.Symlink(outsideDir, symlinkPath)

	cleanup := func() {
		_ = os.RemoveAll(tempDir)
	}

	return docRoot, cleanup
}

func TestAssetResolver_ValidAssets(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	tests := []struct {
		name         string
		relPath      string
		expectedMIME string
		expectedData []byte
	}{
		{
			name:         "PNG in assets directory",
			relPath:      "assets/sample.png",
			expectedMIME: "image/png",
			expectedData: []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
		{
			name:         "SVG vector image",
			relPath:      "assets/vector.svg",
			expectedMIME: "image/svg+xml",
			expectedData: []byte("<svg xmlns=\"http://www.w3.org/2000/svg\"><rect/></svg>"),
		},
		{
			name:         "JPEG photo",
			relPath:      "assets/photo.jpg",
			expectedMIME: "image/jpeg",
			expectedData: []byte("\xff\xd8\xff\xe0\x00\x10JFIF"),
		},
		{
			name:         "Path with spaces",
			relPath:      "assets/spaces in name.png",
			expectedMIME: "image/png",
			expectedData: []byte("PNG_SPACE_DATA"),
		},
		{
			name:         "Unicode / Persian path",
			relPath:      "assets/تصویر فارسی.png",
			expectedMIME: "image/png",
			expectedData: []byte("PNG_PERSIAN_DATA"),
		},
		{
			name:         "Nested GIF",
			relPath:      "sub/nested.gif",
			expectedMIME: "image/gif",
			expectedData: []byte("GIF89a"),
		},
		{
			name:         "Path with dot slash prefix",
			relPath:      "./assets/sample.png",
			expectedMIME: "image/png",
			expectedData: []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
		{
			name:         "Path with query parameter stripped",
			relPath:      "assets/sample.png?v=123",
			expectedMIME: "image/png",
			expectedData: []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
		{
			name:         "Path with hash fragment stripped",
			relPath:      "assets/sample.png#preview",
			expectedMIME: "image/png",
			expectedData: []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path, mimeType, resolveErr := resolver.ResolvePath(tt.relPath)
			if resolveErr != nil {
				t.Fatalf("ResolvePath(%q) unexpected error: %v", tt.relPath, resolveErr)
			}
			if mimeType != tt.expectedMIME {
				t.Errorf("ResolvePath(%q) mimeType = %s, want %s", tt.relPath, mimeType, tt.expectedMIME)
			}
			if path == "" {
				t.Errorf("ResolvePath(%q) returned empty path", tt.relPath)
			}

			data, resolvedMIME, readErr := resolver.Resolve(tt.relPath)
			if readErr != nil {
				t.Fatalf("Resolve(%q) unexpected error: %v", tt.relPath, readErr)
			}
			if resolvedMIME != tt.expectedMIME {
				t.Errorf("Resolve(%q) resolvedMIME = %s, want %s", tt.relPath, resolvedMIME, tt.expectedMIME)
			}
			if !bytes.Equal(data, tt.expectedData) {
				t.Errorf("Resolve(%q) data mismatch: got %v, want %v", tt.relPath, data, tt.expectedData)
			}
		})
	}
}

func TestAssetResolver_PathTraversal(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	traversalAttempts := []struct {
		name    string
		relPath string
	}{
		{name: "Parent directory escape", relPath: "../outside_root/secret.png"},
		{name: "Multiple parent traversal", relPath: "../../secret.txt"},
		{name: "Deep parent traversal to root", relPath: "../../../../../etc/passwd"},
		{name: "Absolute path unix", relPath: "/etc/passwd"},
		{name: "Absolute path with slash", relPath: "/secret.png"},
		{name: "Leading backslash", relPath: "\\secret.png"},
		{name: "Windows drive letter C:", relPath: "C:\\Windows\\system32\\cmd.exe"},
		{name: "Windows drive letter c:", relPath: "c:/boot.ini"},
		{name: "UNC path backslash", relPath: "\\\\server\\share\\asset.png"},
		{name: "UNC path forward slash", relPath: "//server/share/asset.png"},
		{name: "Null byte injection", relPath: "assets/sample.png\x00.jpg"},
		{name: "Symlink escape", relPath: "evil_symlink/secret.png"},
		{name: "Encoded parent traversal raw", relPath: "..%2Foutside_root%2Fsecret.png"},
		{name: "Escaping dotdot subpath", relPath: "assets/../../outside_root/secret.png"},
	}

	for _, tt := range traversalAttempts {
		t.Run(tt.name, func(t *testing.T) {
			_, _, resolveErr := resolver.ResolvePath(tt.relPath)
			if resolveErr == nil {
				t.Errorf("ResolvePath(%q) succeeded; expected ErrForbidden", tt.relPath)
			}
			if !errors.Is(resolveErr, ErrForbidden) && !errors.Is(resolveErr, ErrNotFound) {
				t.Errorf("ResolvePath(%q) error = %v, want ErrForbidden", tt.relPath, resolveErr)
			}

			_, _, readErr := resolver.Resolve(tt.relPath)
			if readErr == nil {
				t.Errorf("Resolve(%q) succeeded; expected ErrForbidden", tt.relPath)
			}
		})
	}
}

func TestAssetResolver_NotFoundAndDirectory(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	// 1. Nonexistent file
	_, _, err = resolver.ResolvePath("assets/nonexistent.png")
	if !errors.Is(err, ErrNotFound) {
		t.Errorf("ResolvePath(nonexistent) err = %v, want ErrNotFound", err)
	}

	// 2. Directory access should be rejected with ErrNotFile
	_, _, err = resolver.ResolvePath("assets")
	if !errors.Is(err, ErrNotFile) {
		t.Errorf("ResolvePath(directory) err = %v, want ErrNotFile", err)
	}
}

func TestAssetResolver_HTTPServeHTTP(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	tests := []struct {
		name           string
		method         string
		urlPath        string
		expectedStatus int
		expectedHeader string
		expectedBody   []byte
	}{
		{
			name:           "Valid PNG via path prefix",
			method:         http.MethodGet,
			urlPath:        "/local-asset/assets/sample.png",
			expectedStatus: http.StatusOK,
			expectedHeader: "image/png",
			expectedBody:   []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
		{
			name:           "Valid PNG via query parameter ?file=",
			method:         http.MethodGet,
			urlPath:        "/local-asset?file=assets%2Fsample.png",
			expectedStatus: http.StatusOK,
			expectedHeader: "image/png",
			expectedBody:   []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
		{
			name:           "Valid URL with spaces encoded",
			method:         http.MethodGet,
			urlPath:        "/local-asset/assets/" + url.PathEscape("spaces in name.png"),
			expectedStatus: http.StatusOK,
			expectedHeader: "image/png",
			expectedBody:   []byte("PNG_SPACE_DATA"),
		},
		{
			name:           "Valid URL with Unicode Persian encoded",
			method:         http.MethodGet,
			urlPath:        "/local-asset/assets/" + url.PathEscape("تصویر فارسی.png"),
			expectedStatus: http.StatusOK,
			expectedHeader: "image/png",
			expectedBody:   []byte("PNG_PERSIAN_DATA"),
		},
		{
			name:           "HEAD method returns 200 with headers and no body",
			method:         http.MethodHead,
			urlPath:        "/local-asset/assets/sample.png",
			expectedStatus: http.StatusOK,
			expectedHeader: "image/png",
			expectedBody:   nil,
		},
		{
			name:           "POST method rejected with 405 Method Not Allowed",
			method:         http.MethodPost,
			urlPath:        "/local-asset/assets/sample.png",
			expectedStatus: http.StatusMethodNotAllowed,
			expectedHeader: "",
			expectedBody:   nil,
		},
		{
			name:           "Path traversal ../ returns 403 Forbidden",
			method:         http.MethodGet,
			urlPath:        "/local-asset/../outside_root/secret.png",
			expectedStatus: http.StatusForbidden,
			expectedHeader: "",
			expectedBody:   nil,
		},
		{
			name:           "Path traversal via query ?file=../ returns 403 Forbidden",
			method:         http.MethodGet,
			urlPath:        "/local-asset?file=..%2Foutside_root%2Fsecret.png",
			expectedStatus: http.StatusForbidden,
			expectedHeader: "",
			expectedBody:   nil,
		},
		{
			name:           "Missing file returns 404 Not Found",
			method:         http.MethodGet,
			urlPath:        "/local-asset/assets/missing.png",
			expectedStatus: http.StatusNotFound,
			expectedHeader: "",
			expectedBody:   nil,
		},
		{
			name:           "Directory access returns 403 Forbidden",
			method:         http.MethodGet,
			urlPath:        "/local-asset/assets",
			expectedStatus: http.StatusForbidden,
			expectedHeader: "",
			expectedBody:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.urlPath, nil)
			rec := httptest.NewRecorder()

			resolver.ServeHTTP(rec, req)

			if rec.Code != tt.expectedStatus {
				t.Errorf("ServeHTTP(%s %s) status = %d, want %d", tt.method, tt.urlPath, rec.Code, tt.expectedStatus)
			}

			if tt.expectedHeader != "" {
				contentType := rec.Header().Get("Content-Type")
				if contentType != tt.expectedHeader {
					t.Errorf("ServeHTTP Content-Type = %q, want %q", contentType, tt.expectedHeader)
				}
				if nosniff := rec.Header().Get("X-Content-Type-Options"); nosniff != "nosniff" {
					t.Errorf("ServeHTTP X-Content-Type-Options = %q, want nosniff", nosniff)
				}
			}

			if tt.expectedBody != nil {
				if !bytes.Equal(rec.Body.Bytes(), tt.expectedBody) {
					t.Errorf("ServeHTTP body mismatch: got %q, want %q", rec.Body.Bytes(), tt.expectedBody)
				}
			}
		})
	}
}

func TestAssetResolver_Middleware(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	nextCalled := false
	fallbackHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("FALLBACK_APP"))
	})

	handler := resolver.Middleware(fallbackHandler)

	// 1. Request matching /local-asset should be handled by resolver, NOT fallback
	req1 := httptest.NewRequest(http.MethodGet, "/local-asset/assets/sample.png", nil)
	rec1 := httptest.NewRecorder()
	handler.ServeHTTP(rec1, req1)

	if rec1.Code != http.StatusOK {
		t.Errorf("Middleware asset request status = %d, want 200", rec1.Code)
	}
	if nextCalled {
		t.Errorf("Middleware should not have called next handler for /local-asset")
	}

	// 2. Request for regular app route should be passed to next handler
	nextCalled = false
	req2 := httptest.NewRequest(http.MethodGet, "/index.html", nil)
	rec2 := httptest.NewRecorder()
	handler.ServeHTTP(rec2, req2)

	if rec2.Code != http.StatusOK {
		t.Errorf("Middleware app request status = %d, want 200", rec2.Code)
	}
	if !nextCalled {
		t.Errorf("Middleware should have called next handler for /index.html")
	}
	if rec2.Body.String() != "FALLBACK_APP" {
		t.Errorf("Middleware response body = %q, want FALLBACK_APP", rec2.Body.String())
	}
}

func TestAssetResolver_ConcurrentAccess(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	var wg sync.WaitGroup
	workers := 10
	iterations := 20

	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				// Alternating Reads and RootDir updates
				if j%5 == 0 {
					_ = resolver.SetRootDir(docRoot)
				}
				_, _, err := resolver.Resolve("assets/sample.png")
				if err != nil {
					t.Errorf("worker %d iteration %d Resolve error: %v", workerID, j, err)
				}
			}
		}(i)
	}

	wg.Wait()
}
