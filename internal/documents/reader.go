package documents

import (
	"bytes"
	"strings"
	"unicode/utf8"
)

// UTF8BOM represents the 3-byte UTF-8 Byte Order Mark (\xEF\xBB\xBF).
var UTF8BOM = []byte{0xEF, 0xBB, 0xBF}

// DecodeUTF8 strips any leading UTF-8 BOM, validates UTF-8 encoding, and replaces
// invalid UTF-8 sequences with the Unicode replacement character U+FFFD (\uFFFD).
// It returns the normalized string and a boolean indicating whether encoding errors occurred.
func DecodeUTF8(raw []byte) (string, bool) {
	// 1. Strip leading UTF-8 BOM if present per PRD Section 7.3 & 12.4
	raw = bytes.TrimPrefix(raw, UTF8BOM)

	// 2. Validate UTF-8 encoding
	if utf8.Valid(raw) {
		return string(raw), false
	}

	// 3. Replace invalid UTF-8 sequences with Unicode replacement character U+FFFD
	normalized := strings.ToValidUTF8(string(raw), "\uFFFD")
	return normalized, true
}
