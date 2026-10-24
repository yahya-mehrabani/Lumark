/**
 * Link Router & Protocol Dispatcher
 * Conforms to PRD FR-ASSET-002, FR-ASSET-003, FR-LINK-001, and Security Invariant Section 8.1.
 */

import { Browser } from '@wailsio/runtime';

export type LinkType = 'external' | 'markdown' | 'anchor' | 'local_other' | 'blocked';

export interface DispatchedLink {
  type: LinkType;
  rawHref: string;
  url?: string;
  targetPath?: string;
  anchor?: string;
  isBlocked: boolean;
  reason?: string;
}

export interface LinkDispatchOptions {
  docDir?: string;
  onOpenMarkdown?: (filePath: string, anchor?: string) => void;
  onOpenExternal?: (url: string) => Promise<void> | void;
  onNavigateAnchor?: (anchor: string) => void;
  onOpenOther?: (filePath: string) => void;
}

const SUPPORTED_MARKDOWN_EXTS = ['.md', '.markdown', '.mdown', '.mkd'];
const ALLOWED_EXTERNAL_SCHEMES = ['https:', 'http:', 'mailto:'];
const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'file:', 'vbscript:', 'about:', 'blob:'];

/**
 * Normalizes and resolves a relative file path against a base directory.
 */
export function resolveRelativePath(baseDir: string = '', relPath: string): string {
  const cleanBase = baseDir.trim().replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanRel = relPath.trim().replace(/\\/g, '/');

  // Strip leading './'
  const strippedRel = cleanRel.startsWith('./') ? cleanRel.slice(2) : cleanRel;

  if (!cleanBase) {
    return strippedRel;
  }

  const baseParts = cleanBase.split('/').filter(Boolean);
  const relParts = strippedRel.split('/').filter(Boolean);

  for (const part of relParts) {
    if (part === '..') {
      if (baseParts.length > 0) {
        baseParts.pop();
      }
    } else if (part !== '.' && part !== '') {
      baseParts.push(part);
    }
  }

  const isUnixAbs = cleanBase.startsWith('/');
  const isWindowsAbs = /^[a-zA-Z]:/.test(cleanBase);

  if (isUnixAbs) {
    return '/' + baseParts.join('/');
  }
  if (isWindowsAbs) {
    return baseParts.join('/');
  }

  return baseParts.join('/');
}

/**
 * Classifies a hyperlink href into an authoritative routing category.
 */
export function classifyLink(href: string, docDir?: string): DispatchedLink {
  const rawHref = href ?? '';
  const trimmed = rawHref.trim();

  // 1. Empty href
  if (!trimmed) {
    return {
      type: 'blocked',
      rawHref,
      isBlocked: true,
      reason: 'Link href is empty.',
    };
  }

  // 2. In-document anchor (#heading-anchor)
  if (trimmed.startsWith('#')) {
    const anchor = trimmed.slice(1);
    return {
      type: 'anchor',
      rawHref,
      anchor,
      isBlocked: false,
    };
  }

  // 3. Dangerous protocols
  const lower = trimmed.toLowerCase();
  for (const dangerous of DANGEROUS_SCHEMES) {
    if (lower.startsWith(dangerous)) {
      return {
        type: 'blocked',
        rawHref,
        isBlocked: true,
        reason: `Prohibited executable or sensitive protocol scheme: ${dangerous}`,
      };
    }
  }

  // 4. External web links
  for (const allowed of ALLOWED_EXTERNAL_SCHEMES) {
    if (lower.startsWith(allowed)) {
      return {
        type: 'external',
        rawHref,
        url: trimmed,
        isBlocked: false,
      };
    }
  }

  // Protocol check: check if it contains any unrecognized protocol scheme (e.g., "customapp://")
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return {
      type: 'blocked',
      rawHref,
      isBlocked: true,
      reason: 'Unknown or unauthorized protocol scheme.',
    };
  }

  // 5. Local relative path (strip query & hash for path inspection)
  let pathPart = trimmed;
  let anchorPart: string | undefined;

  const hashIdx = pathPart.indexOf('#');
  if (hashIdx !== -1) {
    anchorPart = pathPart.slice(hashIdx + 1);
    pathPart = pathPart.slice(0, hashIdx);
  }

  const queryIdx = pathPart.indexOf('?');
  if (queryIdx !== -1) {
    pathPart = pathPart.slice(0, queryIdx);
  }

  const resolvedPath = resolveRelativePath(docDir, pathPart);

  // Check file extension
  const dotIdx = pathPart.lastIndexOf('.');
  const ext = dotIdx !== -1 ? pathPart.slice(dotIdx).toLowerCase() : '';

  if (SUPPORTED_MARKDOWN_EXTS.includes(ext)) {
    return {
      type: 'markdown',
      rawHref,
      targetPath: resolvedPath,
      anchor: anchorPart,
      isBlocked: false,
    };
  }

  return {
    type: 'local_other',
    rawHref,
    targetPath: resolvedPath,
    anchor: anchorPart,
    isBlocked: false,
  };
}

/**
 * Dispatches a link click safely according to its classification.
 */
export async function dispatchLink(
  href: string,
  options: LinkDispatchOptions = {}
): Promise<DispatchedLink> {
  const link = classifyLink(href, options.docDir);

  if (link.isBlocked) {
    console.warn(
      `[Security] Blocked navigation attempt to unsafe link: "${href}". Reason: ${link.reason}`
    );
    return link;
  }

  switch (link.type) {
    case 'anchor':
      if (options.onNavigateAnchor && link.anchor) {
        options.onNavigateAnchor(link.anchor);
      } else if (link.anchor) {
        const targetElement =
          document.getElementById(link.anchor) ||
          document.querySelector(`[name="${CSS.escape(link.anchor)}"]`);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
      break;

    case 'external':
      if (options.onOpenExternal && link.url) {
        await options.onOpenExternal(link.url);
      } else if (link.url) {
        try {
          await Browser.OpenURL(link.url);
        } catch (err) {
          console.error('[LinkRouter] Failed to launch external browser for URL:', link.url, err);
        }
      }
      break;

    case 'markdown':
      if (options.onOpenMarkdown && link.targetPath) {
        options.onOpenMarkdown(link.targetPath, link.anchor);
      }
      break;

    case 'local_other':
      if (options.onOpenOther && link.targetPath) {
        options.onOpenOther(link.targetPath);
      } else {
        console.info(
          `[LinkRouter] Non-markdown local file referenced: ${link.targetPath}. Rendering in WebView blocked per FR-ASSET-003.`
        );
      }
      break;
  }

  return link;
}
