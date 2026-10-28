import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { SettingsModal } from './SettingsModal';
import { SettingsStore } from './settingsStore';

describe('Category 4: Layout, Scrollbars & Settings Modal Verification', () => {
  const markdownCssPath = path.resolve(__dirname, '../rendering/markdown.css');
  const markdownCss = fs.readFileSync(markdownCssPath, 'utf-8');

  const preferencesCssPath = path.resolve(__dirname, 'preferences.css');
  const preferencesCss = fs.readFileSync(preferencesCssPath, 'utf-8');

  describe('Issue 9: Scrollbar Overlap & List Breathing Room', () => {
    it('applies scrollbar-gutter: stable to .markdown-viewport and .document-wrapper', () => {
      const viewportRegex = /\.markdown-viewport\s*\{[\s\S]*?scrollbar-gutter:\s*stable;/;
      const documentWrapperRegex = /\.document-wrapper\s*\{[\s\S]*?scrollbar-gutter:\s*stable;/;

      expect(markdownCss).toMatch(viewportRegex);
      expect(markdownCss).toMatch(documentWrapperRegex);
    });

    it('ensures ul and ol lists have sufficient padding-right so text never touches scrollbar track', () => {
      const listPaddingRegex = /\.markdown-content\s+ul,\s*\n*\.markdown-content\s+ol\s*\{[\s\S]*?padding-right:\s*1[2-9]px;/;
      expect(markdownCss).toMatch(listPaddingRegex);
    });
  });

  describe('Issue 8: Settings Toggles Card & Minimalist Aesthetic', () => {
    it('renders Show TOC and Restore Tabs inside a unified .setting-toggles-card with divider', () => {
      const store = new SettingsStore();
      render(<SettingsModal isOpen={true} onClose={() => {}} store={store} />);

      const card = screen.getByTestId('settings-toggles-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('setting-toggles-card');

      // Contains both checkboxes
      const showToc = screen.getByTestId('settings-show-toc-checkbox');
      const restoreTabs = screen.getByTestId('settings-restore-tabs-checkbox');
      expect(card).toContainElement(showToc);
      expect(card).toContainElement(restoreTabs);

      // Verifies sub-descriptions are completely removed
      expect(card.querySelector('.settings-description')).toBeNull();

      // Divider is present
      expect(card.querySelector('.setting-toggle-divider')).not.toBeNull();
    });

    it('preferences.css defines .setting-toggles-card and .setting-toggle-divider styles', () => {
      expect(preferencesCss).toContain('.setting-toggles-card');
      expect(preferencesCss).toContain('.setting-toggle-divider');
    });
  });

  describe('Issue 7: Reset Confirmation Buttons Sizing & Alignment', () => {
    it('preferences.css sets equal min-width of 64px for both Yes and Cancel reset buttons', () => {
      const confirmBtnRegex = /\.settings-confirm-btn\s*\{[\s\S]*?min-width:\s*64px;/;
      const cancelBtnRegex = /\.settings-cancel-btn\s*\{[\s\S]*?min-width:\s*64px;/;

      expect(preferencesCss).toMatch(confirmBtnRegex);
      expect(preferencesCss).toMatch(cancelBtnRegex);
    });

    it('renders Yes and Cancel buttons with identical classes and equal accessibility labels', () => {
      const store = new SettingsStore();
      render(<SettingsModal isOpen={true} onClose={() => {}} store={store} />);

      // Click Reset to open confirmation box
      const resetBtn = screen.getByTestId('settings-reset-btn');
      fireEvent.click(resetBtn);

      const confirmBtn = screen.getByTestId('settings-confirm-reset-btn');
      const cancelBtn = screen.getByTestId('settings-cancel-reset-btn');

      expect(confirmBtn).toBeInTheDocument();
      expect(cancelBtn).toBeInTheDocument();
      expect(confirmBtn).toHaveTextContent('Yes');
      expect(cancelBtn).toHaveTextContent('Cancel');
    });
  });
});
