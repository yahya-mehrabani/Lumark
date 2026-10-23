package ipc

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"reflect"
	"sync"
	"testing"
	"time"
	"unicode/utf8"
)

type mockEnv struct {
	vars map[string]string
}

func (m mockEnv) Getenv(key string) string {
	return m.vars[key]
}

func TestPrimaryStartupAndRole(t *testing.T) {
	tempDir := t.TempDir()

	opts := Options{
		AppID: "test-primary",
		Dir:   tempDir,
	}

	coord, err := New(opts)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	role, err := coord.Start(ctx)
	if err != nil {
		t.Fatalf("Start() failed: %v", err)
	}

	if role != RolePrimary {
		t.Errorf("expected RolePrimary, got %v", role)
	}

	if coord.Role() != RolePrimary {
		t.Errorf("coord.Role() mismatch: expected RolePrimary, got %v", coord.Role())
	}

	// Verify socket file exists
	sockInfo, err := os.Stat(coord.SocketPath())
	if err != nil {
		t.Fatalf("socket file does not exist: %v", err)
	}
	if sockInfo.Mode().Perm() != 0700 {
		t.Errorf("socket file permissions = %o, want 0700", sockInfo.Mode().Perm())
	}

	// Verify lock file exists
	if _, err := os.Stat(coord.LockPath()); err != nil {
		t.Fatalf("lock file does not exist: %v", err)
	}

	// Clean shutdown
	if err := coord.Close(); err != nil {
		t.Fatalf("Close() failed: %v", err)
	}

	// Verify socket file was cleaned up
	if _, err := os.Stat(coord.SocketPath()); !os.IsNotExist(err) {
		t.Errorf("expected socket file to be removed, got err: %v", err)
	}
}

func TestSecondaryConnectionAndTransmission(t *testing.T) {
	tempDir := t.TempDir()

	opts := Options{
		AppID: "test-sec-conn",
		Dir:   tempDir,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("primary New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	pRole, err := primary.Start(ctx)
	if err != nil {
		t.Fatalf("primary Start() failed: %v", err)
	}
	if pRole != RolePrimary {
		t.Fatalf("expected RolePrimary, got %v", pRole)
	}

	// Start secondary coordinator with same configuration
	secondary, err := New(opts)
	if err != nil {
		t.Fatalf("secondary New() failed: %v", err)
	}
	defer func() { _ = secondary.Close() }()

	sRole, err := secondary.Start(ctx)
	if err != nil {
		t.Fatalf("secondary Start() failed: %v", err)
	}
	if sRole != RoleSecondary {
		t.Fatalf("expected RoleSecondary, got %v", sRole)
	}

	sentMsg := Message{
		Args:       []string{"README.md", "docs/architecture.md"},
		WorkingDir: "/home/repos/personal/markdown-go",
		Extra: map[string]string{
			"action": "open",
		},
	}

	if err := secondary.Send(ctx, sentMsg); err != nil {
		t.Fatalf("secondary Send() failed: %v", err)
	}

	select {
	case receivedMsg := <-primary.Messages():
		if !reflect.DeepEqual(receivedMsg, sentMsg) {
			t.Errorf("message mismatch: got %+v, want %+v", receivedMsg, sentMsg)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for primary to receive message")
	}
}

func TestMultipleSecondaryTransmissions(t *testing.T) {
	tempDir := t.TempDir()

	opts := Options{
		AppID:         "test-multi-sec",
		Dir:           tempDir,
		ChannelBuffer: 10,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("primary New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if _, err := primary.Start(ctx); err != nil {
		t.Fatalf("primary Start() failed: %v", err)
	}

	numMessages := 5
	for i := 0; i < numMessages; i++ {
		sec, err := New(opts)
		if err != nil {
			t.Fatalf("sec New() %d failed: %v", i, err)
		}
		if _, err := sec.Start(ctx); err != nil {
			t.Fatalf("sec Start() %d failed: %v", i, err)
		}

		msg := Message{
			Args:       []string{fmt.Sprintf("doc-%d.md", i)},
			WorkingDir: tempDir,
		}
		if err := sec.Send(ctx, msg); err != nil {
			t.Fatalf("sec Send() %d failed: %v", i, err)
		}
		_ = sec.Close()
	}

	for i := 0; i < numMessages; i++ {
		select {
		case msg := <-primary.Messages():
			expected := fmt.Sprintf("doc-%d.md", i)
			if len(msg.Args) == 0 || msg.Args[0] != expected {
				t.Errorf("expected arg %s, got %v", expected, msg.Args)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for message %d", i)
		}
	}
}

func TestStaleSocketCleanup(t *testing.T) {
	tempDir := t.TempDir()
	appID := "test-stale-sock"
	sockPath := filepath.Join(tempDir, appID+".sock")

	// Create a dangling socket file (e.g. from an ungraceful crash or killed process)
	if err := os.WriteFile(sockPath, []byte("stale-socket-marker"), 0600); err != nil {
		t.Fatalf("failed to create stale socket file: %v", err)
	}

	// Verify the dangling socket file exists on disk
	if _, err := os.Stat(sockPath); err != nil {
		t.Fatalf("dangling socket file missing: %v", err)
	}

	opts := Options{
		AppID: appID,
		Dir:   tempDir,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	// Start should detect stale socket, unlink it, and start fresh listener
	role, err := primary.Start(ctx)
	if err != nil {
		t.Fatalf("Start() failed on stale socket: %v", err)
	}
	if role != RolePrimary {
		t.Fatalf("expected RolePrimary, got %v", role)
	}

	// Verify we can connect to the new socket
	secondary, err := New(opts)
	if err != nil {
		t.Fatalf("secondary New() failed: %v", err)
	}
	defer func() { _ = secondary.Close() }()

	if _, err := secondary.Start(ctx); err != nil {
		t.Fatalf("secondary Start() failed: %v", err)
	}

	msg := Message{Args: []string{"recovered.md"}}
	if err := secondary.Send(ctx, msg); err != nil {
		t.Fatalf("secondary Send() after recovery failed: %v", err)
	}

	select {
	case received := <-primary.Messages():
		if len(received.Args) != 1 || received.Args[0] != "recovered.md" {
			t.Errorf("unexpected message: %+v", received)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for message")
	}
}

func TestCleanShutdown(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID: "test-clean-shutdown",
		Dir:   tempDir,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	first, err := New(opts)
	if err != nil {
		t.Fatalf("first New() failed: %v", err)
	}

	role, err := first.Start(ctx)
	if err != nil {
		t.Fatalf("first Start() failed: %v", err)
	}
	if role != RolePrimary {
		t.Fatalf("expected RolePrimary, got %v", role)
	}

	if err := first.Close(); err != nil {
		t.Fatalf("first Close() failed: %v", err)
	}

	// Verify socket was removed
	if _, err := os.Stat(first.SocketPath()); !os.IsNotExist(err) {
		t.Errorf("socket file still exists after Close(): %v", err)
	}

	// Immediately start a second coordinator in same directory
	second, err := New(opts)
	if err != nil {
		t.Fatalf("second New() failed: %v", err)
	}
	defer func() { _ = second.Close() }()

	role2, err := second.Start(ctx)
	if err != nil {
		t.Fatalf("second Start() failed after first shutdown: %v", err)
	}
	if role2 != RolePrimary {
		t.Errorf("second coordinator should acquire RolePrimary after first released lock, got %v", role2)
	}
}

func TestFallbackDirectoryHandling(t *testing.T) {
	tempDir := t.TempDir()
	xdgDir := filepath.Join(tempDir, "xdg_run")
	if err := os.MkdirAll(xdgDir, 0700); err != nil {
		t.Fatalf("mkdir xdg_run failed: %v", err)
	}

	homeDir := filepath.Join(tempDir, "mock_home")
	if err := os.MkdirAll(homeDir, 0700); err != nil {
		t.Fatalf("mkdir mock_home failed: %v", err)
	}

	t.Run("ValidXDGRuntimeDir", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{"XDG_RUNTIME_DIR": xdgDir}}
		dir, err := ResolveDir(env, homeDir, tempDir, 1000)
		if err != nil {
			t.Fatalf("ResolveDir failed: %v", err)
		}
		if dir != xdgDir {
			t.Errorf("got %s, want %s", dir, xdgDir)
		}
	})

	t.Run("FallbackToUserCacheWhenXDGUnset", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{}}
		dir, err := ResolveDir(env, homeDir, tempDir, 1000)
		if err != nil {
			t.Fatalf("ResolveDir failed: %v", err)
		}
		expected := filepath.Join(homeDir, ".cache", "markdown-viewer")
		if dir != expected {
			t.Errorf("got %s, want %s", dir, expected)
		}
		if info, err := os.Stat(dir); err != nil || !info.IsDir() {
			t.Errorf("resolved dir %s is not an existing directory", dir)
		}
	})

	t.Run("FallbackToTempDirWhenHomeAndXDGUnset", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{}}
		dir, err := ResolveDir(env, "", tempDir, 1000)
		if err != nil {
			t.Fatalf("ResolveDir failed: %v", err)
		}
		expected := filepath.Join(tempDir, "markdown-viewer-1000")
		if dir != expected {
			t.Errorf("got %s, want %s", dir, expected)
		}
		if info, err := os.Stat(dir); err != nil || !info.IsDir() {
			t.Errorf("resolved dir %s is not an existing directory", dir)
		}
	})

	t.Run("FailsWhenNoDirAvailable", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{}}
		_, err := ResolveDir(env, "", "", 1000)
		if err == nil {
			t.Error("expected error when no directories available, got nil")
		}
	})
}

func TestPayloadIntegrityWithUnicodeAndSpaces(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID: "test-unicode-spaces",
		Dir:   tempDir,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("primary New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if _, err := primary.Start(ctx); err != nil {
		t.Fatalf("primary Start() failed: %v", err)
	}

	secondary, err := New(opts)
	if err != nil {
		t.Fatalf("secondary New() failed: %v", err)
	}
	defer func() { _ = secondary.Close() }()

	if _, err := secondary.Start(ctx); err != nil {
		t.Fatalf("secondary Start() failed: %v", err)
	}

	testCases := []string{
		"fixtures/golden/نمونه سند.md",
		"docs/path with spaces/my file (copy) [1].md",
		"test/中文文件名_测试.md",
		"test/файл_на_русском_языке.md",
		"test/special!@#$%^&*()_+-=[]{}|;':,.<>?.md",
		"test/emoji_🚀_🎉_document.md",
	}

	for _, path := range testCases {
		msg := Message{
			Args:       []string{path},
			WorkingDir: tempDir,
		}

		if err := secondary.Send(ctx, msg); err != nil {
			t.Fatalf("secondary Send(%q) failed: %v", path, err)
		}

		select {
		case received := <-primary.Messages():
			if len(received.Args) != 1 || received.Args[0] != path {
				t.Errorf("payload corrupted for path %q: got %v", path, received.Args)
			}
			if !bytes.Equal([]byte(received.Args[0]), []byte(path)) {
				t.Errorf("byte sequence mismatch for path %q: got %x, want %x", path, []byte(received.Args[0]), []byte(path))
			}
			if !utf8.ValidString(received.Args[0]) {
				t.Errorf("received string %q is not valid UTF-8", received.Args[0])
			}
			if filepath.Base(received.Args[0]) != filepath.Base(path) {
				t.Errorf("decoded basename mismatch for path %q: got %q, want %q", path, filepath.Base(received.Args[0]), filepath.Base(path))
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for path %q", path)
		}
	}
}

func TestConcurrentSecondaryInstances(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID:         "test-concurrent-sec",
		Dir:           tempDir,
		ChannelBuffer: 50,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("primary New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := primary.Start(ctx); err != nil {
		t.Fatalf("primary Start() failed: %v", err)
	}

	concurrency := 10
	var wg sync.WaitGroup
	errs := make(chan error, concurrency)

	for i := 0; i < concurrency; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			sec, err := New(opts)
			if err != nil {
				errs <- fmt.Errorf("sec %d New(): %w", id, err)
				return
			}
			defer func() { _ = sec.Close() }()

			role, err := sec.Start(ctx)
			if err != nil {
				errs <- fmt.Errorf("sec %d Start(): %w", id, err)
				return
			}
			if role != RoleSecondary {
				errs <- fmt.Errorf("sec %d got role %v, want RoleSecondary", id, role)
				return
			}

			msg := Message{
				Args:       []string{fmt.Sprintf("concurrent-%d.md", id)},
				WorkingDir: tempDir,
			}

			if err := sec.Send(ctx, msg); err != nil {
				errs <- fmt.Errorf("sec %d Send(): %w", id, err)
				return
			}
		}(i)
	}

	wg.Wait()
	close(errs)

	for err := range errs {
		t.Errorf("concurrent worker error: %v", err)
	}

	receivedCount := 0
	timeout := time.After(3 * time.Second)
	for receivedCount < concurrency {
		select {
		case <-primary.Messages():
			receivedCount++
		case <-timeout:
			t.Fatalf("timed out: received only %d of %d concurrent messages", receivedCount, concurrency)
		}
	}
}

func TestEvaluationMatrix(t *testing.T) {
	summary := GetEvaluationSummary()
	if len(summary) < 4 {
		t.Errorf("expected at least 4 evaluation comparison items, got %d", len(summary))
	}
	for _, item := range summary {
		if item.Feature == "" || item.WailsV3Native == "" || item.CustomSocketIPC == "" || item.FeasibilityVerdict == "" {
			t.Errorf("incomplete evaluation item: %+v", item)
		}
	}
}
