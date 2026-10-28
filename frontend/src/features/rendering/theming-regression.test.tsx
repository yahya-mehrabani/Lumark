import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CodeBlock } from './components/CodeBlock';
import { MermaidBlock } from './components/MermaidBlock';

describe('Category 3: Theming & Typography Verification', () => {
  const markdownCssPath = path.resolve(__dirname, 'markdown.css');
  const markdownCss = fs.readFileSync(markdownCssPath, 'utf-8');

  describe('Issue 13: Dark Mode Code Blocks Styling', () => {
    it('markdown.css defines dark background for code block containers and shiki in dark mode', () => {
      // Must contain dark theme rules for .code-block-container and .shiki
      expect(markdownCss).toContain('[data-theme="dark"] .code-block-container');
      expect(markdownCss).toContain('[data-theme="dark"] .shiki');
      expect(markdownCss).toContain('var(--bg-code');
      expect(markdownCss).toContain('var(--shiki-dark-bg');
    });

    it('markdown.css ensures dark mode code tokens use --shiki-dark with !important for vibrant syntax highlighting', () => {
      // Must ensure [data-theme="dark"] .shiki span uses !important to override inline light colors
      const darkModeSpanRuleRegex = /\[data-theme="dark"\]\s*\.shiki\s+span[\s\S]*?color:\s*var\(--shiki-dark[\s\S]*?!important/;
      expect(markdownCss).toMatch(darkModeSpanRuleRegex);
    });

    it('markdown.css overrides inner pre, code, and Shiki wrappers to transparent so container --bg-code is the only visible layer', () => {
      // Must set background to transparent on inner elements
      expect(markdownCss).toContain('.shiki-wrapper,');
      expect(markdownCss).toContain('background: transparent !important;');
      expect(markdownCss).toContain('background-color: transparent !important;');
    });

    it('CodeBlock renders code with dual themes and dark token variables', async () => {
      const codeSnippet = 'const greeting = "Hello World";';
      render(<CodeBlock rawCode={codeSnippet} language="typescript" />);

      await waitFor(() => {
        expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
      });

      const wrapper = screen.getByTestId('shiki-wrapper');
      expect(wrapper.innerHTML).toContain('class="shiki');
      expect(wrapper.innerHTML).toContain('--shiki-dark');
    });
  });

  describe('Issue 6: Mermaid Fullscreen Modal Backdrop', () => {
    it('markdown.css sets .mermaid-lightbox-overlay background to var(--bg-canvas)', () => {
      // Must use var(--bg-canvas) rather than pure black
      const overlayRuleRegex = /\.mermaid-lightbox-overlay\s*\{[\s\S]*?background-color:\s*var\(--bg-canvas\);/;
      expect(markdownCss).toMatch(overlayRuleRegex);
    });

    it('markdown.css ensures .mermaid-lightbox-close button adheres to design system theme tokens', () => {
      const closeBtnRegex = /\.mermaid-lightbox-close\s*\{[\s\S]*?var\(--bg-surface\)/;
      expect(markdownCss).toMatch(closeBtnRegex);
    });

    it('MermaidBlock opens modal with lightbox overlay and close button', async () => {
      const { container } = render(
        <MermaidBlock rawCode="graph TD; A[Start] --> B[End];" />
      );

      // Wait for rendering
      await waitFor(() => {
        const svgWrapper = container.querySelector('.mermaid-svg-wrapper');
        expect(svgWrapper).toBeInTheDocument();
      });

      const mermaidContainer = screen.getByTestId('mermaid-container');
      fireEvent.click(mermaidContainer);

      await waitFor(() => {
        expect(screen.getByTestId('mermaid-modal-overlay')).toBeInTheDocument();
      });

      const overlay = screen.getByTestId('mermaid-modal-overlay');
      expect(overlay).toHaveClass('mermaid-lightbox-overlay');

      const closeButton = screen.getByTestId('mermaid-modal-close');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('mermaid-lightbox-close');

      // Clicking close dismisses modal
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.queryByTestId('mermaid-modal-overlay')).not.toBeInTheDocument();
      });
    });
  });
});
