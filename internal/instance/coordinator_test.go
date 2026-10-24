package instance

import (
	"context"
	"net"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestInstanceCoordinator(t *testing.T) {
	t.Run("PrimaryStartup", func(t *testing.T) {
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

		// Verify socket file exists with owner-only permissions
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
	})

	t.Run("SecondaryConnectAndTransmit", func(t *testing.T) {
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

		msg := Message{
			Args:       []string{"README.md", "docs/architecture.md"},
			WorkingDir: tempDir,
		}

		sendCtx, sendCancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer sendCancel()

		if err := secondary.Send(sendCtx, msg); err != nil {
			t.Fatalf("secondary Send() failed: %v", err)
		}

		select {
		case received := <-primary.Messages():
			if !reflect.DeepEqual(received.Args, msg.Args) {
				t.Errorf("received args mismatch: got %v, want %v", received.Args, msg.Args)
			}
			if received.WorkingDir != msg.WorkingDir {
				t.Errorf("received WorkingDir mismatch: got %q, want %q", received.WorkingDir, msg.WorkingDir)
			}
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for message on primary")
		}
	})

	t.Run("StaleSocketRecovery", func(t *testing.T) {
		tempDir := t.TempDir()
		appID := "test-stale-recovery"
		sockPath := filepath.Join(tempDir, appID+".sock")

		// Create a stale socket file simulating an unclean crash of a previous process
		if err := os.WriteFile(sockPath, []byte("stale socket"), 0700); err != nil {
			t.Fatalf("failed to create stale socket file: %v", err)
		}

		// New coordinator starts up, finds stale socket, cleans it up and binds successfully
		opts := Options{
			AppID: appID,
			Dir:   tempDir,
		}
		coord, err := New(opts)
		if err != nil {
			t.Fatalf("New() failed: %v", err)
		}
		defer func() { _ = coord.Close() }()

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		role, err := coord.Start(ctx)
		if err != nil {
			t.Fatalf("Start() failed on stale socket recovery: %v", err)
		}

		if role != RolePrimary {
			t.Fatalf("expected RolePrimary after stale socket recovery, got %v", role)
		}

		// Verify socket listener is functional by connecting to it
		conn, err := net.DialTimeout("unix", sockPath, 200*time.Millisecond)
		if err != nil {
			t.Fatalf("failed to dial recovered socket: %v", err)
		}
		_ = conn.Close()
	})

	t.Run("MultiFileForwarding", func(t *testing.T) {
		tempDir := t.TempDir()
		opts := Options{
			AppID: "test-multi-file",
			Dir:   tempDir,
		}

		primary, err := New(opts)
		if err != nil {
			t.Fatalf("New() failed: %v", err)
		}
		defer func() { _ = primary.Close() }()

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_, _ = primary.Start(ctx)

		secondary, _ := New(opts)
		defer func() { _ = secondary.Close() }()
		_, _ = secondary.Start(ctx)

		fileArgs := []string{"docA.md", "docB.markdown", "docC.mdown", "docD.mkd"}
		msg := Message{
			Args:       fileArgs,
			WorkingDir: tempDir,
		}

		if err := secondary.Send(ctx, msg); err != nil {
			t.Fatalf("Send() failed: %v", err)
		}

		select {
		case received := <-primary.Messages():
			if len(received.Args) != len(fileArgs) {
				t.Fatalf("expected %d args, got %d", len(fileArgs), len(received.Args))
			}
			for i, arg := range fileArgs {
				if received.Args[i] != arg {
					t.Errorf("arg[%d] mismatch: got %q, want %q", i, received.Args[i], arg)
				}
			}
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for message")
		}
	})

	t.Run("UnicodeAndSpaces", func(t *testing.T) {
		tempDir := t.TempDir()
		opts := Options{
			AppID: "test-unicode-spaces",
			Dir:   tempDir,
		}

		primary, err := New(opts)
		if err != nil {
			t.Fatalf("New() failed: %v", err)
		}
		defer func() { _ = primary.Close() }()

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_, _ = primary.Start(ctx)

		secondary, _ := New(opts)
		defer func() { _ = secondary.Close() }()
		_, _ = secondary.Start(ctx)

		unicodeArgs := []string{
			"My Documents/My Work Notes 2026.md",
			"документы/план разработки.md",
			"ノート/システム設計.markdown",
			"مستندات/یادداشت.md",
		}
		msg := Message{
			Args:       unicodeArgs,
			WorkingDir: tempDir,
		}

		if err := secondary.Send(ctx, msg); err != nil {
			t.Fatalf("Send() failed: %v", err)
		}

		select {
		case received := <-primary.Messages():
			for i, expected := range unicodeArgs {
				if received.Args[i] != expected {
					t.Errorf("unicode arg[%d] mismatch: got %q, want %q", i, received.Args[i], expected)
				}
			}
		case <-time.After(2 * time.Second):
			t.Fatal("timed out waiting for unicode message")
		}
	})

	t.Run("DoubleClose", func(t *testing.T) {
		tempDir := t.TempDir()
		opts := Options{
			AppID: "test-double-close",
			Dir:   tempDir,
		}

		coord, err := New(opts)
		if err != nil {
			t.Fatalf("New() failed: %v", err)
		}

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		_, err = coord.Start(ctx)
		if err != nil {
			t.Fatalf("Start() failed: %v", err)
		}

		if err := coord.Close(); err != nil {
			t.Fatalf("first Close() failed: %v", err)
		}

		if err := coord.Close(); err != nil {
			t.Fatalf("second Close() failed: %v", err)
		}
	})
}
