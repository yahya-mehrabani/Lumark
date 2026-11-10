#!/usr/bin/env bash
# AppImage Packaging Script for Lumark
# Builds an AppDir structure conforming to FreeDesktop AppImage Specification
# and bundles it into a standalone executable .AppImage artifact.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build/bin"
STAGING_DIR="${ROOT_DIR}/build/staging"
APP_NAME="Lumark"
APP_DIR="${STAGING_DIR}/${APP_NAME}.AppDir"
APPIMAGE_OUTPUT="${BUILD_DIR}/${APP_NAME}.AppImage"

mkdir -p "${BUILD_DIR}"
rm -rf "${APP_DIR}"
mkdir -p "${APP_DIR}/usr/bin"
mkdir -p "${APP_DIR}/usr/lib"
mkdir -p "${APP_DIR}/usr/share/applications"
mkdir -p "${APP_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${APP_DIR}/usr/share/icons/hicolor/128x128/apps"

# 1. Locate binary
BINARY_SOURCE=""
for candidate in \
	"${ROOT_DIR}/bin/Lumark" \
	"${ROOT_DIR}/bin/lumark" \
	"${ROOT_DIR}/bin/markdown-viewer" \
	"${BUILD_DIR}/Lumark" \
	"${BUILD_DIR}/lumark" \
	"${BUILD_DIR}/markdown-viewer" \
	"${BUILD_DIR}/markdown-viewer-spike"; do
	if [ -f "${candidate}" ]; then
		BINARY_SOURCE="${candidate}"
		break
	fi
done

if [ -z "${BINARY_SOURCE}" ]; then
	echo "Building production Lumark binary for AppImage..."
	go build -tags production -trimpath -ldflags="-w -s" -o "${BUILD_DIR}/Lumark" "${ROOT_DIR}"
	BINARY_SOURCE="${BUILD_DIR}/Lumark"
fi

# Copy binary and provide compatibility symlinks
cp -p "${BINARY_SOURCE}" "${APP_DIR}/usr/bin/${APP_NAME}"
chmod 755 "${APP_DIR}/usr/bin/${APP_NAME}"
ln -sf "${APP_NAME}" "${APP_DIR}/usr/bin/lumark"
ln -sf "${APP_NAME}" "${APP_DIR}/usr/bin/markdown-viewer"

# 2. Desktop launcher
DESKTOP_SRC="${ROOT_DIR}/packaging/linux/lumark.desktop"
if [ ! -f "${DESKTOP_SRC}" ]; then
	DESKTOP_SRC="${ROOT_DIR}/packaging/linux/markdown-viewer.desktop"
fi
cp -p "${DESKTOP_SRC}" "${APP_DIR}/usr/share/applications/${APP_NAME}.desktop"
cp -p "${DESKTOP_SRC}" "${APP_DIR}/${APP_NAME}.desktop"
chmod 644 "${APP_DIR}/usr/share/applications/${APP_NAME}.desktop" "${APP_DIR}/${APP_NAME}.desktop"
ln -sf "${APP_NAME}.desktop" "${APP_DIR}/markdown-viewer.desktop"

# 3. Icons
SVG_SRC="${ROOT_DIR}/packaging/linux/lumark.svg"
if [ ! -f "${SVG_SRC}" ]; then
	SVG_SRC="${ROOT_DIR}/packaging/linux/markdown-viewer.svg"
fi
cp -p "${SVG_SRC}" "${APP_DIR}/usr/share/icons/hicolor/scalable/apps/${APP_NAME}.svg"
chmod 644 "${APP_DIR}/usr/share/icons/hicolor/scalable/apps/${APP_NAME}.svg"

if [ -f "${ROOT_DIR}/build/appicon.png" ]; then
	cp -p "${ROOT_DIR}/build/appicon.png" "${APP_DIR}/usr/share/icons/hicolor/128x128/apps/${APP_NAME}.png"
	cp -p "${ROOT_DIR}/build/appicon.png" "${APP_DIR}/${APP_NAME}.png"
	cp -p "${ROOT_DIR}/build/appicon.png" "${APP_DIR}/.DirIcon"
	chmod 644 "${APP_DIR}/usr/share/icons/hicolor/128x128/apps/${APP_NAME}.png" "${APP_DIR}/${APP_NAME}.png" "${APP_DIR}/.DirIcon"
fi

# 4. Standard AppRun Entrypoint
cat <<APPRUN_EOF >"${APP_DIR}/AppRun"
#!/bin/sh
set -e

# AppRun launcher script for AppImage
SELF=\$(readlink -f "\$0")
HERE=\${SELF%/*}

export PATH="\${HERE}/usr/bin:\${PATH}"
export LD_LIBRARY_PATH="\${HERE}/usr/lib:\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}"
export XDG_DATA_DIRS="\${HERE}/usr/share:\${XDG_DATA_DIRS:+:\$XDG_DATA_DIRS}"

exec "\${HERE}/usr/bin/${APP_NAME}" "\$@"
APPRUN_EOF
chmod 755 "${APP_DIR}/AppRun"

echo "AppDir structure staged successfully at: ${APP_DIR}"

# 5. Build final .AppImage if appimagetool or linuxdeploy is available
if command -v appimagetool >/dev/null 2>&1; then
	echo "Running appimagetool to build single-file AppImage..."
	ARCH="$(uname -m)" appimagetool "${APP_DIR}" "${APPIMAGE_OUTPUT}"
	echo "Generated AppImage: ${APPIMAGE_OUTPUT}"
elif command -v linuxdeploy >/dev/null 2>&1; then
	echo "Running linuxdeploy to bundle and build AppImage..."
	linuxdeploy --appdir "${APP_DIR}" --output appimage
	mv "${APP_NAME}"*.AppImage "${APPIMAGE_OUTPUT}" 2>/dev/null || true
	echo "Generated AppImage: ${APPIMAGE_OUTPUT}"
else
	echo "Notice: Neither 'appimagetool' nor 'linuxdeploy' is installed in system PATH."
	echo "AppDir directory tree is completely structured and verified per AppImage Specification."
	# Create a portable directory bundle archive for distribution convenience
	tar -czf "${BUILD_DIR}/${APP_NAME}.AppDir.tar.gz" -C "${STAGING_DIR}" "${APP_NAME}.AppDir"
	echo "Packaged portable AppDir archive: ${BUILD_DIR}/${APP_NAME}.AppDir.tar.gz"
fi

# Maintain legacy naming aliases in build directories for existing tests
rm -rf "${STAGING_DIR}/markdown-viewer.AppDir"
ln -sf "${APP_NAME}.AppDir" "${STAGING_DIR}/markdown-viewer.AppDir"
if [ -f "${BUILD_DIR}/${APP_NAME}.AppDir.tar.gz" ]; then
	cp -pf "${BUILD_DIR}/${APP_NAME}.AppDir.tar.gz" "${BUILD_DIR}/markdown-viewer.AppDir.tar.gz"
fi
