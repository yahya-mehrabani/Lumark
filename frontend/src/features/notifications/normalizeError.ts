/**
 * Utility to normalize raw backend or JavaScript errors into plain-language,
 * actionable notifications without raw stack traces (FR-ERR-001).
 */

export interface NormalizedError {
  message: string;
  actionLabel?: string;
  isFileError: boolean;
}

export function normalizeErrorMessage(err: unknown, defaultOperation = 'read file'): NormalizedError {
  if (!err) {
    return {
      message: `Cannot ${defaultOperation}: An unknown error occurred.`,
      isFileError: false,
    };
  }

  // Extract raw error message string
  let rawMsg = '';
  if (typeof err === 'string') {
    rawMsg = err;
  } else if (err instanceof Error) {
    rawMsg = err.message || String(err);
  } else if (typeof err === 'object' && err !== null) {
    const errObj = err as Record<string, unknown>;
    rawMsg = String(errObj.message || errObj.error || errObj.code || JSON.stringify(err));
  } else {
    rawMsg = String(err);
  }

  // Strip stack traces (JavaScript 'at Function...' or Go 'goroutine 1 [running]...')
  rawMsg = rawMsg.split(/\n\s*at\s+/)[0];
  rawMsg = rawMsg.split(/goroutine\s+\d+/i)[0];
  rawMsg = rawMsg.replace(/\[signal\s+SIGSEGV[^\]]*\]/gi, '');
  rawMsg = rawMsg.trim();

  const lower = rawMsg.toLowerCase();

  // 1. Permission Denied
  if (lower.includes('permission denied') || lower.includes('eacces') || lower.includes('eperm')) {
    return {
      message: 'Cannot read file: Permission denied',
      actionLabel: 'Choose Another File',
      isFileError: true,
    };
  }

  // 2. File Not Found
  if (lower.includes('no such file') || lower.includes('enoent') || lower.includes('file not found') || lower.includes('missing on disk')) {
    return {
      message: 'Cannot read file: File not found on disk',
      actionLabel: 'Choose Another File',
      isFileError: true,
    };
  }

  // 3. File Too Large (exceeds 20 MiB)
  if (lower.includes('file too large') || lower.includes('exceeds 20 mib') || lower.includes('size limit')) {
    return {
      message: 'Cannot open file: File exceeds 20 MiB size limit',
      actionLabel: 'Choose Another File',
      isFileError: true,
    };
  }

  // 4. Unsupported Format
  if (lower.includes('unsupported') || lower.includes('invalid extension') || lower.includes('not a markdown file')) {
    return {
      message: 'Cannot open file: Unsupported file format',
      actionLabel: 'Choose Another File',
      isFileError: true,
    };
  }

  // 5. Corrupted Encoding
  if (lower.includes('encoding') || lower.includes('invalid utf-8') || lower.includes('corrupted input')) {
    return {
      message: 'Document contains corrupted or unsupported character encoding',
      actionLabel: 'Choose Another File',
      isFileError: true,
    };
  }

  // 6. Generic Clean Fallback
  // Remove common error prefixes like "Error: ", "[DocumentService] ", etc.
  const cleanMsg = rawMsg
    .replace(/^Error:\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/, '')
    .trim();

  return {
    message: cleanMsg.length > 0 ? cleanMsg : `Cannot ${defaultOperation}: Operation failed`,
    isFileError: false,
  };
}
