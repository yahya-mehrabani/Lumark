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
xattr -cr "bin/Markdown Viewer.app"
```

#### Step 3.2: Sign the Application Bundle with Hardened Runtime
```bash
codesign --force --deep --options runtime \
  --entitlements packaging/macos/entitlements.plist \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --timestamp \
  "bin/Markdown Viewer.app"
```

#### Step 3.3: Verify Application Bundle Signature
```bash
codesign --verify --deep --strict --verbose=4 "bin/Markdown Viewer.app"
spctl --assess --type execute --verbose=4 "bin/Markdown Viewer.app"
```

### 4. Disk Image (DMG) Packaging & Signing

#### Step 4.1: Generate Branded DMG
```bash
./packaging/macos/create-dmg.sh bin "Markdown Viewer" bin
```

#### Step 4.2: Sign the DMG Artifact
```bash
codesign --force --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --timestamp \
  "bin/Markdown Viewer.dmg"
```

#### Step 4.3: Verify DMG Signature
```bash
codesign --verify --strict --verbose=4 "bin/Markdown Viewer.dmg"
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
xcrun notarytool submit "bin/Markdown Viewer.dmg" \
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
xcrun stapler staple "bin/Markdown Viewer.dmg"
xcrun stapler validate "bin/Markdown Viewer.dmg"
```

#### Step 6.2: Staple Notarization Ticket to App Bundle
```bash
xcrun stapler staple "bin/Markdown Viewer.app"
xcrun stapler validate "bin/Markdown Viewer.app"
```

#### Step 6.3: Validate Gatekeeper Assessment
```bash
spctl --assess --type open --context context:primary-signature --verbose=4 "bin/Markdown Viewer.dmg"
```

### 7. Unsigned Development Builds & Gatekeeper Quarantine Handling

When distributing ad-hoc test builds without an Apple Developer ID certificate:

1. **Ad-Hoc Signing (Local Only):**
   ```bash
   codesign --force --deep --sign - "bin/Markdown Viewer.app"
   ```

2. **Bypassing Gatekeeper Quarantine on Target Mac:**
   When opening downloaded unsigned binaries, macOS applies the `com.apple.quarantine` extended attribute. To remove quarantine:
   ```bash
   xattr -d com.apple.quarantine "/Applications/Markdown Viewer.app"
   ```
   Alternatively, users can right-click (Control-click) `Markdown Viewer.app` in Finder, select **Open**, and click **Open** in the confirmation dialog.
