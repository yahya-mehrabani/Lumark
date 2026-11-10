#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build/bin"
STAGING_DIR="${ROOT_DIR}/build/staging/debian"
VERSION="${VERSION:-${1:-0.1.0}}"
VERSION="${VERSION#v}"
DEB_REVISION="${DEB_REVISION:-1}"
DEB_VERSION="${VERSION}-${DEB_REVISION}"
DEB_ARCH="${DEB_ARCH:-amd64}"
PACKAGE_NAME="lumark"
DEB_OUTPUT="${BUILD_DIR}/${PACKAGE_NAME}_${DEB_VERSION}_${DEB_ARCH}.deb"
DEB_SYMLINK="${BUILD_DIR}/${PACKAGE_NAME}.deb"

mkdir -p "${BUILD_DIR}"
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}/DEBIAN"
mkdir -p "${STAGING_DIR}/usr/bin"
mkdir -p "${STAGING_DIR}/usr/share/applications"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps"
mkdir -p "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps"

# Ensure binary is built
BINARY_SOURCE=""
for candidate in \
	"${ROOT_DIR}/bin/lumark" \
	"${ROOT_DIR}/bin/Lumark" \
	"${ROOT_DIR}/bin/markdown-viewer" \
	"${BUILD_DIR}/lumark" \
	"${BUILD_DIR}/Lumark" \
	"${BUILD_DIR}/markdown-viewer" \
	"${BUILD_DIR}/markdown-viewer-spike"; do
	if [ -f "${candidate}" ]; then
		BINARY_SOURCE="${candidate}"
		break
	fi
done

if [ -z "${BINARY_SOURCE}" ]; then
	echo "Building production lumark binary..."
	go build -tags production -trimpath -ldflags="-w -s" -o "${BUILD_DIR}/lumark" "${ROOT_DIR}"
	BINARY_SOURCE="${BUILD_DIR}/lumark"
fi

# Copy binary to standard /usr/bin/lumark and provide compatibility symlinks
cp -p "${BINARY_SOURCE}" "${STAGING_DIR}/usr/bin/lumark"
chmod 755 "${STAGING_DIR}/usr/bin/lumark"
ln -sf "lumark" "${STAGING_DIR}/usr/bin/markdown-viewer"
ln -sf "lumark" "${STAGING_DIR}/usr/bin/Lumark"

# Copy desktop launchers
DESKTOP_SRC="${ROOT_DIR}/packaging/linux/lumark.desktop"
cp -p "${DESKTOP_SRC}" "${STAGING_DIR}/usr/share/applications/lumark.desktop"
chmod 644 "${STAGING_DIR}/usr/share/applications/lumark.desktop"
ln -sf "lumark.desktop" "${STAGING_DIR}/usr/share/applications/markdown-viewer.desktop"

# Copy scalable SVG icon
SVG_SRC="${ROOT_DIR}/packaging/linux/lumark.svg"
cp -p "${SVG_SRC}" "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/lumark.svg"
chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/lumark.svg"
ln -sf "lumark.svg" "${STAGING_DIR}/usr/share/icons/hicolor/scalable/apps/markdown-viewer.svg"

# Copy raster PNG icon if available
if [ -f "${ROOT_DIR}/build/appicon.png" ]; then
	cp -p "${ROOT_DIR}/build/appicon.png" "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/lumark.png"
	chmod 644 "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/lumark.png"
	ln -sf "lumark.png" "${STAGING_DIR}/usr/share/icons/hicolor/128x128/apps/markdown-viewer.png"
fi

# Copy DEBIAN control and maintainer scripts
cp -p "${ROOT_DIR}/packaging/linux/debian/control" "${STAGING_DIR}/DEBIAN/control"
sed -i "s/^Version:.*/Version: ${DEB_VERSION}/" "${STAGING_DIR}/DEBIAN/control"
sed -i "s/^Architecture:.*/Architecture: ${DEB_ARCH}/" "${STAGING_DIR}/DEBIAN/control"
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
