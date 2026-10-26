/**
 * Truncates a file path in the middle while keeping the leading directory root
 * and trailing filename visible.
 *
 * Example:
 * "/home/repos/personal/markdown-go/fixtures/security/mermaid-injection.md"
 * -> "/home/.../mermaid-injection.md"
 */
export function truncateMiddlePath(path: string, maxLength: number = 38): string {
  if (!path || path.length <= maxLength) {
    return path;
  }

  const isWindows = path.includes('\\') && !path.includes('/');
  const separator = isWindows ? '\\' : '/';
  const parts = path.split(/[/\\]/);

  if (parts.length <= 1) {
    const half = Math.floor((maxLength - 3) / 2);
    const rem = maxLength - 3 - half;
    return `${path.slice(0, half)}...${path.slice(-rem)}`;
  }

  const filename = parts[parts.length - 1];

  // Preserve leading root / first directory
  const leading = path.startsWith('/')
    ? `/${parts[1] || ''}`
    : (parts[0] || '');

  // If leading + separator + ... + separator + filename fits:
  const middleEllipsis = `${separator}...${separator}`;
  const baseCandidate = `${leading}${middleEllipsis}${filename}`;
  if (baseCandidate.length <= maxLength) {
    return baseCandidate;
  }

  // If filename alone fits with leading, but filename is too long:
  const availForFile = maxLength - leading.length - middleEllipsis.length;
  if (availForFile >= 8) {
    const half = Math.floor((availForFile - 3) / 2);
    const rem = availForFile - 3 - half;
    return `${leading}${middleEllipsis}${filename.slice(0, half)}...${filename.slice(-rem)}`;
  }

  // If leading itself is too long, shorten leading
  const shortLeading = leading.slice(0, Math.max(1, maxLength - filename.length - 4));
  const candidate2 = `${shortLeading}...${separator}${filename}`;
  if (candidate2.length <= maxLength) {
    return candidate2;
  }

  // Fallback: middle truncate entire string
  const half = Math.floor((maxLength - 3) / 2);
  const rem = maxLength - 3 - half;
  return `${path.slice(0, half)}...${path.slice(-rem)}`;
}
