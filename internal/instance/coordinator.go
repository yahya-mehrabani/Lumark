package instance

import (
	"context"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// Coordinator coordinates single-instance lifecycle and message forwarding between processes.
type Coordinator struct {
	opts       Options
	role       Role
	socketPath string
	lockPath   string
	fileLock   FileLock
	listener   net.Listener
	msgChan    chan Message
	done       chan struct{}
	wg         sync.WaitGroup
	mu         sync.Mutex
	closed     bool
}

// New creates and initializes a new Coordinator with the provided options.
func New(opts Options) (*Coordinator, error) {
	defaults := DefaultOptions()

	if opts.AppID == "" {
		opts.AppID = defaults.AppID
	}
	if opts.DialTimeout <= 0 {
		opts.DialTimeout = defaults.DialTimeout
	}
	if opts.RetryInterval <= 0 {
		opts.RetryInterval = defaults.RetryInterval
	}
	if opts.MaxRetries <= 0 {
		opts.MaxRetries = defaults.MaxRetries
	}
	if opts.ChannelBuffer <= 0 {
		opts.ChannelBuffer = defaults.ChannelBuffer
	}

	if opts.Dir == "" {
		resolvedDir, err := ResolveSocketDir()
		if err != nil {
			return nil, fmt.Errorf("resolve socket directory: %w", err)
		}
		opts.Dir = resolvedDir
	}

	// Ensure directory exists with owner-only permissions (0700)
	if err := os.MkdirAll(opts.Dir, 0700); err != nil {
		return nil, fmt.Errorf("create runtime directory %s: %w", opts.Dir, err)
	}

	socketPath := filepath.Join(opts.Dir, opts.AppID+".sock")
	lockPath := filepath.Join(opts.Dir, opts.AppID+".lock")

	return &Coordinator{
		opts:       opts,
		role:       RoleUnknown,
		socketPath: socketPath,
		lockPath:   lockPath,
		msgChan:    make(chan Message, opts.ChannelBuffer),
		done:       make(chan struct{}),
	}, nil
}

// Start attempts to acquire the single-instance lock and determine process role.
// If successful, this process becomes RolePrimary and starts listening on the socket.
// If another instance is running, this process becomes RoleSecondary.
func (c *Coordinator) Start(ctx context.Context) (Role, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.closed {
		return RoleUnknown, errors.New("coordinator is closed")
	}

	lock, err := tryAcquireLock(c.lockPath)
	if err == nil {
		// Acquired lock: this process is Primary
		c.fileLock = lock
		c.role = RolePrimary

		// Check for stale socket from an earlier crashed process
		if _, statErr := os.Stat(c.socketPath); statErr == nil {
			// Dial with short timeout to verify if anything is alive
			testConn, dialErr := net.DialTimeout("unix", c.socketPath, 50*time.Millisecond)
			if dialErr == nil {
				_ = testConn.Close()
			}
			// Clean up stale socket file
			_ = os.Remove(c.socketPath)
		}

		// Create Unix socket listener
		listener, listenErr := net.Listen("unix", c.socketPath)
		if listenErr != nil {
			_ = lock.Unlock()
			c.fileLock = nil
			c.role = RoleUnknown
			return RoleUnknown, fmt.Errorf("listen on unix socket %s: %w", c.socketPath, listenErr)
		}

		// Restrict socket file permissions to owner-only (0700)
		_ = os.Chmod(c.socketPath, 0700)

		c.listener = listener
		c.wg.Add(1)
		go c.acceptLoop()

		return RolePrimary, nil
	}

	if errors.Is(err, ErrAlreadyRunning) {
		// Lock is held by another process: this process is Secondary
		c.role = RoleSecondary
		return RoleSecondary, nil
	}

	return RoleUnknown, fmt.Errorf("acquire instance lock %s: %w", c.lockPath, err)
}

// Send transmits a message from a secondary instance to the primary instance and waits for ACK.
func (c *Coordinator) Send(ctx context.Context, msg Message) error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return errors.New("coordinator is closed")
	}
	socketPath := c.socketPath
	maxRetries := c.opts.MaxRetries
	retryInterval := c.opts.RetryInterval
	dialTimeout := c.opts.DialTimeout
	c.mu.Unlock()

	var lastErr error
	for i := 0; i <= maxRetries; i++ {
		select {
		case <-ctx.Done():
			return fmt.Errorf("send cancelled: %w", ctx.Err())
		default:
		}

		var d net.Dialer
		dialCtx, cancel := context.WithTimeout(ctx, dialTimeout)
		conn, err := d.DialContext(dialCtx, "unix", socketPath)
		cancel()

		if err == nil {
			defer func() { _ = conn.Close() }()

			if dialTimeout > 0 {
				_ = conn.SetDeadline(time.Now().Add(dialTimeout))
			}

			if writeErr := writeMessage(conn, msg); writeErr != nil {
				return fmt.Errorf("write message to primary: %w", writeErr)
			}

			if ackErr := readAck(conn); ackErr != nil {
				return fmt.Errorf("receive ack from primary: %w", ackErr)
			}

			return nil
		}

		lastErr = err

		if i < maxRetries {
			select {
			case <-ctx.Done():
				return fmt.Errorf("send cancelled during retry: %w", ctx.Err())
			case <-time.After(retryInterval):
			}
		}
	}

	return fmt.Errorf("connect to primary socket %s failed after %d retries: %w", socketPath, maxRetries, lastErr)
}

// acceptLoop handles incoming secondary connections on the primary listener.
func (c *Coordinator) acceptLoop() {
	defer c.wg.Done()

	for {
		conn, err := c.listener.Accept()
		if err != nil {
			select {
			case <-c.done:
				// Expected during shutdown
				return
			default:
				// Listener closed or failed
				return
			}
		}

		c.wg.Add(1)
		go func(cn net.Conn) {
			defer c.wg.Done()
			c.handleConn(cn)
		}(conn)
	}
}

// handleConn processes a single incoming secondary connection.
func (c *Coordinator) handleConn(conn net.Conn) {
	defer func() { _ = conn.Close() }()

	_ = conn.SetDeadline(time.Now().Add(2 * time.Second))

	msg, err := readMessage(conn)
	if err != nil {
		return
	}

	if ackErr := sendAck(conn); ackErr != nil {
		return
	}

	if c.opts.OnMessage != nil {
		c.opts.OnMessage(msg)
	}

	select {
	case c.msgChan <- msg:
	case <-c.done:
	default:
		// Message channel full
	}
}

// Role returns the determined instance role.
func (c *Coordinator) Role() Role {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.role
}

// Messages returns the receive channel for incoming messages on primary.
func (c *Coordinator) Messages() <-chan Message {
	return c.msgChan
}

// SocketPath returns the configured socket file path.
func (c *Coordinator) SocketPath() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.socketPath
}

// LockPath returns the configured lock file path.
func (c *Coordinator) LockPath() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lockPath
}

// Close shuts down the coordinator, releases the file lock, and deletes the socket file.
func (c *Coordinator) Close() error {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return nil
	}
	c.closed = true
	close(c.done)
	role := c.role

	var listenerErr error
	if c.listener != nil {
		listenerErr = c.listener.Close()
	}
	c.mu.Unlock()

	// Wait for acceptLoop and all connection handlers to finish
	c.wg.Wait()

	// Clean up socket file only if this instance was Primary
	if role == RolePrimary {
		_ = os.Remove(c.socketPath)
	}

	// Release lock and close lock file
	var unlockErr error
	if c.fileLock != nil {
		unlockErr = c.fileLock.Unlock()
		c.fileLock = nil
	}

	// Drain and close message channel
	close(c.msgChan)

	if listenerErr != nil {
		return fmt.Errorf("close listener: %w", listenerErr)
	}
	if unlockErr != nil {
		return fmt.Errorf("release lock: %w", unlockErr)
	}
	return nil
}
