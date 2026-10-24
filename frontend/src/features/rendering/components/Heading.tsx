import React from 'react';
import { extractTextFromNode, slugify, normalizeAuthorId, useSlugTracker } from '../utils/slugify';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
  id?: string;
  className?: string;
}

/**
 * Custom Heading component for h1-h6.
 * Conforms to PRD FR-RENDER-008 and Story US-012.
 * - Generates deterministic, unique, URL-safe anchor IDs using SlugTracker.
 * - Disambiguates duplicate headings within the document.
 * - Preserves author-defined explicit IDs.
 * - Attaches clickable heading anchor for internal navigation.
 */
export const Heading: React.FC<HeadingProps> = ({
  level,
  children,
  id: explicitId,
  className = '',
  ...rest
}) => {
  const tracker = useSlugTracker();
  const rawText = extractTextFromNode(children);

  const headingId = React.useMemo(() => {
    if (tracker) {
      return tracker.slug(rawText, explicitId);
    }
    return explicitId ? normalizeAuthorId(explicitId) : slugify(rawText);
  }, [tracker, rawText, explicitId]);

  const Tag = `h${level}` as const;

  return (
    <Tag
      id={headingId}
      className={`markdown-heading markdown-h${level} ${className}`.trim()}
      data-testid={`heading-${level}`}
      data-heading-id={headingId}
      {...rest}
    >
      <a
        href={`#${headingId}`}
        className="heading-anchor"
        aria-label={`Direct link to ${rawText || headingId}`}
        title={`Direct link to ${rawText || headingId}`}
        data-testid="heading-anchor"
      >
        <span className="heading-anchor-icon" aria-hidden="true">
          #
        </span>
      </a>
      {children}
    </Tag>
  );
};

export default Heading;
