import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import {
  slugify,
  extractTextFromNode,
  normalizeAuthorId,
  SlugTracker,
  createSlugTracker,
} from './utils/slugify';

describe('Deterministic Slug Generator (US-012.1)', () => {
  let tracker: SlugTracker;

  beforeEach(() => {
    tracker = createSlugTracker();
  });

  describe('slugify basic transformation', () => {
    it('converts basic English headings to lowercase hyphenated slugs', () => {
      expect(slugify('Getting Started')).toBe('getting-started');
      expect(slugify('Quick Start Guide')).toBe('quick-start-guide');
      expect(slugify('API Reference v1')).toBe('api-reference-v1');
    });

    it('collapses multiple whitespace characters and hyphens', () => {
      expect(slugify('Section   with    Multiple     Spaces')).toBe('section-with-multiple-spaces');
      expect(slugify('Hyphen---Separated---Words')).toBe('hyphen-separated-words');
      expect(slugify('Mixed _ and - and spaces')).toBe('mixed-and-and-spaces');
    });

    it('removes punctuation and special characters', () => {
      expect(slugify('What is Markdown?!')).toBe('what-is-markdown');
      expect(slugify('C++ / C# Performance & Memory')).toBe('c-c-performance-memory');
      expect(slugify('Hello, World! (v2.0) [New]')).toBe('hello-world-v2-0-new');
    });

    it('strips leading and trailing punctuation and hyphens', () => {
      expect(slugify('--- Leading and trailing hyphens ---')).toBe('leading-and-trailing-hyphens');
      expect(slugify('...Ellipsis Heading...')).toBe('ellipsis-heading');
    });

    it('removes embedded HTML tags before slugifying', () => {
      expect(slugify('Section with <code>code</code> and <span class="badge">Badge</span>')).toBe(
        'section-with-code-and-badge'
      );
    });

    it('handles empty strings and strings with only punctuation with safe fallback', () => {
      expect(slugify('')).toBe('heading');
      expect(slugify('   ')).toBe('heading');
      expect(slugify('!@#$%^&*()')).toBe('heading');
    });
  });

  describe('Unicode & Multilingual Support (PRD Section 6.3 & FR-RENDER-008)', () => {
    it('preserves Persian and Arabic script characters in slug', () => {
      expect(slugify('راهنمای کاربری')).toBe('راهنمای-کاربری');
      expect(slugify('ویژگی‌های پیشرفته')).toBe('ویژگی-های-پیشرفته');
      expect(slugify('مستندات فارسی')).toBe('مستندات-فارسی');
    });

    it('handles mixed Persian and English headings', () => {
      expect(slugify('نصب Wails و راه‌اندازی QuickStart')).toBe('نصب-wails-و-راه-اندازی-quickstart');
      expect(slugify('API مستندات (نسخه ۱.۰)')).toBe('api-مستندات-نسخه-۱-۰');
    });

    it('handles CJK and European accented characters', () => {
      expect(slugify('Über Entwickler')).toBe('über-entwickler');
      expect(slugify('日本語のドキュメント')).toBe('日本語のドキュメント');
    });
  });

  describe('extractTextFromNode helper', () => {
    it('extracts text from strings, numbers, and arrays', () => {
      expect(extractTextFromNode('Simple string')).toBe('Simple string');
      expect(extractTextFromNode(1234)).toBe('1234');
      expect(extractTextFromNode(['Part 1 ', 'Part 2'])).toBe('Part 1 Part 2');
    });

    it('extracts text recursively from nested React elements', () => {
      const element = React.createElement(
        'h2',
        null,
        'Heading with ',
        React.createElement('code', null, 'inline code'),
        ' and ',
        React.createElement('strong', null, 'bold')
      );
      expect(extractTextFromNode(element)).toBe('Heading with inline code and bold');
    });

    it('handles null, undefined, and boolean values gracefully', () => {
      expect(extractTextFromNode(null)).toBe('');
      expect(extractTextFromNode(undefined)).toBe('');
      expect(extractTextFromNode(false)).toBe('');
    });
  });

  describe('normalizeAuthorId helper', () => {
    it('preserves clean author-defined IDs', () => {
      expect(normalizeAuthorId('custom-anchor')).toBe('custom-anchor');
      expect(normalizeAuthorId('section-42')).toBe('section-42');
    });

    it('replaces spaces with hyphens and removes unsafe characters', () => {
      expect(normalizeAuthorId('my custom section')).toBe('my-custom-section');
      expect(normalizeAuthorId('unsafe<script>id')).toBe('unsafescriptid');
    });
  });

  describe('SlugTracker duplicate disambiguation', () => {
    it('returns the base slug for the first occurrence', () => {
      expect(tracker.slug('Introduction')).toBe('introduction');
    });

    it('adds numerical suffixes for duplicate headings deterministically', () => {
      expect(tracker.slug('Introduction')).toBe('introduction');
      expect(tracker.slug('Introduction')).toBe('introduction-1');
      expect(tracker.slug('Introduction')).toBe('introduction-2');
      expect(tracker.slug('Introduction')).toBe('introduction-3');
    });

    it('disambiguates independently across different heading texts', () => {
      expect(tracker.slug('Overview')).toBe('overview');
      expect(tracker.slug('Details')).toBe('details');
      expect(tracker.slug('Overview')).toBe('overview-1');
      expect(tracker.slug('Details')).toBe('details-1');
      expect(tracker.slug('Overview')).toBe('overview-2');
    });

    it('avoids collision when heading text already contains a numeric suffix', () => {
      expect(tracker.slug('Section')).toBe('section');
      expect(tracker.slug('Section 1')).toBe('section-1');
      // If we ask for another "Section", it should not collide with "section-1"
      expect(tracker.slug('Section')).toBe('section-2');
    });

    it('supports author-provided custom ID with disambiguation', () => {
      expect(tracker.slug('Title', 'custom-id')).toBe('custom-id');
      expect(tracker.slug('Other Title', 'custom-id')).toBe('custom-id-1');
    });

    it('resets state when reset() is called', () => {
      expect(tracker.slug('Introduction')).toBe('introduction');
      expect(tracker.slug('Introduction')).toBe('introduction-1');

      tracker.reset();

      expect(tracker.slug('Introduction')).toBe('introduction');
      expect(tracker.slug('Introduction')).toBe('introduction-1');
    });

    it('reports whether an ID exists via has()', () => {
      expect(tracker.has('my-anchor')).toBe(false);
      tracker.slug('My Anchor');
      expect(tracker.has('my-anchor')).toBe(true);
    });
  });
});
