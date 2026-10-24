import React from 'react';
import { dispatchLink, classifyLink, LinkDispatchOptions } from '../link-router';

export interface MarkdownLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    LinkDispatchOptions {
  href?: string;
}

/**
 * Custom Markdown Link component.
 * Conforms to PRD FR-ASSET-002, FR-LINK-001, and Story US-011.
 * - Routes relative .md links to TabStore / onOpenMarkdown.
 * - Routes http/https/mailto links to OS browser without navigating the WebView.
 * - Blocks malicious and executable protocol schemes (javascript:, data:, file:, etc.).
 */
export const MarkdownLink: React.FC<MarkdownLinkProps> = ({
  href = '',
  children,
  title,
  docDir,
  onOpenMarkdown,
  onOpenExternal,
  onNavigateAnchor,
  onOpenOther,
  className = '',
  onClick,
  ...rest
}) => {
  const classification = classifyLink(href, docDir);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (onClick) {
      onClick(e);
    }

    await dispatchLink(href, {
      docDir,
      onOpenMarkdown,
      onOpenExternal,
      onNavigateAnchor,
      onOpenOther,
    });
  };

  const isExternal = classification.type === 'external';
  const isBlocked = classification.isBlocked;
  const safeHref = isBlocked ? '#' : href;

  let computedTitle = title;
  if (isExternal) {
    computedTitle = title ? `${title} (Opens in external browser)` : `Opens in default browser: ${href}`;
  } else if (isBlocked) {
    computedTitle = `Blocked link: ${classification.reason || href}`;
  }

  const linkClass = [
    'markdown-link',
    isExternal ? 'external-link' : '',
    isBlocked ? 'blocked-link' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a
      href={safeHref}
      role="link"
      title={computedTitle}
      onClick={handleClick}
      className={linkClass}
      data-testid="markdown-link"
      data-link-type={classification.type}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-disabled={isBlocked ? 'true' : undefined}
      {...rest}
    >
      {children}
      {isExternal && (
        <span className="external-link-icon" aria-hidden="true">
          ↗
        </span>
      )}
    </a>
  );
};

export default MarkdownLink;
