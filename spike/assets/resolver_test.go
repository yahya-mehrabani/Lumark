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

func TestResolveValidAssets(t *testing.T) {
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
			name:         "Asset with spaces in filename",
			relPath:      "assets/spaces in name.png",
			expectedMIME: "image/png",
			expectedData: []byte("PNG_SPACE_DATA"),
		},
		{
			name:         "Asset with Persian Unicode filename",
			relPath:      "assets/تصویر فارسی.png",
			expectedMIME: "image/png",
			expectedData: []byte("PNG_PERSIAN_DATA"),
		},
		{
			name:         "Nested subdirectory asset",
			relPath:      "sub/nested.gif",
			expectedMIME: "image/gif",
			expectedData: []byte("GIF89a"),
		},
		{
			name:         "Relative leading dot slash",
			relPath:      "./assets/sample.png",
			expectedMIME: "image/png",
			expectedData: []byte("\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			data, mimeType, err := resolver.Resolve(tc.relPath)
			if err != nil {
				t.Fatalf("unexpected error resolving %q: %v", tc.relPath, err)
			}
			if mimeType != tc.expectedMIME {
				t.Errorf("expected MIME %q, got %q", tc.expectedMIME, mimeType)
			}
			if !bytes.Equal(data, tc.expectedData) {
				t.Errorf("expected data %q, got %q", tc.expectedData, data)
			}
		})
	}
}

func TestPathTraversalRejection(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	traversalPayloads := []struct {
		name    string
		payload string
	}{
		{name: "Parent directory escape", payload: "../outside_root/secret.png"},
		{name: "Deep directory traversal", payload: "../../../../etc/passwd"},
		{name: "Nested escape", payload: "assets/../../outside_root/secret.png"},
		{name: "Absolute Unix root", payload: "/etc/passwd"},
		{name: "Absolute path with double slash", payload: "//etc/passwd"},
		{name: "Leading backslash", payload: "\\outside_root\\secret.png"},
		{name: "Windows drive traversal", payload: "C:\\Windows\\System32\\cmd.exe"},
		{name: "Windows forward slash drive", payload: "C:/Windows/System32/cmd.exe"},
		{name: "Windows UNC path", payload: "\\\\server\\share\\secret.png"},
		{name: "Null byte injection", payload: "assets/sample.png\x00/../../etc/passwd"},
		{name: "Just parent dot-dot", payload: ".."},
		{name: "Trailing dot-dot slash", payload: "sub/../.."},
		{name: "Symlink escape attempt", payload: "evil_symlink/secret.txt"},
	}

	for _, tc := range traversalPayloads {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := resolver.Resolve(tc.payload)
			if err == nil {
				t.Fatalf("expected error for traversal payload %q, but got nil", tc.payload)
			}
			if !errors.Is(err, ErrForbidden) {
				t.Errorf("expected ErrForbidden for %q, got: %v", tc.payload, err)
			}
		})
	}
}

func TestNotFoundAndDirectoryAccess(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	t.Run("Nonexistent file within root", func(t *testing.T) {
		_, _, err := resolver.Resolve("assets/nonexistent.png")
		if !errors.Is(err, ErrNotFound) {
			t.Errorf("expected ErrNotFound, got: %v", err)
		}
	})

	t.Run("Directory access rejection", func(t *testing.T) {
		_, _, err := resolver.Resolve("assets")
		if !errors.Is(err, ErrNotFile) && !errors.Is(err, ErrForbidden) {
			t.Errorf("expected ErrNotFile or ErrForbidden when requesting directory, got: %v", err)
		}
	})
}

func TestHTTPServeHTTP(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	t.Run("Valid GET request via path", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/local-asset/assets/sample.png", nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d (body: %s)", rec.Code, rec.Body.String())
		}
		if ct := rec.Header().Get("Content-Type"); ct != "image/png" {
			t.Errorf("expected Content-Type image/png, got %q", ct)
		}
		if nosniff := rec.Header().Get("X-Content-Type-Options"); nosniff != "nosniff" {
			t.Errorf("expected nosniff header, got %q", nosniff)
		}
	})

	t.Run("Valid HEAD request", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodHead, "/local-asset/assets/vector.svg", nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); ct != "image/svg+xml" {
			t.Errorf("expected Content-Type image/svg+xml, got %q", ct)
		}
		if rec.Body.Len() != 0 {
			t.Errorf("expected empty body for HEAD request, got %d bytes", rec.Body.Len())
		}
	})

	t.Run("Valid GET request with URL encoded Persian filename", func(t *testing.T) {
		encodedPath := "/local-asset/assets/" + url.PathEscape("تصویر فارسی.png")
		req := httptest.NewRequest(http.MethodGet, encodedPath, nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d (body: %s)", rec.Code, rec.Body.String())
		}
		if rec.Body.String() != "PNG_PERSIAN_DATA" {
			t.Errorf("unexpected body: %q", rec.Body.String())
		}
	})

	t.Run("Valid GET request via query parameter", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/local-asset?file=assets/spaces%20in%20name.png", nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d (body: %s)", rec.Code, rec.Body.String())
		}
		if rec.Body.String() != "PNG_SPACE_DATA" {
			t.Errorf("unexpected body: %q", rec.Body.String())
		}
	})

	t.Run("Traversal attempt returns 403 Forbidden", func(t *testing.T) {
		traversalURLs := []string{
			"/local-asset?file=../../../../etc/passwd",
			"/local-asset?file=../outside_root/secret.png",
			"/local-asset?file=/etc/passwd",
			"/local-asset?file=C:\\Windows\\System32\\cmd.exe",
			"/local-asset/../../outside_root/secret.png",
		}

		for _, u := range traversalURLs {
			req := httptest.NewRequest(http.MethodGet, u, nil)
			rec := httptest.NewRecorder()

			resolver.ServeHTTP(rec, req)

			if rec.Code != http.StatusForbidden {
				t.Errorf("for URL %q, expected status 403 Forbidden, got %d", u, rec.Code)
			}
		}
	})

	t.Run("Nonexistent asset returns 404 Not Found", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/local-asset/assets/missing.png", nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", rec.Code)
		}
	})

	t.Run("Disallowed method returns 405 Method Not Allowed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/local-asset/assets/sample.png", nil)
		rec := httptest.NewRecorder()

		resolver.ServeHTTP(rec, req)

		if rec.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", rec.Code)
		}
	})
}

func TestMiddlewareIntegration(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	fallbackHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("FALLBACK_APP_HTML"))
	})

	middleware := resolver.Middleware(fallbackHandler)

	t.Run("Local asset handled by resolver", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/local-asset/assets/sample.png", nil)
		rec := httptest.NewRecorder()

		middleware.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if rec.Header().Get("Content-Type") != "image/png" {
			t.Errorf("expected Content-Type image/png, got %q", rec.Header().Get("Content-Type"))
		}
	})

	t.Run("App routes pass through to next handler", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/index.html", nil)
		rec := httptest.NewRecorder()

		middleware.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("expected status 200, got %d", rec.Code)
		}
		if rec.Body.String() != "FALLBACK_APP_HTML" {
			t.Errorf("expected fallback content, got %q", rec.Body.String())
		}
	})
}

func TestConcurrentResolverAccess(t *testing.T) {
	docRoot, cleanup := setupTestEnvironment(t)
	defer cleanup()

	resolver, err := NewScopedResolver(docRoot)
	if err != nil {
		t.Fatalf("NewScopedResolver failed: %v", err)
	}

	const goroutines = 20
	const iterations = 50
	var wg sync.WaitGroup
	wg.Add(goroutines)

	for i := 0; i < goroutines; i++ {
		go func(id int) {
			defer wg.Done()
			for j := 0; j < iterations; j++ {
				// Alternately read assets and query status
				if j%2 == 0 {
					data, mime, err := resolver.Resolve("assets/sample.png")
					if err != nil || len(data) == 0 || mime != "image/png" {
						t.Errorf("goroutine %d iteration %d: unexpected resolve result", id, j)
						return
					}
				} else {
					req := httptest.NewRequest(http.MethodGet, "/local-asset?file=../../../../etc/passwd", nil)
					rec := httptest.NewRecorder()
					resolver.ServeHTTP(rec, req)
					if rec.Code != http.StatusForbidden {
						t.Errorf("goroutine %d iteration %d: expected 403, got %d", id, j, rec.Code)
						return
					}
				}
			}
		}(i)
	}

	wg.Wait()
}
