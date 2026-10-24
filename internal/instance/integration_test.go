package instance

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"
)

type mockEnv struct {
	vars map[string]string
}

func (m mockEnv) Getenv(key string) string {
	return m.vars[key]
}

func TestCoordinator_ConcurrentSenders(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID:         "test-concurrent-ipc",
		Dir:           tempDir,
		ChannelBuffer: 32,
	}

	primary, err := New(opts)
	if err != nil {
		t.Fatalf("primary New() failed: %v", err)
	}
	defer func() { _ = primary.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	pRole, err := primary.Start(ctx)
	if err != nil || pRole != RolePrimary {
		t.Fatalf("primary Start() failed: %v", err)
	}

	const numClients = 10
	var wg sync.WaitGroup
	errChan := make(chan error, numClients)

	// Launch numClients concurrent secondaries
	for i := 0; i < numClients; i++ {
		wg.Add(1)
		go func(clientID int) {
			defer wg.Done()

			sec, err := New(opts)
			if err != nil {
				errChan <- fmt.Errorf("client %d New(): %w", clientID, err)
				return
			}
			defer func() { _ = sec.Close() }()

			sRole, err := sec.Start(ctx)
			if err != nil {
				errChan <- fmt.Errorf("client %d Start(): %w", clientID, err)
				return
			}
			if sRole != RoleSecondary {
				errChan <- fmt.Errorf("client %d expected RoleSecondary, got %v", clientID, sRole)
				return
			}

			msg := Message{
				Args:       []string{fmt.Sprintf("file_%d.md", clientID)},
				WorkingDir: tempDir,
				Extra: map[string]string{
					"client": fmt.Sprintf("%d", clientID),
				},
			}

			if err := sec.Send(ctx, msg); err != nil {
				errChan <- fmt.Errorf("client %d Send(): %w", clientID, err)
				return
			}
		}(i)
	}

	wg.Wait()
	close(errChan)

	for err := range errChan {
		if err != nil {
			t.Fatalf("concurrent sender error: %v", err)
		}
	}

	// Read all messages on primary
	receivedMap := make(map[string]bool)
	timeout := time.After(3 * time.Second)

	for len(receivedMap) < numClients {
		select {
		case msg := <-primary.Messages():
			if len(msg.Args) > 0 {
				receivedMap[msg.Args[0]] = true
			}
		case <-timeout:
			t.Fatalf("timed out waiting for concurrent messages: received %d of %d", len(receivedMap), numClients)
		}
	}

	if len(receivedMap) != numClients {
		t.Errorf("expected %d distinct messages, got %d", numClients, len(receivedMap))
	}
}

func TestCoordinator_RapidSequentialLaunches(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID:         "test-rapid-launches",
		Dir:           tempDir,
		ChannelBuffer: 16,
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

	const fileCount = 5
	expectedFiles := make([]string, fileCount)
	for i := 0; i < fileCount; i++ {
		expectedFiles[i] = fmt.Sprintf("rapid_doc_%d.md", i)
	}

	// Simulate rapid shell loop: for f in doc1 doc2 ...; do app $f; done
	for _, file := range expectedFiles {
		sec, err := New(opts)
		if err != nil {
			t.Fatalf("New() failed: %v", err)
		}

		sRole, err := sec.Start(ctx)
		if err != nil || sRole != RoleSecondary {
			_ = sec.Close()
			t.Fatalf("Start() failed or not secondary: %v", err)
		}

		sendErr := sec.Send(ctx, Message{
			Args:       []string{file},
			WorkingDir: tempDir,
		})
		_ = sec.Close()

		if sendErr != nil {
			t.Fatalf("Send() for %s failed: %v", file, sendErr)
		}
	}

	// Verify all 5 files received in order
	for _, expectedFile := range expectedFiles {
		select {
		case msg := <-primary.Messages():
			if len(msg.Args) != 1 || msg.Args[0] != expectedFile {
				t.Errorf("expected %s, got %v", expectedFile, msg.Args)
			}
		case <-time.After(2 * time.Second):
			t.Fatalf("timed out waiting for %s", expectedFile)
		}
	}
}

func TestCoordinator_DirectoryResolution(t *testing.T) {
	tempDir := t.TempDir()
	userHome := filepath.Join(tempDir, "userhome")

	t.Run("XDGRuntimeDirPreferred", func(t *testing.T) {
		xdgDir := filepath.Join(tempDir, "xdg_run")
		_ = os.MkdirAll(xdgDir, 0700)

		env := mockEnv{vars: map[string]string{
			"XDG_RUNTIME_DIR": xdgDir,
		}}

		dir, err := ResolveDir(env, userHome, tempDir, 1000)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if dir != xdgDir {
			t.Errorf("expected %s, got %s", xdgDir, dir)
		}
	})

	t.Run("UserCacheFallback", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{}}
		dir, err := ResolveDir(env, userHome, tempDir, 1000)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected := filepath.Join(userHome, ".cache", "markdown-viewer")
		if dir != expected {
			t.Errorf("expected %s, got %s", expected, dir)
		}
	})

	t.Run("TempDirUIDFallback", func(t *testing.T) {
		env := mockEnv{vars: map[string]string{}}
		dir, err := ResolveDir(env, "", tempDir, 1001)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		expected := filepath.Join(tempDir, "markdown-viewer-1001")
		if dir != expected {
			t.Errorf("expected %s, got %s", expected, dir)
		}
	})
}

func TestCoordinator_ContextCancellationDuringSend(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID:         "test-cancel",
		Dir:           tempDir,
		DialTimeout:   100 * time.Millisecond,
		RetryInterval: 20 * time.Millisecond,
		MaxRetries:    5,
	}

	// No primary running -> Send should retry and cancel cleanly with cancelled context
	sec, err := New(opts)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	defer func() { _ = sec.Close() }()

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // pre-cancel context

	err = sec.Send(ctx, Message{Args: []string{"test.md"}})
	if err == nil {
		t.Fatal("expected error with cancelled context, got nil")
	}
}

func TestCoordinator_SendFailsWhenNoPrimary(t *testing.T) {
	tempDir := t.TempDir()
	opts := Options{
		AppID:         "test-no-primary",
		Dir:           tempDir,
		DialTimeout:   20 * time.Millisecond,
		RetryInterval: 10 * time.Millisecond,
		MaxRetries:    2,
	}

	sec, err := New(opts)
	if err != nil {
		t.Fatalf("New() failed: %v", err)
	}
	defer func() { _ = sec.Close() }()

	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	err = sec.Send(ctx, Message{Args: []string{"test.md"}})
	if err == nil {
		t.Fatal("expected error connecting when no primary is running, got nil")
	}
}
