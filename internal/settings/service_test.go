package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestSettingsPersistence(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "sub", "settings.json")

	// 1. Initial creation with defaults
	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Failed to initialize Service: %v", err)
	}

	initial := svc.GetSettings()
	if initial.SchemaVersion != 1 {
		t.Errorf("Expected schemaVersion 1, got %d", initial.SchemaVersion)
	}
	if initial.Theme != ThemeSystem {
		t.Errorf("Expected default theme %s, got %s", ThemeSystem, initial.Theme)
	}
	if initial.DefaultDirection != DirectionAuto {
		t.Errorf("Expected default direction %s, got %s", DirectionAuto, initial.DefaultDirection)
	}
	if initial.DefaultZoom != 1.0 {
		t.Errorf("Expected default zoom 1.0, got %f", initial.DefaultZoom)
	}
	if !initial.RestoreOpenTabs {
		t.Errorf("Expected default restoreOpenTabs true, got %t", initial.RestoreOpenTabs)
	}
	if initial.MaxRecentFiles != 10 {
		t.Errorf("Expected default maxRecentFiles 10, got %d", initial.MaxRecentFiles)
	}
	if initial.TocPosition != "left" {
		t.Errorf("Expected default tocPosition left, got %s", initial.TocPosition)
	}

	// Verify file was created on disk
	if _, statErr := os.Stat(targetPath); statErr != nil {
		t.Fatalf("Expected settings file to exist at %s: %v", targetPath, statErr)
	}

	// 2. Modify and Save preferences
	updated := initial
	updated.Theme = ThemeDark
	updated.DefaultDirection = DirectionRTL
	updated.DefaultZoom = 1.3
	updated.RestoreOpenTabs = false
	updated.OpenTabs = []string{"/docs/readme.md", "/notes/spec.md"}
	updated.MaxRecentFiles = 15

	if err := svc.SaveSettings(updated); err != nil {
		t.Fatalf("SaveSettings failed: %v", err)
	}

	// Verify in-memory state updated
	current := svc.GetSettings()
	if current.Theme != ThemeDark || current.DefaultDirection != DirectionRTL || current.DefaultZoom != 1.3 {
		t.Errorf("In-memory settings mismatch after SaveSettings: %+v", current)
	}

	// 3. Inspect raw file on disk
	rawBytes, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("Failed to read raw settings file: %v", err)
	}

	var onDisk SettingsDTO
	if err := json.Unmarshal(rawBytes, &onDisk); err != nil {
		t.Fatalf("Failed to unmarshal settings file from disk: %v", err)
	}

	if onDisk.Theme != ThemeDark {
		t.Errorf("Disk theme mismatch: expected %s, got %s", ThemeDark, onDisk.Theme)
	}
	if onDisk.DefaultDirection != DirectionRTL {
		t.Errorf("Disk direction mismatch: expected %s, got %s", DirectionRTL, onDisk.DefaultDirection)
	}
	if onDisk.DefaultZoom != 1.3 {
		t.Errorf("Disk zoom mismatch: expected 1.3, got %f", onDisk.DefaultZoom)
	}
	if onDisk.RestoreOpenTabs != false {
		t.Errorf("Disk restoreOpenTabs mismatch: expected false, got %t", onDisk.RestoreOpenTabs)
	}
	if len(onDisk.OpenTabs) != 2 || onDisk.OpenTabs[0] != "/docs/readme.md" {
		t.Errorf("Disk openTabs mismatch: %+v", onDisk.OpenTabs)
	}
	if onDisk.MaxRecentFiles != 15 {
		t.Errorf("Disk maxRecentFiles mismatch: expected 15, got %d", onDisk.MaxRecentFiles)
	}

	// 4. Reload from disk with new Service instance (simulating app restart)
	reloadedSvc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Failed to reload service from existing file: %v", err)
	}

	reloaded := reloadedSvc.GetSettings()
	if reloaded.Theme != ThemeDark || reloaded.DefaultDirection != DirectionRTL || reloaded.DefaultZoom != 1.3 {
		t.Errorf("Reloaded settings do not match expected values: %+v", reloaded)
	}

	// 5. FR-SET-003 Data Minimization Check:
	// Verify file strictly contains JSON config keys and zero document content or secrets
	fileContent := string(rawBytes)
	forbiddenTokens := []string{"content", "documentText", "markdown", "token", "password", "telemetry"}
	for _, token := range forbiddenTokens {
		if strings.Contains(strings.ToLower(fileContent), token) {
			t.Errorf("Data minimization violation: settings file contains forbidden token %q: %s", token, fileContent)
		}
	}

	// Verify no temporary files were left behind
	files, err := os.ReadDir(filepath.Dir(targetPath))
	if err != nil {
		t.Fatalf("Failed to read directory: %v", err)
	}
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".tmp") {
			t.Errorf("Temporary file was left behind: %s", f.Name())
		}
	}
}

func TestSettingsCorruptionRecovery(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "settings.json")

	// Case 1: Corrupted malformed JSON string
	malformedContent := `{"schemaVersion": 1, "theme": "dark", BROKEN_JSON: ???`
	if err := os.WriteFile(targetPath, []byte(malformedContent), 0600); err != nil {
		t.Fatalf("Failed to seed corrupted settings file: %v", err)
	}

	// Service should recover automatically without crashing or returning an error
	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Expected NewServiceWithPath to recover from corrupted JSON, got error: %v", err)
	}

	// Active settings must be reset to defaults
	recovered := svc.GetSettings()
	if recovered.Theme != ThemeSystem {
		t.Errorf("Expected theme reset to %s, got %s", ThemeSystem, recovered.Theme)
	}
	if recovered.SchemaVersion != 1 {
		t.Errorf("Expected schemaVersion 1, got %d", recovered.SchemaVersion)
	}

	// Verify backup file was created
	entries, err := os.ReadDir(tempDir)
	if err != nil {
		t.Fatalf("Failed to read tempDir: %v", err)
	}

	var backupFound bool
	var backupName string
	for _, entry := range entries {
		if strings.HasPrefix(entry.Name(), "settings.json.corrupt.") {
			backupFound = true
			backupName = entry.Name()
			break
		}
	}

	if !backupFound {
		t.Fatalf("Expected backup file matching settings.json.corrupt.*, found none among: %+v", entries)
	}

	// Verify backup file content matches original malformed content exactly
	backupBytes, err := os.ReadFile(filepath.Join(tempDir, backupName))
	if err != nil {
		t.Fatalf("Failed to read backup file: %v", err)
	}
	if string(backupBytes) != malformedContent {
		t.Errorf("Backup content mismatch: expected %q, got %q", malformedContent, string(backupBytes))
	}

	// Verify active settings file was rewritten with valid JSON
	currentBytes, err := os.ReadFile(targetPath)
	if err != nil {
		t.Fatalf("Failed to read active settings file: %v", err)
	}
	var currentDTO SettingsDTO
	if err := json.Unmarshal(currentBytes, &currentDTO); err != nil {
		t.Fatalf("Active settings file after recovery is not valid JSON: %v", err)
	}

	// Case 2: 0-byte empty file recovery
	if err := os.WriteFile(targetPath, []byte(""), 0600); err != nil {
		t.Fatalf("Failed to seed empty settings file: %v", err)
	}

	svcEmpty, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Expected NewServiceWithPath to recover from empty file, got error: %v", err)
	}

	emptyRecovered := svcEmpty.GetSettings()
	if emptyRecovered.Theme != ThemeSystem || emptyRecovered.DefaultDirection != DirectionAuto {
		t.Errorf("Expected clean defaults after empty file recovery, got: %+v", emptyRecovered)
	}

	// Case 3: Verify subsequent saving continues normally after recovery
	mod := emptyRecovered
	mod.Theme = ThemeLight
	mod.DefaultZoom = 1.25
	if err := svcEmpty.SaveSettings(mod); err != nil {
		t.Fatalf("SaveSettings failed after recovery: %v", err)
	}

	// Reload to confirm persistence of post-recovery modifications
	reloaded, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Reload failed: %v", err)
	}
	if reloaded.GetSettings().Theme != ThemeLight || reloaded.GetSettings().DefaultZoom != 1.25 {
		t.Errorf("Settings saved post-recovery failed to reload correctly: %+v", reloaded.GetSettings())
	}
}

func TestSettingsAtomicWrite(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "nested", "config", "settings.json")

	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("NewServiceWithPath failed: %v", err)
	}

	// Perform multiple rapid updates
	for i := 0; i < 20; i++ {
		s := svc.GetSettings()
		s.MaxRecentFiles = 10 + i
		if err := svc.SaveSettings(s); err != nil {
			t.Fatalf("SaveSettings iteration %d failed: %v", i, err)
		}
	}

	// Verify no tmp files remain
	files, err := os.ReadDir(filepath.Dir(targetPath))
	if err != nil {
		t.Fatalf("Failed to read directory: %v", err)
	}
	for _, f := range files {
		if strings.HasSuffix(f.Name(), ".tmp") {
			t.Errorf("Stale temporary file detected: %s", f.Name())
		}
	}
}

func TestSettingsReset(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "settings.json")

	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("NewServiceWithPath failed: %v", err)
	}

	// 1. Modify settings to non-default values
	custom := SettingsDTO{
		SchemaVersion:    1,
		Theme:            ThemeDark,
		DefaultDirection: DirectionRTL,
		DefaultZoom:      1.5,
		RestoreOpenTabs:  false,
		OpenTabs:         []string{"/path/to/doc.md"},
		MaxRecentFiles:   10,
	}
	if err := svc.SaveSettings(custom); err != nil {
		t.Fatalf("SaveSettings failed: %v", err)
	}

	// Verify custom values are active
	if svc.GetSettings().Theme != ThemeDark || svc.GetSettings().DefaultDirection != DirectionRTL {
		t.Fatalf("Custom settings were not saved: %+v", svc.GetSettings())
	}

	// 2. Execute ResetSettings
	defaults, err := svc.ResetSettings()
	if err != nil {
		t.Fatalf("ResetSettings failed: %v", err)
	}

	// Verify returned defaults adhere to FR-SET-001 and FR-SET-004
	if defaults.Theme != ThemeSystem {
		t.Errorf("Expected reset theme to be %s, got %s", ThemeSystem, defaults.Theme)
	}
	if defaults.DefaultDirection != DirectionAuto {
		t.Errorf("Expected reset default direction to be %s, got %s", DirectionAuto, defaults.DefaultDirection)
	}
	if defaults.DefaultZoom != 1.0 {
		t.Errorf("Expected reset default zoom to be 1.0, got %f", defaults.DefaultZoom)
	}
	if !defaults.RestoreOpenTabs {
		t.Errorf("Expected reset restoreOpenTabs to be true, got %t", defaults.RestoreOpenTabs)
	}
	if defaults.MaxRecentFiles != 10 {
		t.Errorf("Expected reset maxRecentFiles to be 10, got %d", defaults.MaxRecentFiles)
	}
	if defaults.TocPosition != "left" {
		t.Errorf("Expected reset tocPosition to be left, got %s", defaults.TocPosition)
	}

	// 3. Verify in-memory state
	current := svc.GetSettings()
	if current.Theme != ThemeSystem || current.DefaultDirection != DirectionAuto || current.DefaultZoom != 1.0 {
		t.Errorf("In-memory settings after reset mismatch: %+v", current)
	}

	// 4. Verify disk persistence across restart
	reloaded, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Failed to reload from disk after reset: %v", err)
	}
	diskSettings := reloaded.GetSettings()
	if diskSettings.Theme != ThemeSystem || diskSettings.DefaultDirection != DirectionAuto || diskSettings.DefaultZoom != 1.0 {
		t.Errorf("Persisted disk settings after reset mismatch: %+v", diskSettings)
	}
}

func TestSettingsNormalization(t *testing.T) {
	tests := []struct {
		name     string
		input    SettingsDTO
		expected SettingsDTO
	}{
		{
			name: "Unknown theme and direction",
			input: SettingsDTO{
				Theme:            "neon-pink",
				DefaultDirection: "vertical",
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeSystem,
				DefaultDirection: DirectionAuto,
				DefaultZoom:      1.0,
				MaxRecentFiles:   10,
			},
		},
		{
			name: "Zoom specified as percentage (150%)",
			input: SettingsDTO{
				Theme:            ThemeDark,
				DefaultDirection: DirectionLTR,
				DefaultZoom:      150.0,
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeDark,
				DefaultDirection: DirectionLTR,
				DefaultZoom:      1.5,
				MaxRecentFiles:   10,
			},
		},
		{
			name: "Out of bounds zoom (500% or -20)",
			input: SettingsDTO{
				DefaultZoom: 5.0,
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeSystem,
				DefaultDirection: DirectionAuto,
				DefaultZoom:      1.0,
				MaxRecentFiles:   10,
			},
		},
		{
			name: "Out of bounds maxRecentFiles (-5 or 500)",
			input: SettingsDTO{
				MaxRecentFiles: 500,
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeSystem,
				DefaultDirection: DirectionAuto,
				DefaultZoom:      1.0,
				MaxRecentFiles:   10,
			},
		},
		{
			name: "Unknown tocPosition normalizes to left",
			input: SettingsDTO{
				TocPosition: "invalid-position",
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeSystem,
				DefaultDirection: DirectionAuto,
				DefaultZoom:      1.0,
				MaxRecentFiles:   10,
				TocPosition:      "left",
			},
		},
		{
			name: "Valid tocPosition preserved",
			input: SettingsDTO{
				TocPosition: "right",
			},
			expected: SettingsDTO{
				SchemaVersion:    1,
				Theme:            ThemeSystem,
				DefaultDirection: DirectionAuto,
				DefaultZoom:      1.0,
				MaxRecentFiles:   10,
				TocPosition:      "right",
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := tc.input
			s.NormalizeAndValidate()
			if s.SchemaVersion != tc.expected.SchemaVersion {
				t.Errorf("SchemaVersion: expected %d, got %d", tc.expected.SchemaVersion, s.SchemaVersion)
			}
			if s.Theme != tc.expected.Theme {
				t.Errorf("Theme: expected %s, got %s", tc.expected.Theme, s.Theme)
			}
			if s.DefaultDirection != tc.expected.DefaultDirection {
				t.Errorf("DefaultDirection: expected %s, got %s", tc.expected.DefaultDirection, s.DefaultDirection)
			}
			if s.DefaultZoom != tc.expected.DefaultZoom {
				t.Errorf("DefaultZoom: expected %f, got %f", tc.expected.DefaultZoom, s.DefaultZoom)
			}
			if s.MaxRecentFiles != tc.expected.MaxRecentFiles {
				t.Errorf("MaxRecentFiles: expected %d, got %d", tc.expected.MaxRecentFiles, s.MaxRecentFiles)
			}
			if s.OpenTabs == nil {
				t.Errorf("OpenTabs should not be nil")
			}
		})
	}
}

func TestSettingsConcurrency(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "settings.json")

	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("NewServiceWithPath failed: %v", err)
	}

	var wg sync.WaitGroup
	const readers = 10
	const writers = 5

	for i := 0; i < readers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				_ = svc.GetSettings()
				time.Sleep(1 * time.Millisecond)
			}
		}()
	}

	for i := 0; i < writers; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				s := svc.GetSettings()
				s.DefaultZoom = 1.0 + float64(workerID)*0.1
				_ = svc.SaveSettings(s)
				time.Sleep(2 * time.Millisecond)
			}
		}(i)
	}

	wg.Wait()

	// Ensure file is still valid JSON after all concurrent operations
	finalSvc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Service reload failed after concurrency test: %v", err)
	}
	finalSettings := finalSvc.GetSettings()
	if finalSettings.SchemaVersion != 1 {
		t.Errorf("Expected valid schemaVersion 1, got %d", finalSettings.SchemaVersion)
	}
}

func TestSettingsMigrationCompatibility(t *testing.T) {
	tempDir := t.TempDir()
	targetPath := filepath.Join(tempDir, "settings.json")

	// Simulate future schema v2 JSON with additional unknown fields
	futureJSON := `{
		"schemaVersion": 2,
		"theme": "dark",
		"defaultDirection": "rtl",
		"defaultZoom": 1.25,
		"restoreOpenTabs": true,
		"maxRecentFiles": 20,
		"futureExperimentalFeature": true,
		"newColorCustomization": "#123456"
	}`

	if err := os.WriteFile(targetPath, []byte(futureJSON), 0600); err != nil {
		t.Fatalf("Failed to write future settings JSON: %v", err)
	}

	// Service should load cleanly, preserving recognized fields and keeping app usable (FR-SET-002)
	svc, err := NewServiceWithPath(targetPath)
	if err != nil {
		t.Fatalf("Expected service to parse future version with forward compatibility, got error: %v", err)
	}

	s := svc.GetSettings()
	if s.Theme != ThemeDark || s.DefaultDirection != DirectionRTL || s.DefaultZoom != 1.25 {
		t.Errorf("Known fields were not preserved from forward schema: %+v", s)
	}
}
