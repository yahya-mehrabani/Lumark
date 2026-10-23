#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build/bin"
STAGING_DIR="${ROOT_DIR}/build/staging/debian-spike"
DEB_OUTPUT="${BUILD_DIR}/markdown-viewer-spike.deb"

mkdir -p "${BUILD_DIR}"
mkdir -p "${STAGING_DIR}/DEBIAN"
mkdir -p "${STAGING_DIR}/usr/bin"
mkdir -p "${STAGING_DIR}/usr/share/applications"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps"

# Ensure binary is built
if [ ! -f "${BUILD_DIR}/markdown-viewer-spike" ]; then
	echo "Building production spike binary..."
	go build -tags production -o "${BUILD_DIR}/markdown-viewer-spike" "${ROOT_DIR}"
fi

# Copy binary
cp -p "${BUILD_DIR}/markdown-viewer-spike" "${STAGING_DIR}/usr/bin/markdown-viewer-spike"
chmod 755 "${STAGING_DIR}/usr/bin/markdown-viewer-spike"

# Copy desktop launcher
cp -p "${ROOT_DIR}/packaging/linux/markdown-viewer.desktop" "${STAGING_DIR}/usr/share/applications/markdown-viewer.desktop"
chmod 644 "${STAGING_DIR}/usr/share/applications/markdown-viewer.desktop"

# Copy icons
cp -p "${ROOT_DIR}/packaging/linux/markdown-viewer.svg" "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg"
chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg"

if [ -f "${ROOT_DIR}/build/appicon.png" ]; then
	cp -p "${ROOT_DIR}/build/appicon.png" "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/markdown-viewer.png"
	chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/markdown-viewer.png"
fi

# Copy DEBIAN control and maintainer scripts
cp -p "${ROOT_DIR}/packaging/linux/debian/control" "${STAGING_DIR}/DEBIAN/control"
sed -i 's/^Package: markdown-viewer$/Package: markdown-viewer-spike/' "${STAGING_DIR}/DEBIAN/control"

cp -p "${ROOT_DIR}/packaging/linux/debian/postinst" "${STAGING_DIR}/DEBIAN/postinst"
chmod 755 "${STAGING_DIR}/DEBIAN/postinst"

cp -p "${ROOT_DIR}/packaging/linux/debian/postrm" "${STAGING_DIR}/DEBIAN/postrm"
chmod 755 "${STAGING_DIR}/DEBIAN/postrm"

# Build Debian archive using dpkg-deb
dpkg-deb --build --root-owner-group "${STAGING_DIR}" "${DEB_OUTPUT}"

echo "Built Debian package: ${DEB_OUTPUT}"
