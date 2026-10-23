# Packaging and Operating System Integration (Canonical Redirect)

**Document Status:** Canonical Baseline Specification<br>
**Authority:** Derived from [PRD.md](../PRD.md) Section 11 (Packaging and Distribution)<br>
**Canonical Path:** `docs/packaging.md`<br>

The authoritative, detailed Platform Support & Packaging specification is maintained at:
**[Platform Support & Packaging Architecture](architecture/PLATFORM-SUPPORT.md)**

---

## Quick Summary of Target Package Formats

1. **Windows 10/11 x64:** NSIS Installer (`.exe`), ProgID registration, Open With handler, clean uninstallation.
2. **Linux (Ubuntu 24.04 LTS x64):** Debian package (`.deb`), `.desktop` launcher, MIME database integration (`text/markdown`).
3. **macOS Apple Silicon (arm64):** Application bundle (`.app`) inside `.dmg`, Uniform Type Identifiers (`net.daringfireball.markdown`).

### 10-Point Association Test Matrix (PRD §11.5)
Each platform package must pass the 10-point test matrix covering clean installation, Open With registration, default association, multi-file launch, upgrade, and complete removal without orphaned entries.

For complete packaging scripts, metadata specifications, and verification procedures, see [`docs/architecture/PLATFORM-SUPPORT.md`](architecture/PLATFORM-SUPPORT.md).
