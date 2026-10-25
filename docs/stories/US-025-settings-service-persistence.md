# US-025: Versioned Settings Service & Atomic Persistence

- **Story ID:** `US-025`
- **Parent Epic:** [EPIC-007: Settings, Persistence & Durability](../epics/EPIC-007-settings-durability.md)
- **Status:** `DONE`
- **Assigned Phase:** Phase 5 (Reading Experience & Durability)

---

## 1. Objective and Expected Outcome

Implement a versioned, atomic local settings service in the Go backend (`internal/settings/`):
1. Store preferences locally in a versioned JSON file (`schemaVersion: 1`) located in the OS user configuration directory (e.g. `~/.config/markdown-viewer/settings.json` on Linux, `%APPDATA%\MarkdownViewer\settings.json` on Windows).
2. Atomic saving: write to a temporary file (`settings.json.tmp`), sync to disk, and replace atomically to prevent file corruption on sudden crash or power cut.
3. Resilience: If the settings file is missing, empty, or corrupted, automatically back up the bad file (`settings.json.corrupt.<timestamp>`), reset to default settings, and continue startup without crashing.
4. Provide a "Reset Settings to Default" action with clear confirmation explaining that preferences, not user documents, will be reset.
5. Strict data minimization: never store document text, credentials, or telemetry in settings.

---

## 2. Source PRD Requirements

- **FR-SET-001:** Preferences (Theme, default direction, default zoom, restore tabs, recent files).
- **FR-SET-002:** Settings migration (Versioned format, corruption recovery).
- **FR-SET-003:** Data minimization.
- **FR-SET-004:** Reset settings (Action to restore defaults).
- **PRD Section 10:** Data model and local persistence.

---

## 3. Dependencies

- **Prerequisites:** [US-005](US-005-native-document-service.md) (Native backend foundation).

---

## 4. Scope and Explicit Exclusions

- **In Scope:**
  - `internal/settings/service.go` and `dto.go`.
  - Atomic file write logic with cross-platform temp file rename.
  - Migration handler skeleton for future schema upgrades.
  - Preferences modal in frontend (`features/preferences/SettingsModal.tsx`).
- **Explicit Exclusions:**
  - SQL or embedded database (explicit non-goal; flat JSON file is sufficient).

---

## 5. Observable Acceptance Criteria

1. Changing a preference (e.g. switching Theme to "Dark") persists immediately to `settings.json`.
2. Closing and reopening the application restores the saved preferences.
3. Intentionally writing malformed garbage into `settings.json` and launching the app backs up the file and initializes fresh default settings without an error crash.
4. Clicking "Reset Settings" resets all preferences to defaults while leaving recent files or document files intact.
5. The `settings.json` file contains strictly configuration fields and never document contents.

---

## 6. Implementation Tasks

### Task US-025.1: Define SettingsDTO and versioned schema v1
- **Task ID:** `US-025.1`
- **Status:** `DONE`
- **Dependencies:** None
- **Completion Criteria:** Go struct with JSON tags for `schemaVersion`, `theme`, `defaultDirection`, `defaultZoom`, `restoreOpenTabs`.
- **Verification Command:** `go test -v -run TestSettingsPersistence ./internal/settings/...`
- **Expected Observable Result:** Settings saved to and loaded from JSON file with atomic write semantics.
- **Evidence to Record:** Go settings persistence test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-025.2: Implement atomic file writer and corruption recovery
- **Task ID:** `US-025.2`
- **Status:** `DONE`
- **Dependencies:** `US-025.1`
- **Completion Criteria:** Go service writes to temp file, syncs, renames; catches JSON unmarshal errors and triggers backup/fallback.
- **Verification Command:** `go test -v -run TestSettingsCorruptionRecovery ./internal/settings/...`
- **Expected Observable Result:** Corrupted settings JSON file triggers backup and reset to clean defaults.
- **Evidence to Record:** Corruption recovery test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-025.3: Implement Preferences UI modal in frontend
- **Task ID:** `US-025.3`
- **Status:** `DONE`
- **Dependencies:** `US-025.2`
- **Completion Criteria:** Modal offers dropdowns for Theme, Direction, Zoom, and a "Reset to Defaults" button.
- **Verification Command:** `go test -v -run TestSettingsReset ./internal/settings/...`
- **Expected Observable Result:** ResetSettings restores default theme, zoom, and direction values.
- **Evidence to Record:** Reset action test output.
- **Environment Handling:** Standard Go toolchain environment.

### Task US-025.4: Write comprehensive unit tests for settings service
- **Task ID:** `US-025.4`
- **Status:** `DONE`
- **Dependencies:** `US-025.3`
- **Completion Criteria:** Tests cover round-trip serialization, atomic replacement, and corrupted JSON recovery.
- **Verification Command:** `go test -v -race ./internal/settings/...`
- **Expected Observable Result:** Command/test exits with code 0 and verifies completion criteria.
- **Evidence to Record:** Execution log captured in Section 8.
- **Environment Handling:** Standard test environment.

---

## 7. Verification Instructions

1. Run unit tests: `go test -v -race ./internal/settings/...`.
2. Modify setting in UI: verify `~/.config/markdown-viewer/settings.json` updates atomically.
3. Corrupt settings file (`echo "bad json" > settings.json`): restart app, verify fresh defaults and `.corrupt` backup file.

---

## 8. Known Risks and Blockers

- Windows atomic rename over existing file requires `os.Rename` replacement handling on Windows NTFS.

---

## 9. Implementation Notes and Validation Evidence

### Task US-025.1 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `internal/settings/dto.go`
  - `internal/settings/service.go`
  - `internal/settings/service_test.go`
- **Verification Commands & Results:**
  - `go test -v -run TestSettingsPersistence ./internal/settings/...`: PASS
    ```text
    === RUN   TestSettingsPersistence
    --- PASS: TestSettingsPersistence (0.00s)
    PASS
    ok      markdown-viewer/internal/settings       0.004s
    ```
  - `golangci-lint run ./internal/settings/...`: PASS (0 issues)
  - `goimports -l ./internal/settings`: PASS (canonical formatting verified)
- **Observations:**
  - `SettingsDTO` correctly enforces schema v1, enumerated themes (`system`, `light`, `dark`), direction (`auto`, `rtl`, `ltr`), zoom bounds, and tab restoration flags.
  - Round-trip file persistence to disk verified with atomic temporary write semantics and zero document text / secrets (FR-SET-003 data minimization verified).

### Task US-025.2 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `internal/settings/service.go`
  - `internal/settings/service_test.go`
- **Verification Commands & Results:**
  - `go test -v -run TestSettingsCorruptionRecovery ./internal/settings/...`: PASS
    ```text
    === RUN   TestSettingsCorruptionRecovery
    2026/10/25 14:14:32 [Settings] Settings file /tmp/TestSettingsCorruptionRecovery1610190783/001/settings.json contains invalid JSON (invalid character 'B' looking for beginning of object key string); triggering corruption recovery
    2026/10/25 14:14:32 [Settings] Corrupted settings backed up to /tmp/TestSettingsCorruptionRecovery1610190783/001/settings.json.corrupt.20261025T104432Z (reason: json unmarshal error: invalid character 'B' looking for beginning of object key string)
    2026/10/25 14:14:32 [Settings] Settings file /tmp/TestSettingsCorruptionRecovery1610190783/001/settings.json is empty; triggering corruption recovery
    2026/10/25 14:14:32 [Settings] Corrupted settings backed up to /tmp/TestSettingsCorruptionRecovery1610190783/001/settings.json.corrupt.20261025T104432Z.461069902 (reason: empty file)
    --- PASS: TestSettingsCorruptionRecovery (0.00s)
    PASS
    ok      markdown-viewer/internal/settings       0.005s
    ```
  - `golangci-lint run ./internal/settings/...`: PASS (0 issues)
  - `goimports -l ./internal/settings`: PASS (0 issues)
- **Observations:**
  - Corrupted settings files with invalid JSON or 0-byte lengths are backed up cleanly to `.corrupt.<timestamp>` (with sub-second nanosecond collision avoidance) and reset to canonical defaults without crashing or failing startup.
  - Subsequent save and reload operations continue normally after recovery.
  - Temporary files created during atomic writes are cleanly synced and unlinked.

### Task US-025.3 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `internal/settings/service_test.go`
  - `frontend/src/features/preferences/types.ts`
  - `frontend/src/features/preferences/settingsStore.ts`
  - `frontend/src/features/preferences/SettingsModal.tsx`
  - `frontend/src/features/preferences/preferences.css`
  - `frontend/src/features/preferences/index.ts`
  - `frontend/src/features/preferences/SettingsModal.test.tsx`
  - `frontend/src/features/shell/AppShell.tsx`
  - `frontend/src/App.tsx`
  - `main.go`
- **Verification Commands & Results:**
  - `go test -v -run TestSettingsReset ./internal/settings/...`: PASS
    ```text
    === RUN   TestSettingsReset
    2026/10/25 14:26:32 [Settings] Preferences successfully reset to defaults
    --- PASS: TestSettingsReset (0.00s)
    PASS
    ok      markdown-viewer/internal/settings       0.003s
    ```
  - `npm run test:unit -- SettingsModal`: 13/13 PASS (0.27s)
  - `npx tsc --noEmit`: 0 type errors (PASS)
  - `npm run build`: Production bundle built in 4.32s (PASS)
  - `npm run test:unit`: 64 test files, 723 tests passed in 139.62s (PASS)
  - `go test -v ./...`: All Go packages passed (PASS)
  - `golangci-lint run ./...`: 0 issues found (PASS)
- **Observations:**
  - `SettingsModal` provides accessible dropdowns for Theme (System, Light, Dark), Direction (Auto, RTL, LTR), Zoom (50% to 250%), Tab restoration toggle, and Max recent files (10 to 50).
  - "Reset to Defaults" button displays a clear confirmation dialog explicitly noting that interface preferences (and never document files) are reset per FR-SET-004.
  - Confirming reset restores defaults across frontend state, `themeStore`, `directionPreferences`, `zoomController`, and Go backend persistence.
  - Integrated header button ("Preferences") and global keyboard shortcut (`Ctrl+,` / `Cmd+,`) in `AppShell`.

### Task US-025.4 Verification Evidence
- **Execution Date:** 2026-10-25
- **Agent ID:** Antigravity Autonomous Agent
- **Changed Files:**
  - `internal/settings/service_test.go`
- **Verification Commands & Results:**
  - `go test -count=1 -v -race ./internal/settings/...`: PASS (exit code 0)
    ```text
    === RUN   TestSettingsPersistence
    --- PASS: TestSettingsPersistence (0.00s)
    === RUN   TestSettingsCorruptionRecovery
    2026/10/25 15:23:32 [Settings] Settings file /tmp/TestSettingsCorruptionRecovery4256260916/001/settings.json contains invalid JSON (invalid character 'B' looking for beginning of object key string); triggering corruption recovery
    2026/10/25 15:23:32 [Settings] Corrupted settings backed up to /tmp/TestSettingsCorruptionRecovery4256260916/001/settings.json.corrupt.20261025T115332Z (reason: json unmarshal error: invalid character 'B' looking for beginning of object key string)
    2026/10/25 15:23:32 [Settings] Settings file /tmp/TestSettingsCorruptionRecovery4256260916/001/settings.json is empty; triggering corruption recovery
    2026/10/25 15:23:32 [Settings] Corrupted settings backed up to /tmp/TestSettingsCorruptionRecovery4256260916/001/settings.json.corrupt.20261025T115332Z.545109366 (reason: empty file)
    --- PASS: TestSettingsCorruptionRecovery (0.00s)
    === RUN   TestSettingsAtomicWrite
    --- PASS: TestSettingsAtomicWrite (0.00s)
    === RUN   TestSettingsReset
    2026/10/25 15:23:32 [Settings] Preferences successfully reset to defaults
    --- PASS: TestSettingsReset (0.00s)
    === RUN   TestSettingsNormalization
    === RUN   TestSettingsNormalization/Unknown_theme_and_direction
    === RUN   TestSettingsNormalization/Zoom_specified_as_percentage_(150%)
    === RUN   TestSettingsNormalization/Out_of_bounds_zoom_(500%_or_-20)
    === RUN   TestSettingsNormalization/Out_of_bounds_maxRecentFiles_(-5_or_500)
    --- PASS: TestSettingsNormalization (0.00s)
    === RUN   TestSettingsConcurrency
    --- PASS: TestSettingsConcurrency (0.03s)
    === RUN   TestSettingsMigrationCompatibility
    --- PASS: TestSettingsMigrationCompatibility (0.00s)
    PASS
    ok      markdown-viewer/internal/settings       1.062s
    ```
  - `go test -v -race ./...`: All repository packages passed under race detector (PASS)
  - `golangci-lint run ./...`: 0 issues found (PASS)
  - `govulncheck ./...`: 0 vulnerabilities found (PASS)
  - `npm run test:unit`: 64 test files, 723 tests passed (PASS)
  - `npm run build`: Exit code 0 (PASS)

### Story US-025 Completion Summary
- All 4 tasks (`US-025.1`, `US-025.2`, `US-025.3`, `US-025.4`) are complete and verified (`DONE`).
- Requirements `FR-SET-001`, `FR-SET-002`, `FR-SET-003`, and `FR-SET-004` are verified.
- Cross-platform validation for Windows and macOS is deferred to the post-implementation qualification process (`NOT RUN`).
