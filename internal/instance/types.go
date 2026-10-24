package instance

import (
	"time"
)

// Role represents whether the current process is the primary instance or a secondary instance.
type Role int

const (
	// RoleUnknown indicates the coordinator has not been started.
	RoleUnknown Role = iota
	// RolePrimary indicates this process acquired the single-instance lock and is the primary listener.
	RolePrimary
	// RoleSecondary indicates another instance is already running and this process forwarded its payload.
	RoleSecondary
)

func (r Role) String() string {
	switch r {
	case RolePrimary:
		return "Primary"
	case RoleSecondary:
		return "Secondary"
	default:
		return "Unknown"
	}
}

// Message represents the IPC payload transmitted from a secondary instance to the primary instance.
type Message struct {
	// Args contains command-line arguments (typically os.Args[1:] or file paths).
	Args []string `json:"args"`
	// WorkingDir contains the working directory of the secondary instance.
	WorkingDir string `json:"workingDir"`
	// Extra holds optional arbitrary metadata or flags.
	Extra map[string]string `json:"extra,omitempty"`
}

// Options configures the IPC coordinator behavior.
type Options struct {
	// AppID is the application identifier used to name the socket and lock file.
	// Defaults to "markdown-viewer".
	AppID string

	// Dir is the directory where socket and lock files are placed.
	// If empty, it will be automatically resolved via ResolveSocketDir().
	Dir string

	// DialTimeout is the maximum duration to wait when attempting to connect to a primary instance.
	// Defaults to 2 seconds.
	DialTimeout time.Duration

	// RetryInterval is the sleep duration between connection attempts to primary.
	// Defaults to 25 milliseconds.
	RetryInterval time.Duration

	// MaxRetries is the maximum number of connection attempts to primary before failing.
	// Defaults to 20 (allowing up to 500ms of startup latency for primary).
	MaxRetries int

	// ChannelBuffer is the buffer capacity for the incoming message channel.
	// Defaults to 16.
	ChannelBuffer int

	// OnMessage is an optional callback invoked whenever a message is received by the primary.
	OnMessage func(Message)
}

// DefaultOptions returns a new Options struct with recommended production defaults.
func DefaultOptions() Options {
	return Options{
		AppID:         "markdown-viewer",
		DialTimeout:   2 * time.Second,
		RetryInterval: 25 * time.Millisecond,
		MaxRetries:    20,
		ChannelBuffer: 16,
	}
}
