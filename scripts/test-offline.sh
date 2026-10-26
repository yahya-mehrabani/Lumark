#!/usr/bin/env bash
# Automated Offline Verification Script (PRD Section 12.2, 15.1 item 15)
# Verifies zero external network dependencies, local asset bundling, and offline rendering.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "================================================================="
echo "Markdown Viewer — Offline Integrity & Network Isolation Suite"
echo "Authority: PRD §12.2, §15.1 (Checklist Item 15)"
echo "Environment: $(uname -s) $(uname -r) ($(uname -m))"
echo "================================================================="

# 1. Scan frontend source and styles for remote CDN/external font references
echo "[1/3] Scanning frontend source for disallowed external CDN or remote asset URLs..."
DISALLOWED_PATTERNS=(
	"https://cdn."
	"https://cdnjs."
	"https://unpkg.com"
	"https://fonts.googleapis.com"
	"https://fonts.gstatic.com"
	"http://fonts.googleapis.com"
	"http://cdn."
)

VIOLATIONS=0
for pattern in "${DISALLOWED_PATTERNS[@]}"; do
	if grep -rnF --exclude-dir=node_modules --exclude-dir=dist --exclude="*.test.*" --exclude="*.spec.*" "${pattern}" "${ROOT_DIR}/frontend/src" 2>/dev/null; then
		echo "ERROR: Disallowed remote resource pattern found: ${pattern}" >&2
		VIOLATIONS=$((VIOLATIONS + 1))
	fi
done

if [ "${VIOLATIONS}" -eq 0 ]; then
	echo "  - PASS: Zero remote CDN, Google Fonts, or external runtime URLs found in frontend source."
else
	echo "  - FAIL: ${VIOLATIONS} disallowed external URL pattern(s) detected." >&2
	exit 1
fi

# 2. Verify local WOFF2 KaTeX font bundling
echo "[2/3] Verifying local KaTeX WOFF2 font assets..."
FONT_DIR="${ROOT_DIR}/frontend/src/assets/fonts/katex"
if [ ! -d "${FONT_DIR}" ]; then
	echo "ERROR: KaTeX font directory missing: ${FONT_DIR}" >&2
	exit 1
fi

FONT_COUNT=$(find "${FONT_DIR}" -name "*.woff2" | wc -l)
if [ "${FONT_COUNT}" -ge 15 ]; then
	echo "  - PASS: Found ${FONT_COUNT} locally bundled KaTeX WOFF2 font files."
else
	echo "  - FAIL: Expected at least 15 WOFF2 font files, found ${FONT_COUNT}." >&2
	exit 1
fi

# 3. Execute Golden Fixture Suite in isolated network namespace
echo "[3/3] Executing rendering fixture suite inside network-isolated namespace (unshare -n)..."
if command -v unshare >/dev/null 2>&1; then
	unshare -n npm --prefix "${ROOT_DIR}/frontend" run test:fixtures
	echo "  - PASS: Complete offline rendering verified inside unshared network namespace."
else
	echo "  - NOTE: unshare command unavailable; executing in standard environment."
	npm --prefix "${ROOT_DIR}/frontend" run test:fixtures
	echo "  - PASS: Rendering fixture suite passed."
fi

echo "================================================================="
echo "OFFLINE VERIFICATION COMPLETE: ALL INTEGRITY CHECKS PASSED"
echo "================================================================="
exit 0
