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

---

## macOS Code Signing and Notarization Workflow

This section provides reproducible instructions for signing and notarizing macOS release artifacts per PRD Section 11.3 and Task `US-030.4`.

### 1. Prerequisites and Credentials

- macOS host machine or GitHub Actions `macos-latest` runner with Xcode Command Line Tools installed (`codesign`, `xcrun notarytool`, `xcrun stapler`, `spctl`).
- Active Apple Developer Program membership.
- **Developer ID Application Certificate** installed in Keychain (e.g. `Developer ID Application: Company Name (TEAM_ID)`).
- **App Store Connect API Key** or App-Specific Password for `notarytool` authentication.

### 2. Entitlements Configuration

Hardened Runtime entitlements are defined in `packaging/macos/entitlements.plist` (and `build/darwin/entitlements.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

These entitlements enable WebKit JavaScript JIT execution and Go runtime dynamic memory management under macOS Hardened Runtime.

### 3. Step-by-Step Code Signing Procedure

#### Step 3.1: Clean Extended Attributes
```bash
xattr -cr "bin/Lumark.app"
```

#### Step 3.2: Sign the Application Bundle with Hardened Runtime
```bash
codesign --force --deep --options runtime \
  --entitlements packaging/macos/entitlements.plist \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --timestamp \
  "bin/Lumark.app"
```

#### Step 3.3: Verify Application Bundle Signature
```bash
codesign --verify --deep --strict --verbose=4 "bin/Lumark.app"
spctl --assess --type execute --verbose=4 "bin/Lumark.app"
```

### 4. Disk Image (DMG) Packaging & Signing

#### Step 4.1: Generate Branded DMG
```bash
./packaging/macos/create-dmg.sh bin "Lumark" bin
```

#### Step 4.2: Sign the DMG Artifact
```bash
codesign --force --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --timestamp \
  "bin/Lumark.dmg"
```

#### Step 4.3: Verify DMG Signature
```bash
codesign --verify --strict --verbose=4 "bin/Lumark.dmg"
```

### 5. Apple Notarization with `xcrun notarytool`

#### Step 5.1: Store Keychain Credentials Profile
```bash
xcrun notarytool store-credentials "AC_PASSWORD" \
  --apple-id "developer@example.com" \
  --team-id "TEAM_ID" \
  --password "xxxx-xxxx-xxxx-xxxx"
```

#### Step 5.2: Submit DMG for Notarization
```bash
xcrun notarytool submit "bin/Lumark.dmg" \
  --keychain-profile "AC_PASSWORD" \
  --wait
```

#### Step 5.3: Inspect Notarization Log (if status is Invalid)
```bash
xcrun notarytool log <SUBMISSION_ID> --keychain-profile "AC_PASSWORD"
```

### 6. Ticket Stapling and Gatekeeper Assessment

#### Step 6.1: Staple Notarization Ticket to DMG
```bash
xcrun stapler staple "bin/Lumark.dmg"
xcrun stapler validate "bin/Lumark.dmg"
```

#### Step 6.2: Staple Notarization Ticket to App Bundle
```bash
xcrun stapler staple "bin/Lumark.app"
xcrun stapler validate "bin/Lumark.app"
```

#### Step 6.3: Validate Gatekeeper Assessment
```bash
spctl --assess --type open --context context:primary-signature --verbose=4 "bin/Lumark.dmg"
```

### 7. Unsigned Development Builds & Gatekeeper Quarantine Handling

When distributing ad-hoc test builds without an Apple Developer ID certificate:

1. **Ad-Hoc Signing (Local Only):**
   ```bash
   codesign --force --deep --sign - "bin/Lumark.app"
   ```

2. **Bypassing Gatekeeper Quarantine on Target Mac:**
   When opening downloaded unsigned binaries, macOS applies the `com.apple.quarantine` extended attribute. To remove quarantine:
   ```bash
   xattr -d com.apple.quarantine "/Applications/Lumark.app"
   ```
   Alternatively, users can right-click (Control-click) `Lumark.app` in Finder, select **Open**, and click **Open** in the confirmation dialog.

---

## Linux Debian Package (.deb) and AppImage Distribution Workflow

This section provides reproducible instructions for packaging, installing, and verifying Linux distribution artifacts per PRD Section 11.4 and Story `US-031`.

### 1. Target Distribution & Runtime Dependencies

- **Primary Target OS:** Ubuntu 24.04 LTS x64 (compatible with modern Debian 13+ and Ubuntu 26.04).
- **Required Runtime Libraries (declared in Debian `control`):**
  - `libc6` (>= 2.38)
  - `libgtk-4-1` (>= 4.12.0) or `libgtk-3-0` (>= 3.24.0)
  - `libwebkitgtk-6.0-4` (>= 2.40.0) or `libwebkit2gtk-4.1-0` (>= 2.40.0)

### 2. Desktop Launcher and MIME Type Associations

Standard assets installed by the Debian package:
- **Binary:** `/usr/bin/lumark` (mode 0755, with `/usr/bin/markdown-viewer` compatibility symlink)
- **Desktop Entry:** `/usr/share/applications/lumark.desktop` (mode 0644, with `markdown-viewer.desktop` symlink)
  - `Exec=lumark %F` (supports multi-file argument lists)
  - `Categories=Utility;TextEditor;Viewer;`
  - `MimeType=text/markdown;text/x-markdown;`
  - `StartupNotify=true` and `StartupWMClass=lumark`
- **Application Icons:**
  - Scalable vector icon: `/usr/share/icons/hicolor/scalable/apps/lumark.svg`
  - Raster icon: `/usr/share/icons/hicolor/128x128/apps/lumark.png`
- **MIME Policy:** Strictly excludes `text/plain` to prevent intercepting ordinary text files.

### 3. Maintainer Script Hooks

Debian package maintainer scripts (`packaging/linux/debian/`):
- `postinst`: Executes `update-desktop-database -q /usr/share/applications`, `update-mime-database /usr/share/mime`, and `gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor` guarded by POSIX `command -v`.
- `postrm`: Executes database and icon cache updates on `remove` and `purge` actions.
- `prerm`: Executes pre-removal teardown.

### 4. Step-by-Step Package Build Procedure

#### Step 4.1: Build Debian Package
```bash
./packaging/linux/build-deb.sh
# Or via npm script:
npm run build:deb
```
Outputs:
- Versioned: `build/bin/lumark_0.1.0-1_amd64.deb`
- Canonical: `build/bin/lumark.deb`

#### Step 4.2: Inspect Package Metadata & File Tree
```bash
dpkg-deb -I build/bin/lumark_0.1.0-1_amd64.deb
dpkg-deb -c build/bin/lumark_0.1.0-1_amd64.deb
```

#### Step 4.3: Build AppImage Pipeline
```bash
./packaging/linux/build-appimage.sh
```
Stages `build/staging/Lumark.AppDir` containing executable `AppRun`, root `.desktop`, icons, and binary, and generates `build/bin/Lumark.AppImage` when `linuxdeploy` or `appimagetool` is available (or portable `Lumark.AppDir.tar.gz`).

#### Step 4.4: Run Linux Package Verification Suite
```bash
npm run test:package:linux
```
Verifies control metadata, binary location (`/usr/bin/lumark`), permissions, FreeDesktop specification compliance, MIME exclusions, maintainer scripts, and AppDir layout.
