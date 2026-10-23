package ipc

// EvaluationReport summarizes the technical feasibility assessment comparing
// Wails v3 built-in SingleInstanceOptions with the ADR-0002 Unix Domain Socket / Named Pipe coordinator.
type EvaluationReport struct {
	Feature            string
	WailsV3Native      string
	CustomSocketIPC    string
	FeasibilityVerdict string
}

// GetEvaluationSummary returns the comparative evaluation matrix between Wails v3 native
// single-instance capabilities and the ADR-0002 local socket/pipe IPC coordinator.
func GetEvaluationSummary() []EvaluationReport {
	return []EvaluationReport{
		{
			Feature:            "IPC Transport Mechanism",
			WailsV3Native:      "Linux: D-Bus session bus (godbus/dbus) + file lock. Windows: Named mutex + Win32 window message. macOS: Distributed notifications.",
			CustomSocketIPC:    "Linux/macOS: Local Unix Domain Socket (AF_UNIX) with 0700 file permissions and POSIX flock. Windows: Named Pipe.",
			FeasibilityVerdict: "Custom socket IPC has zero external desktop dependencies; Wails v3 native requires active D-Bus session on Linux.",
		},
		{
			Feature:            "Headless & Test Environment Compatibility",
			WailsV3Native:      "Requires active DBUS_SESSION_BUS_ADDRESS on Linux. Fails in minimal containers, CI runners without D-Bus daemon, or SSH sessions without D-Bus.",
			CustomSocketIPC:    "Operates reliably in headless CI runners, containerized test suites, WSL2 without systemd/dbus, and standard desktops.",
			FeasibilityVerdict: "Custom socket IPC is superior for automated testability and isolated unit/integration test execution.",
		},
		{
			Feature:            "Security & Access Control",
			WailsV3Native:      "D-Bus bus names must match application ID conventions; optional AES encryption key (32 bytes).",
			CustomSocketIPC:    "Strict OS file permissions (0700 runtime directory, 0600 lockfile, 0700 socket). Access controlled strictly to current OS user UID. No network ports.",
			FeasibilityVerdict: "Both satisfy FR-OPEN-005 requirements for local-only, access-controlled coordination without network exposure.",
		},
		{
			Feature:            "Process Lifecycle & Application Coupling",
			WailsV3Native:      "Deeply coupled to Wails application.New() options. Calls os.Exit(exitCode) directly inside application.New() upon detecting second instance.",
			CustomSocketIPC:    "Decoupled Go package. Can coordinate CLI arguments before or alongside GUI initialization, enabling lightweight CLI commands or fallback behaviors.",
			FeasibilityVerdict: "Decoupled architecture allows flexible pre-GUI validation and robust multi-process testing.",
		},
		{
			Feature:            "Multi-Platform Portability",
			WailsV3Native:      "Built-in cross-platform implementations for Linux, Windows, macOS, iOS, and Android provided by Wails upstream.",
			CustomSocketIPC:    "Requires platform-specific build tags (Unix domain socket for Linux/macOS, Named Pipe for Windows).",
			FeasibilityVerdict: "Wails v3 provides native Windows window focus; custom IPC provides resilient transport across all POSIX targets.",
		},
	}
}
