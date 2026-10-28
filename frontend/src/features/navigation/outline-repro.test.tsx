import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import { MarkdownViewer } from '../rendering/MarkdownViewer';
import { extractHeadingsFromMarkdown } from './tocGenerator';
import { zoomController } from '../viewport/zoomController';

describe('Outline Jump Reproduction with Real AGENTS.md and PRD.md', () => {
  let scrollToMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToMock = vi.fn();
    window.HTMLElement.prototype.scrollTo =
      scrollToMock as unknown as typeof Element.prototype.scrollTo;
    zoomController.resetZoom();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    zoomController.resetZoom();
  });

  it('verifies all TOC entries in AGENTS.md resolve to rendered heading elements and trigger scrollTo', () => {
    const agentsPath = path.resolve(__dirname, '../../../../AGENTS.md');
    const content = fs.readFileSync(agentsPath, 'utf-8');

    const expectedToc = extractHeadingsFromMarkdown(content);
    expect(expectedToc.length).toBeGreaterThan(0);

    render(
      <MarkdownViewer
        document={{ filename: 'AGENTS.md', filePath: agentsPath, content }}
        showToc={true}
      />
    );

    const tocList = screen.getByTestId('toc-list');
    expect(tocList).toBeInTheDocument();

    const missingInDom: string[] = [];
    const failedClicks: string[] = [];

    for (const item of expectedToc) {
      // 1. Check if heading element with target ID exists in rendered DOM
      const headingEl = document.getElementById(item.id);
      if (!headingEl) {
        missingInDom.push(item.id);
        continue;
      }

      // 2. Click the TOC link
      const tocLink = screen.queryByTestId(`toc-link-${item.id}`);
      if (!tocLink) {
        failedClicks.push(`TOC link not found for id: ${item.id}`);
        continue;
      }

      scrollToMock.mockClear();
      fireEvent.click(tocLink);

      if (
        scrollToMock.mock.calls.length === 0 ||
        scrollToMock.mock.calls[0][0]?.behavior !== 'smooth'
      ) {
        failedClicks.push(
          `Click on ${item.id} failed. Calls: ${JSON.stringify(scrollToMock.mock.calls)}`
        );
      }
    }

    expect(missingInDom).toEqual([]);
    expect(failedClicks).toEqual([]);
  });

  it('verifies all TOC entries in PRD.md resolve to rendered heading elements and trigger scrollTo', () => {
    const prdPath = path.resolve(__dirname, '../../../../PRD.md');
    const content = fs.readFileSync(prdPath, 'utf-8');

    const expectedToc = extractHeadingsFromMarkdown(content);
    expect(expectedToc.length).toBeGreaterThan(0);

    render(
      <MarkdownViewer
        document={{ filename: 'PRD.md', filePath: prdPath, content }}
        showToc={true}
      />
    );

    const tocList = screen.getByTestId('toc-list');
    expect(tocList).toBeInTheDocument();

    const missingInDom: string[] = [];
    const failedClicks: string[] = [];

    for (const item of expectedToc) {
      const headingEl = document.getElementById(item.id);
      if (!headingEl) {
        missingInDom.push(item.id);
        continue;
      }

      const tocLink = screen.queryByTestId(`toc-link-${item.id}`);
      if (!tocLink) {
        failedClicks.push(`TOC link not found for id: ${item.id}`);
        continue;
      }

      scrollToMock.mockClear();
      fireEvent.click(tocLink);

      if (
        scrollToMock.mock.calls.length === 0 ||
        scrollToMock.mock.calls[0][0]?.behavior !== 'smooth'
      ) {
        failedClicks.push(
          `Click on ${item.id} failed. Calls: ${JSON.stringify(scrollToMock.mock.calls)}`
        );
      }
    }

    expect(missingInDom).toEqual([]);
    expect(failedClicks).toEqual([]);
  }, 25000);
});
