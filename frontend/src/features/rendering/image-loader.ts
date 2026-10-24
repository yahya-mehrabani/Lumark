/**
 * Local Asset & Image Resolution Engine
 * Conforms to PRD FR-ASSET-001, FR-ASSET-004, and Security Invariant Section 8.1.
 */

export interface ResolveAssetOptions {
  docDir?: string;
  allowRemote?: boolean; // Defaults to false per FR-ASSET-004
  prefix?: string;       // Defaults to '/local-asset'
}

export interface ImageResolutionResult {
  resolvedSrc: string | null;
  isRemote: boolean;
  isBlocked: boolean;
  isRelative: boolean;
  errorMessage?: string;
  originalSrc: string;
}

const REMOTE_URL_REGEX = /^(https?:|\/\/)/i;
const DANGEROUS_SCHEME_REGEX = /^(javascript:|data:|file:|vbscript:|about:|blob:)/i;
const WINDOWS_DRIVE_REGEX = /^[a-zA-Z]:[\\/]/;
const UNC_PATH_REGEX = /^(\\\\|\/\/)/;

/**
 * Checks whether the URL targets a remote host.
 */
export function isRemoteUrl(src: string): boolean {
  return REMOTE_URL_REGEX.test(src.trim());
}

/**
 * Checks whether the source URL uses a dangerous or prohibited protocol.
 */
export function isDangerousProtocol(src: string): boolean {
  return DANGEROUS_SCHEME_REGEX.test(src.trim());
}

/**
 * Detects path traversal attempts or illegal absolute filesystem patterns.
 */
export function isPathTraversal(src: string): boolean {
  const trimmed = src.trim();

  // Null bytes
  if (trimmed.includes('\0') || trimmed.includes('%00')) {
    return true;
  }

  // Windows drive letter (e.g., C:\ or C:/)
  if (WINDOWS_DRIVE_REGEX.test(trimmed)) {
    return true;
  }

  // UNC paths
  if (UNC_PATH_REGEX.test(trimmed)) {
    return true;
  }

  // Absolute unix path
  if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
    return true;
  }

  // Normalize slashes for escape inspection
  const normalized = trimmed.replace(/\\/g, '/');
  const parts = normalized.split('?')[0].split('#')[0].split('/');

  // Inspect segments for traversal
  let depth = 0;
  for (const part of parts) {
    if (part === '..') {
      depth--;
      if (depth < 0) {
        // Escapes document directory root
        return true;
      }
    } else if (part !== '' && part !== '.') {
      depth++;
    }
  }

  return false;
}

/**
 * Encodes relative path segments preserving '/' separators and safe query/hash suffixes.
 */
export function encodeAssetPath(path: string): string {
  // Separate query and hash
  let mainPath = path;
  let queryAndHash = '';

  const qIdx = mainPath.indexOf('?');
  const hIdx = mainPath.indexOf('#');
  let splitIdx = -1;

  if (qIdx !== -1 && hIdx !== -1) {
    splitIdx = Math.min(qIdx, hIdx);
  } else if (qIdx !== -1) {
    splitIdx = qIdx;
  } else if (hIdx !== -1) {
    splitIdx = hIdx;
  }

  if (splitIdx !== -1) {
    queryAndHash = mainPath.slice(splitIdx);
    mainPath = mainPath.slice(0, splitIdx);
  }

  // Normalize backslashes to forward slashes
  const cleanPath = mainPath.replace(/\\/g, '/');

  // Strip leading './'
  const stripped = cleanPath.startsWith('./') ? cleanPath.slice(2) : cleanPath;

  // URI-encode each path component while preserving '/'
  const encodedSegments = stripped
    .split('/')
    .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');

  return encodedSegments + queryAndHash;
}

/**
 * Resolves a Markdown image `src` attribute safely against the local asset handler.
 */
export function resolveAssetUrl(src: string, options: ResolveAssetOptions = {}): ImageResolutionResult {
  const originalSrc = src ?? '';
  const trimmed = originalSrc.trim();
  const prefix = options.prefix ?? '/local-asset';
  const allowRemote = options.allowRemote ?? false;

  if (!trimmed) {
    return {
      resolvedSrc: null,
      isRemote: false,
      isBlocked: true,
      isRelative: false,
      errorMessage: 'Image path is empty.',
      originalSrc,
    };
  }

  // 1. Check dangerous schemes
  if (isDangerousProtocol(trimmed)) {
    return {
      resolvedSrc: null,
      isRemote: false,
      isBlocked: true,
      isRelative: false,
      errorMessage: `Blocked dangerous or unsupported image scheme: ${trimmed}`,
      originalSrc,
    };
  }

  // 2. Check remote URLs
  if (isRemoteUrl(trimmed)) {
    if (allowRemote) {
      return {
        resolvedSrc: trimmed,
        isRemote: true,
        isBlocked: false,
        isRelative: false,
        originalSrc,
      };
    }
    return {
      resolvedSrc: null,
      isRemote: true,
      isBlocked: true,
      isRelative: false,
      errorMessage: 'Remote images are blocked by default to preserve privacy and offline security.',
      originalSrc,
    };
  }

  // 3. Check path traversal or illegal absolute path
  if (isPathTraversal(trimmed)) {
    return {
      resolvedSrc: null,
      isRemote: false,
      isBlocked: true,
      isRelative: true,
      errorMessage: `Path traversal or absolute filesystem path blocked: ${trimmed}`,
      originalSrc,
    };
  }

  // 4. Safe relative local asset
  const encodedPath = encodeAssetPath(trimmed);
  const cleanPrefix = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
  const resolvedSrc = `${cleanPrefix}/${encodedPath}`;

  return {
    resolvedSrc,
    isRemote: false,
    isBlocked: false,
    isRelative: true,
    originalSrc,
  };
}
