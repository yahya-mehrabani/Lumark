#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build/bin"
STAGING_DIR="${ROOT_DIR}/build/staging/debian"
DEB_VERSION="0.1.0-1"
DEB_ARCH="amd64"
DEB_OUTPUT="${BUILD_DIR}/markdown-viewer_${DEB_VERSION}_${DEB_ARCH}.deb"
DEB_SYMLINK="${BUILD_DIR}/markdown-viewer.deb"

mkdir -p "${BUILD_DIR}"
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}/DEBIAN"
mkdir -p "${STAGING_DIR}/usr/bin"
mkdir -p "${STAGING_DIR}/usr/share/applications"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps"

# Ensure binary is built
BINARY_SOURCE="${ROOT_DIR}/bin/markdown-viewer"
if [ ! -f "${BINARY_SOURCE}" ]; then
	if [ -f "${BUILD_DIR}/markdown-viewer" ]; then
		BINARY_SOURCE="${BUILD_DIR}/markdown-viewer"
	elif [ -f "${BUILD_DIR}/markdown-viewer-spike" ]; then
		BINARY_SOURCE="${BUILD_DIR}/markdown-viewer-spike"
	else
		echo "Building production markdown-viewer binary..."
		go build -tags production -trimpath -ldflags="-w -s" -o "${BUILD_DIR}/markdown-viewer" "${ROOT_DIR}"
		BINARY_SOURCE="${BUILD_DIR}/markdown-viewer"
	fi
fi

# Copy binary to standard /usr/bin/markdown-viewer
cp -p "${BINARY_SOURCE}" "${STAGING_DIR}/usr/bin/markdown-viewer"
chmod 755 "${STAGING_DIR}/usr/bin/markdown-viewer"

# Copy desktop launcher
cp -p "${ROOT_DIR}/packaging/linux/markdown-viewer.desktop" "${STAGING_DIR}/usr/share/applications/markdown-viewer.desktop"
chmod 644 "${STAGING_DIR}/usr/share/applications/markdown-viewer.desktop"

# Copy scalable SVG icon
cp -p "${ROOT_DIR}/packaging/linux/markdown-viewer.svg" "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg"
chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg"

# Copy raster PNG icon if available
if [ -f "${ROOT_DIR}/build/appicon.png" ]; then
	cp -p "${ROOT_DIR}/build/appicon.png" "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/markdown-viewer.png"
	chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/markdown-viewer.png"
fi

# Copy DEBIAN control and maintainer scripts
cp -p "${ROOT_DIR}/packaging/linux/debian/control" "${STAGING_DIR}/DEBIAN/control"
chmod 644 "${STAGING_DIR}/DEBIAN/control"

cp -p "${ROOT_DIR}/packaging/linux/debian/postinst" "${STAGING_DIR}/DEBIAN/postinst"
chmod 755 "${STAGING_DIR}/DEBIAN/postinst"

cp -p "${ROOT_DIR}/packaging/linux/debian/postrm" "${STAGING_DIR}/DEBIAN/postrm"
chmod 755 "${STAGING_DIR}/DEBIAN/postrm"

if [ -f "${ROOT_DIR}/packaging/linux/debian/prerm" ]; then
	cp -p "${ROOT_DIR}/packaging/linux/debian/prerm" "${STAGING_DIR}/DEBIAN/prerm"
	chmod 755 "${STAGING_DIR}/DEBIAN/prerm"
fi

# Build Debian archive using dpkg-deb
dpkg-deb --build --root-owner-group "${STAGING_DIR}" "${DEB_OUTPUT}"
cp -pf "${DEB_OUTPUT}" "${DEB_SYMLINK}"

echo "Successfully built Debian package: ${DEB_OUTPUT}"
echo "Canonical package path: ${DEB_SYMLINK}"
