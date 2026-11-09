#!/usr/bin/env bash
# ==============================================================================
# create-dmg.sh — macOS DMG Packaging Script with /Applications Drop Link
# ==============================================================================
# Packages the Lumark .app bundle into a branded .dmg disk image with:
# - Branded background artwork
# - Custom volume icon (.icns)
# - /Applications symlink for drag-and-drop installation
# - Window sizing and icon placement
#
# Usage:
#   ./packaging/macos/create-dmg.sh [BIN_DIR] [APP_NAME] [OUTPUT_DIR]
# Example:
#   ./packaging/macos/create-dmg.sh bin "Lumark" bin
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ "${1:-}" == "--check" ]]; then
	BIN_DIR="${ROOT_DIR}/bin"
	APP_NAME="Lumark"
	OUTPUT_DIR="${BIN_DIR}"
else
	BIN_DIR="${1:-${ROOT_DIR}/bin}"
	APP_NAME="${2:-Lumark}"
	OUTPUT_DIR="${3:-${BIN_DIR}}"
fi

APP_BUNDLE="${BIN_DIR}/${APP_NAME}.app"
OUTPUT_DMG="${OUTPUT_DIR}/${APP_NAME}.dmg"

BACKGROUND_IMG="${ROOT_DIR}/build/darwin/dmg-background.png"
VOLUME_ICON="${ROOT_DIR}/build/darwin/icons.icns"
WINDOW_WIDTH=540
WINDOW_HEIGHT=380
ICON_SIZE=100
APP_ICON_X=140
APP_ICON_Y=190
DROP_LINK_X=400
DROP_LINK_Y=190

echo "=== macOS DMG Packaging ==="
echo "Application Name:    ${APP_NAME}"
echo "Application Bundle:  ${APP_BUNDLE}"
echo "Output Disk Image:   ${OUTPUT_DMG}"
echo "Background Artwork:  ${BACKGROUND_IMG}"
echo "Volume Icon:         ${VOLUME_ICON}"
echo "Window Geometry:     ${WINDOW_WIDTH}x${WINDOW_HEIGHT}"
echo "Drop Target:         /Applications symlink"

# Check mode flag (for CI / validation on non-macOS environments)
if [[ "${1:-}" == "--check" || "${2:-}" == "--check" ]]; then
	echo "Running configuration check mode..."
	if [[ ! -f "${BACKGROUND_IMG}" ]]; then
		echo "ERROR: Missing background artwork at ${BACKGROUND_IMG}" >&2
		exit 1
	fi
	if [[ ! -f "${VOLUME_ICON}" ]]; then
		echo "ERROR: Missing volume icon at ${VOLUME_ICON}" >&2
		exit 1
	fi
	echo "Check passed: Assets and DMG parameters verified."
	exit 0
fi

# Detect platform
OS_NAME="$(uname -s)"
if [[ "${OS_NAME}" != "Darwin" ]]; then
	echo "Notice: Non-macOS host detected (${OS_NAME})."
	echo "Native DMG creation requires macOS with 'create-dmg' or 'hdiutil'."
	echo "Validating prerequisite assets..."
	test -f "${BACKGROUND_IMG}" || {
		echo "ERROR: Missing ${BACKGROUND_IMG}"
		exit 1
	}
	test -f "${VOLUME_ICON}" || {
		echo "ERROR: Missing ${VOLUME_ICON}"
		exit 1
	}
	echo "Prerequisite assets verified. DMG creation deferred to macOS runner."
	exit 0
fi

# Ensure application bundle exists
if [[ ! -d "${APP_BUNDLE}" ]]; then
	echo "ERROR: Application bundle not found at ${APP_BUNDLE}" >&2
	echo "Please build the app bundle first (e.g. task darwin:package APP_NAME=Lumark)" >&2
	exit 1
fi

# Remove existing DMG artifact if present
rm -f "${OUTPUT_DMG}"
mkdir -p "${OUTPUT_DIR}"

# Build DMG using create-dmg if available
if command -v create-dmg >/dev/null 2>&1; then
	echo "Using 'create-dmg' tool..."
	CREATE_DMG_ARGS=(
		--volname "${APP_NAME}"
		--volicon "${VOLUME_ICON}"
		--background "${BACKGROUND_IMG}"
		--window-pos 200 120
		--window-size "${WINDOW_WIDTH}" "${WINDOW_HEIGHT}"
		--icon-size "${ICON_SIZE}"
		--icon "${APP_NAME}.app" "${APP_ICON_X}" "${APP_ICON_Y}"
		--hide-extension "${APP_NAME}.app"
		--app-drop-link "${DROP_LINK_X}" "${DROP_LINK_Y}"
		--no-internet-enable
	)

	create-dmg "${CREATE_DMG_ARGS[@]}" "${OUTPUT_DMG}" "${APP_BUNDLE}" || {
		echo "create-dmg exited with non-zero; verifying if DMG was generated..."
		test -f "${OUTPUT_DMG}" || exit 1
	}
else
	echo "'create-dmg' not found; falling back to native 'hdiutil' workflow..."
	STAGING_DIR="$(mktemp -d -t "dmg-staging-XXXXXX")"
	trap 'rm -rf "${STAGING_DIR}"' EXIT

	cp -R "${APP_BUNDLE}" "${STAGING_DIR}/"
	ln -s /Applications "${STAGING_DIR}/Applications"

	if [[ -f "${BACKGROUND_IMG}" ]]; then
		mkdir -p "${STAGING_DIR}/.background"
		cp "${BACKGROUND_IMG}" "${STAGING_DIR}/.background/background.png"
	fi

	if [[ -f "${VOLUME_ICON}" ]]; then
		cp "${VOLUME_ICON}" "${STAGING_DIR}/.VolumeIcon.icns"
	fi

	# Create compressed UDZO disk image
	hdiutil create \
		-volname "${APP_NAME}" \
		-srcfolder "${STAGING_DIR}" \
		-ov \
		-format UDZO \
		"${OUTPUT_DMG}"
fi

echo "Successfully generated DMG: ${OUTPUT_DMG}"
ls -lh "${OUTPUT_DMG}"
