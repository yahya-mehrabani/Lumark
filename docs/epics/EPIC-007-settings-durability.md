# EPIC-007: Settings, Persistence & Durability

- **Epic ID:** `EPIC-007`
- **Title:** Settings, Persistence & Durability
- **Status:** `DRAFT`
- **Phase:** Phase 5 (Reading Experience & Durability)
- **Target Release:** MVP Durability

---

## 1. Objective and Scope

Implement reliable local persistence, external file monitoring, and fault isolation:
1. Versioned Go settings service saving user preferences atomically to disk (`schemaVersion: 1`), with automatic recovery from corruption and a reset-to-defaults mechanism.
2. Bounded recent-files list (maximum 20) with path deduplication and missing-file status indicators.
3. Debounced file-change detection watching active open files on disk, auto-reloading content while preserving scroll position.
4. Non-intrusive user error reporting and bounded local diagnostics logging (strictly excluding document contents).

---

## 2. Source PRD Requirements

- **FR-SET-001:** Preferences (Theme, default direction, default zoom, restore tabs, recent files)
- **FR-SET-002:** Settings migration (Versioned format, safe migration, corrupted file recovery)
- **FR-SET-003:** Data minimization (No document text, credentials, or telemetry stored)
- **FR-SET-004:** Reset settings (Action to restore defaults with clear confirmation)
- **FR-OPEN-006:** Recent files (Bounded to 20, missing file handling, no text content)
- **FR-OPEN-007:** File changed on disk (Debounced external change watcher, scroll preservation)
- **FR-ERR-001:** Actionable errors (Plain-language error messages, no raw stack traces)
- **FR-ERR-002:** Fault isolation (Component errors do not corrupt settings or crash app)
- **FR-ERR-003:** Local diagnostics (Bounded local log without document text)
- **PRD Section 10:** Data model and local persistence specifications

---

## 3. Dependencies

- **Preceding Epic:** `EPIC-002` (Native application services and shell).

---

## 4. Major Risks

- File watcher race conditions or event flooding when a file is saved rapidly by an external editor.
- Settings file corruption during sudden system shutdown (mitigated by atomic write via temporary file).

---

## 5. Exit Criteria

- Preferences persist across app restarts and can be reset cleanly.
- Corrupted `settings.json` is automatically backed up and reset to defaults without crashing startup.
- Modifying a document externally triggers smooth debounced reload in the open tab.
- Recent files list displays up to 20 entries with non-existent files marked.
- Logs rotate, stay bounded in size, and contain zero document text.

---

## 6. Included User Stories

- [US-025: Versioned Settings Service & Atomic Persistence](../stories/US-025-settings-service-persistence.md)
- [US-026: Recent Files Tracking & Startup Tab Restoration](../stories/US-026-recent-files-tab-restore.md)
- [US-027: File Change Watcher & Debounced Auto-Reload](../stories/US-027-file-change-watcher.md)
- [US-028: Fault Isolation, User-Facing Error Notifications & Local Diagnostics](../stories/US-028-fault-isolation-diagnostics.md)
