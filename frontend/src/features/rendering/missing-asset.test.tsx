import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownImage } from './components/MarkdownImage';
import { MarkdownViewer } from './MarkdownViewer';

describe('MarkdownImage & Missing Asset Placeholders (US-011.2)', () => {
  describe('MarkdownImage Component', () => {
    it('renders normal img tag for valid relative image path (AC 1)', () => {
      render(<MarkdownImage src="./images/logo.png" alt="Company Logo" title="Logo Preview" />);

      const img = screen.getByTestId('markdown-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/local-asset/images/logo.png');
      expect(img).toHaveAttribute('alt', 'Company Logo');
      expect(img).toHaveAttribute('title', 'Logo Preview');
      expect(img).toHaveClass('markdown-image');
    });

    it('renders missing asset placeholder badge when image encounters runtime loading error (AC 2)', () => {
      render(<MarkdownImage src="./missing.png" alt="Missing Diagram" />);

      const img = screen.getByTestId('markdown-image');
      expect(img).toBeInTheDocument();

      // Simulate runtime image load failure (e.g. 404 Not Found from backend)
      fireEvent.error(img);

      // Now the structured placeholder badge should be rendered
      const placeholder = screen.getByTestId('missing-asset-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveClass('not-found-asset');

      const message = screen.getByTestId('missing-asset-message');
      expect(message).toHaveTextContent('Image not found: ./missing.png');

      const caption = screen.getByText('Missing Diagram');
      expect(caption).toBeInTheDocument();
    });

    it('blocks remote images by default and displays blocked asset placeholder (FR-ASSET-004)', () => {
      render(<MarkdownImage src="https://example.com/tracker.png" alt="Tracker" />);

      // Remote image should not render <img> tag
      expect(screen.queryByTestId('markdown-image')).toBeNull();

      const placeholder = screen.getByTestId('blocked-asset-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveClass('blocked-asset');

      const message = screen.getByTestId('missing-asset-message');
      expect(message).toHaveTextContent('Remote image blocked: https://example.com/tracker.png');
    });

    it('blocks path traversal and displays safe blocked placeholder (AC 3, PRD 8.1)', () => {
      render(<MarkdownImage src="../../../../etc/shadow" alt="Sensitive Data" />);

      expect(screen.queryByTestId('markdown-image')).toBeNull();

      const placeholder = screen.getByTestId('blocked-asset-placeholder');
      expect(placeholder).toBeInTheDocument();

      const message = screen.getByTestId('missing-asset-message');
      expect(message).toHaveTextContent('Path traversal or absolute filesystem path blocked');
    });

    it('blocks dangerous protocol schemes (javascript, data, file)', () => {
      render(<MarkdownImage src="javascript:alert(1)" alt="XSS" />);

      expect(screen.queryByTestId('markdown-image')).toBeNull();
      const placeholder = screen.getByTestId('blocked-asset-placeholder');
      expect(placeholder).toBeInTheDocument();
      expect(screen.getByTestId('missing-asset-message')).toHaveTextContent(
        'Blocked dangerous or unsupported image scheme'
      );
    });
  });

  describe('MarkdownViewer Integration with Images', () => {
    it('renders relative images within the MarkdownViewer pipeline', () => {
      const markdown = `
# Project Documentation

Here is the system architecture:
![Architecture Diagram](./images/arch.png "System Arch")
`;
      render(<MarkdownViewer content={markdown} />);

      const img = screen.getByTestId('markdown-image');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/local-asset/images/arch.png');
      expect(img).toHaveAttribute('alt', 'Architecture Diagram');
      expect(img).toHaveAttribute('title', 'System Arch');
    });

    it('renders missing asset placeholder in MarkdownViewer when image fails to load', () => {
      const markdown = `
# User Guide

![Missing Diagram](./missing-guide.png)
`;
      render(<MarkdownViewer content={markdown} />);

      const img = screen.getByTestId('markdown-image');
      fireEvent.error(img);

      expect(screen.getByTestId('missing-asset-placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('missing-asset-message')).toHaveTextContent(
        'Image not found: ./missing-guide.png'
      );
    });

    it('renders remote image placeholder in MarkdownViewer when remote image is referenced', () => {
      const markdown = `
# External Image Test

![External Logo](https://remote.cdn/logo.png)
`;
      render(<MarkdownViewer content={markdown} />);

      expect(screen.queryByTestId('markdown-image')).toBeNull();
      expect(screen.getByTestId('blocked-asset-placeholder')).toBeInTheDocument();
      expect(screen.getByTestId('missing-asset-message')).toHaveTextContent(
        'Remote image blocked: https://remote.cdn/logo.png'
      );
    });
  });
});
