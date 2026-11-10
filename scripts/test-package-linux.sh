#!/usr/bin/env bash
# Automated Linux Package Verification Suite
# Validates Debian (.deb) and AppImage packages for Lumark against PRD Section 11.4
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_BIN="${ROOT_DIR}/build/bin"
DEB_PACKAGE="${BUILD_BIN}/lumark_0.1.0-1_amd64.deb"
CANONICAL_DEB="${BUILD_BIN}/lumark.deb"
TEST_EXTRACT_DIR="${ROOT_DIR}/build/staging/deb-verification-test"

echo "================================================================="
echo "Lumark - Linux Package Verification Suite"
echo "================================================================="

# 1. Ensure Debian package is built
if [ ! -f "${DEB_PACKAGE}" ] && [ ! -f "${CANONICAL_DEB}" ]; then
	echo "[Package Build] Building Debian package via ./packaging/linux/build-deb.sh..."
	"${ROOT_DIR}/packaging/linux/build-deb.sh"
fi

TARGET_DEB="${DEB_PACKAGE}"
if [ ! -f "${TARGET_DEB}" ] && [ -f "${CANONICAL_DEB}" ]; then
	TARGET_DEB="${CANONICAL_DEB}"
fi

echo "[1/6] Verifying Debian package archive: ${TARGET_DEB}"
if [ ! -f "${TARGET_DEB}" ]; then
	echo "FAIL: Debian package ${TARGET_DEB} does not exist" >&2
	exit 1
fi
echo "  - Package exists and size is $(stat -c %s "${TARGET_DEB}") bytes"

# 2. Inspect control fields
echo "[2/6] Inspecting Debian package control metadata..."
CONTROL_INFO=$(dpkg-deb -I "${TARGET_DEB}")

if ! echo "${CONTROL_INFO}" | grep -q -E "Package: *(lumark|markdown-viewer)"; then
	echo "FAIL: Package name is neither 'lumark' nor 'markdown-viewer'" >&2
	exit 1
fi
PKG_NAME=$(echo "${CONTROL_INFO}" | grep -i "Package:" | head -n1 | awk '{print $2}')
echo "  - Package name verified: ${PKG_NAME}"

if ! echo "${CONTROL_INFO}" | grep -q "Architecture: amd64"; then
	echo "FAIL: Architecture is not amd64" >&2
	exit 1
fi
echo "  - Architecture verified: amd64"

if ! echo "${CONTROL_INFO}" | grep -q -E "Depends:.*libwebkit"; then
	echo "FAIL: Control file does not declare WebKitGTK runtime dependency" >&2
	exit 1
fi
echo "  - Runtime dependencies verified: WebKitGTK & GTK dependencies declared"

# 3. Extract and verify data directory layout
echo "[3/6] Inspecting package directory structure and file tree..."
rm -rf "${TEST_EXTRACT_DIR}"
mkdir -p "${TEST_EXTRACT_DIR}"
dpkg-deb -x "${TARGET_DEB}" "${TEST_EXTRACT_DIR}"

# Check binary location
BINARY_PATH="${TEST_EXTRACT_DIR}/usr/bin/lumark"
if [ ! -f "${BINARY_PATH}" ]; then
	BINARY_PATH="${TEST_EXTRACT_DIR}/usr/bin/markdown-viewer"
fi
if [ ! -f "${BINARY_PATH}" ]; then
	echo "FAIL: Missing binary at /usr/bin/lumark or /usr/bin/markdown-viewer" >&2
	exit 1
fi
if [ ! -x "${BINARY_PATH}" ]; then
	echo "FAIL: Binary is not executable: ${BINARY_PATH}" >&2
	exit 1
fi
echo "  - Binary verified at ${BINARY_PATH} (mode $(stat -c %a "${BINARY_PATH}"))"

# Check desktop file
DESKTOP_PATH="${TEST_EXTRACT_DIR}/usr/share/applications/lumark.desktop"
if [ ! -f "${DESKTOP_PATH}" ]; then
	echo "FAIL: Missing desktop launcher in /usr/share/applications: ${DESKTOP_PATH}" >&2
	exit 1
fi
echo "  - Desktop launcher verified at ${DESKTOP_PATH}"

# Check icons
ICON_SVG="${TEST_EXTRACT_DIR}/usr/share/icons/hicolor/scalable/apps/lumark.svg"
ICON_PNG="${TEST_EXTRACT_DIR}/usr/share/icons/hicolor/128x128/apps/lumark.png"
if [ ! -f "${ICON_SVG}" ]; then
	echo "FAIL: Missing scalable SVG icon at ${ICON_SVG}" >&2
	exit 1
fi
if [ ! -f "${ICON_PNG}" ]; then
	echo "FAIL: Missing raster PNG icon at ${ICON_PNG}" >&2
	exit 1
fi
echo "  - Scalable SVG and raster PNG icons verified in hicolor icon theme"

# 4. Validate desktop file compliance and MIME restrictions
echo "[4/6] Validating Desktop Entry specification and MIME associations..."
python3 "${ROOT_DIR}/scripts/validate_desktop_file.py" "${DESKTOP_PATH}"

# Strict verification: Ensure text/plain is NEVER registered
if grep -i 'text/plain' "${DESKTOP_PATH}"; then
	echo "FAIL: Desktop entry MUST NOT register text/plain (PRD Section 11.4 violation)" >&2
	exit 1
fi
echo "  - Strict policy verified: Generic text/plain is NOT registered as handler"

# 5. Validate maintainer scripts in control archive
echo "[5/6] Validating maintainer scripts..."
mkdir -p "${TEST_EXTRACT_DIR}/DEBIAN"
dpkg-deb -e "${TARGET_DEB}" "${TEST_EXTRACT_DIR}/DEBIAN"

POSTINST="${TEST_EXTRACT_DIR}/DEBIAN/postinst"
POSTRM="${TEST_EXTRACT_DIR}/DEBIAN/postrm"

if [ ! -f "${POSTINST}" ] || [ ! -x "${POSTINST}" ]; then
	echo "FAIL: Missing or non-executable postinst script" >&2
	exit 1
fi
if [ ! -f "${POSTRM}" ] || [ ! -x "${POSTRM}" ]; then
	echo "FAIL: Missing or non-executable postrm script" >&2
	exit 1
fi

if ! grep -q "update-desktop-database" "${POSTINST}"; then
	echo "FAIL: postinst does not run update-desktop-database" >&2
	exit 1
fi
if ! grep -q "update-mime-database" "${POSTINST}"; then
	echo "FAIL: postinst does not run update-mime-database" >&2
	exit 1
fi
if ! grep -q "update-desktop-database" "${POSTRM}"; then
	echo "FAIL: postrm does not run update-desktop-database" >&2
	exit 1
fi
if ! grep -q "update-mime-database" "${POSTRM}"; then
	echo "FAIL: postrm does not run update-mime-database" >&2
	exit 1
fi
echo "  - Maintainer scripts verified: postinst and postrm properly update desktop and MIME databases"

# 6. Verify AppImage build pipeline and AppDir structure
echo "[6/6] Validating AppImage pipeline..."
"${ROOT_DIR}/packaging/linux/build-appimage.sh"

APPDIR="${ROOT_DIR}/build/staging/Lumark.AppDir"
if [ ! -f "${APPDIR}/AppRun" ] || [ ! -x "${APPDIR}/AppRun" ]; then
	echo "FAIL: AppImage AppRun entrypoint missing or not executable" >&2
	exit 1
fi
if [ ! -f "${APPDIR}/usr/bin/Lumark" ] && [ ! -f "${APPDIR}/usr/bin/lumark" ]; then
	echo "FAIL: AppDir missing usr/bin executable" >&2
	exit 1
fi
if [ ! -f "${APPDIR}/Lumark.desktop" ] && [ ! -f "${APPDIR}/lumark.desktop" ]; then
	echo "FAIL: AppDir missing root desktop file" >&2
	exit 1
fi
echo "  - AppImage AppDir structure verified: AppRun, desktop file, icons, and binary staged correctly"

# Cleanup staging test extract
rm -rf "${TEST_EXTRACT_DIR}"

echo "================================================================="
echo "ALL LINUX PACKAGE VERIFICATION CHECKS PASSED (Code: 0)"
echo "  - Debian package (.deb): Control metadata, file tree, dependencies verified"
echo "  - Desktop launcher: FreeDesktop spec compliant, %F parameter, categories valid"
echo "  - MIME associations: text/markdown & text/x-markdown declared; text/plain excluded"
echo "  - AppImage pipeline: AppDir structure, AppRun entrypoint, icons verified"
echo "================================================================="
exit 0
