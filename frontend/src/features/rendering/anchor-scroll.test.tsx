import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MarkdownViewer } from './MarkdownViewer';
import { Heading } from './components/Heading';
import { SlugTracker, SlugContext } from './utils/slugify';

describe('Custom Headings & Anchor Scrolling (US-012.2)', () => {
  let scrollIntoViewMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollIntoViewMock = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as unknown as typeof Element.prototype.scrollIntoView;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Heading Component Isolated Tests', () => {
    it('renders heading levels 1 through 6 with corresponding HTML tag and classes', () => {
      const tracker = new SlugTracker();
      const { rerender } = render(
        <SlugContext.Provider value={tracker}>
          <Heading level={1}>Top Title</Heading>
        </SlugContext.Provider>
      );

      const h1 = screen.getByTestId('heading-1');
      expect(h1.tagName.toLowerCase()).toBe('h1');
      expect(h1).toHaveAttribute('id', 'top-title');
      expect(h1).toHaveClass('markdown-heading', 'markdown-h1');

      rerender(
        <SlugContext.Provider value={tracker}>
          <Heading level={3}>Sub Section</Heading>
        </SlugContext.Provider>
      );
      const h3 = screen.getByTestId('heading-3');
      expect(h3.tagName.toLowerCase()).toBe('h3');
      expect(h3).toHaveAttribute('id', 'sub-section');
      expect(h3).toHaveClass('markdown-heading', 'markdown-h3');
    });

    it('includes a clickable heading-anchor with direct link href', () => {
      render(<Heading level={2}>Architecture Overview</Heading>);
      const anchor = screen.getByTestId('heading-anchor');
      expect(anchor).toHaveAttribute('href', '#architecture-overview');
      expect(anchor).toHaveAttribute('title', 'Direct link to Architecture Overview');
      expect(anchor).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Deterministic ID Assignment & Duplicate Disambiguation in MarkdownViewer', () => {
    it('assigns unique predictable IDs to headings', () => {
      const markdown = `
# Getting Started

Some introductory text.

## Installation

Run setup.

### Verification

Check results.
`;
      render(<MarkdownViewer content={markdown} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 'getting-started');
      expect(screen.getByRole('heading', { level: 2 })).toHaveAttribute('id', 'installation');
      expect(screen.getByRole('heading', { level: 3 })).toHaveAttribute('id', 'verification');
    });

    it('disambiguates duplicate heading text with incrementing suffixes', () => {
      const markdown = `
# Overview

First overview.

## Overview

Second overview.

### Overview

Third overview.
`;
      render(<MarkdownViewer content={markdown} />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAttribute('id', 'overview');
      expect(headings[1]).toHaveAttribute('id', 'overview-1');
      expect(headings[2]).toHaveAttribute('id', 'overview-2');
    });

    it('generates valid IDs for Unicode / Persian / Arabic headings', () => {
      const markdown = `
# راهنمای کاربری

توضیحات کلی.

## ویژگی‌های پیشرفته

جزئیات سیستم.
`;
      render(<MarkdownViewer content={markdown} />);

      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAttribute('id', 'راهنمای-کاربری');
      expect(headings[1]).toHaveAttribute('id', 'ویژگی-های-پیشرفته');
    });
  });

  describe('Internal Anchor Link Smooth Scrolling', () => {
    it('scrolls smoothly to matching heading ID when anchor link is clicked', async () => {
      const markdown = `
[Go to Introduction](#introduction)

... lots of content ...

# Introduction

Welcome to the document!
`;
      render(<MarkdownViewer content={markdown} />);

      const link = screen.getByRole('link', { name: /Go to Introduction/i });
      expect(link).toHaveAttribute('href', '#introduction');

      fireEvent.click(link);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('scrolls to duplicate heading when anchor link references suffixed ID', async () => {
      const markdown = `
[Jump to Second Details](#details-1)

## Details

First section.

## Details

Second section.
`;
      render(<MarkdownViewer content={markdown} />);

      const link = screen.getByRole('link', { name: /Jump to Second Details/i });
      fireEvent.click(link);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('scrolls to Unicode heading when anchor link contains Persian characters', async () => {
      const markdown = `
[برو به بخش راهنما](#راهنمای-کاربری)

# راهنمای کاربری

محتوا.
`;
      render(<MarkdownViewer content={markdown} />);

      const link = screen.getByRole('link', { name: /برو به بخش راهنما/i });
      fireEvent.click(link);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('handles percent-encoded anchor link and scrolls to matching heading', async () => {
      const markdown = `
[Jump via encoded link](#%D8%B1%D8%A7%D9%87%D9%86%D9%85%D8%A7%DB%8C-%DA%A9%D8%A7%D8%B1%D8%A8%D8%B1%DB%8C)

# راهنمای کاربری

محتوا.
`;
      render(<MarkdownViewer content={markdown} />);

      const link = screen.getByRole('link', { name: /Jump via encoded link/i });
      fireEvent.click(link);

      expect(scrollIntoViewMock).toHaveBeenCalledTimes(1);
      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('delegates to onNavigateAnchor callback when provided on MarkdownViewer', async () => {
      const onNavigateAnchorMock = vi.fn();
      const markdown = `
[Go to Section](#my-section)

## My Section
`;
      render(
        <MarkdownViewer content={markdown} onNavigateAnchor={onNavigateAnchorMock} />
      );

      const link = screen.getByRole('link', { name: /Go to Section/i });
      fireEvent.click(link);

      expect(onNavigateAnchorMock).toHaveBeenCalledTimes(1);
      expect(onNavigateAnchorMock).toHaveBeenCalledWith('my-section');
    });

    it('does not throw or crash when anchor target does not exist in DOM', async () => {
      const markdown = `
[Broken Anchor](#non-existent-section)
`;
      render(<MarkdownViewer content={markdown} />);

      const link = screen.getByRole('link', { name: /Broken Anchor/i });
      expect(() => fireEvent.click(link)).not.toThrow();
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    });
  });
});
