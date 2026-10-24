import React, { useState } from 'react';
import { resolveAssetUrl } from '../image-loader';

export interface MarkdownImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  title?: string;
  allowRemote?: boolean;
  docDir?: string;
}

/**
 * Custom Markdown Image component.
 * Conforms to PRD FR-ASSET-001, FR-ASSET-004, and Story US-011.
 * - Resolves relative assets against the local asset handler.
 * - Enforces remote image blocking by default.
 * - Renders an accessible, structured placeholder badge on error or missing asset.
 */
export const MarkdownImage: React.FC<MarkdownImageProps> = ({
  src = '',
  alt,
  title,
  allowRemote = false,
  docDir,
  className = '',
  ...rest
}) => {
  const [loadFailed, setLoadFailed] = useState<boolean>(false);

  const resolution = resolveAssetUrl(src, { allowRemote, docDir });

  // 1. Blocked before network attempt (remote blocked, traversal blocked, dangerous protocol)
  if (resolution.isBlocked || !resolution.resolvedSrc) {
    const reasonText = resolution.isRemote
      ? `Remote image blocked: ${src}`
      : resolution.errorMessage || `Image blocked: ${src}`;

    return (
      <span
        className="missing-asset-container blocked-asset"
        data-testid="blocked-asset-placeholder"
        role="img"
        aria-label={alt ? `${alt} - ${reasonText}` : reasonText}
      >
        <span className="missing-asset-badge">
          <svg
            className="missing-asset-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
          <span className="missing-asset-text" data-testid="missing-asset-message">
            {resolution.isRemote ? `Remote image blocked: ${src}` : reasonText}
          </span>
        </span>
        {alt && <span className="missing-asset-alt">{alt}</span>}
      </span>
    );
  }

  // 2. Failed to load at runtime (404 Not Found, corrupted image, network failure)
  if (loadFailed) {
    const missingMessage = `Image not found: ${src}`;

    return (
      <span
        className="missing-asset-container not-found-asset"
        data-testid="missing-asset-placeholder"
        role="img"
        aria-label={alt ? `${alt} - ${missingMessage}` : missingMessage}
      >
        <span className="missing-asset-badge">
          <svg
            className="missing-asset-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
            <line x1="3" y1="3" x2="21" y2="21" />
          </svg>
          <span className="missing-asset-text" data-testid="missing-asset-message">
            {missingMessage}
          </span>
        </span>
        {alt && <span className="missing-asset-alt">{alt}</span>}
      </span>
    );
  }

  // 3. Normal image loading
  return (
    <img
      src={resolution.resolvedSrc}
      alt={alt || ''}
      title={title}
      className={`markdown-image ${className}`.trim()}
      loading="lazy"
      onError={() => setLoadFailed(true)}
      data-testid="markdown-image"
      {...rest}
    />
  );
};

export default MarkdownImage;
