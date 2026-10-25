package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
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
	if initial.MaxRecentFiles != 20 {
		t.Errorf("Expected default maxRecentFiles 20, got %d", initial.MaxRecentFiles)
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
