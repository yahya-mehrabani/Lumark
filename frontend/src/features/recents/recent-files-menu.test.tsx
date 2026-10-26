import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecentFilesMenu } from './RecentFilesMenu';
import { RecentsStore, InMemoryRecentsAdapter } from './recentsStore';
import { RecentFileItem } from './types';

describe('RecentFilesMenu Component', () => {
  const sampleRecents: RecentFileItem[] = [
    {
      filePath: '/docs/guide.md',
      filename: 'guide.md',
      lastOpenedAt: '2026-10-25T10:00:00Z',
      exists: true,
    },
    {
      filePath: '/docs/deleted.md',
      filename: 'deleted.md',
      lastOpenedAt: '2026-10-25T09:30:00Z',
      exists: false,
    },
  ];

  it('renders Recent Files header button with closed state initially', () => {
    render(<RecentFilesMenu recentFiles={sampleRecents} />);
    const btn = screen.getByTestId('header-recents-btn');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('recents-dropdown')).not.toBeInTheDocument();
  });

  it('opens dropdown on click and displays recent files with tooltips', () => {
    render(<RecentFilesMenu recentFiles={sampleRecents} />);
    const btn = screen.getByTestId('header-recents-btn');
    fireEvent.click(btn);

    expect(btn).toHaveAttribute('aria-expanded', 'true');
    const dropdown = screen.getByTestId('recents-dropdown');
    expect(dropdown).toBeInTheDocument();

    const guideItem = screen.getByTestId('recent-item-guide.md');
    expect(guideItem).toBeInTheDocument();
    expect(guideItem).toHaveTextContent('guide.md');
    expect(guideItem).toHaveTextContent('/docs/guide.md');

    // Title attribute for path tooltip
    const nameEl = guideItem.querySelector('.recents-item-name');
    expect(nameEl).toHaveAttribute('title', '/docs/guide.md');
  });

  it('displays "Missing on disk" badge when a file does not exist', () => {
    render(<RecentFilesMenu recentFiles={sampleRecents} />);
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    const deletedItem = screen.getByTestId('recent-item-deleted.md');
    expect(deletedItem).toBeInTheDocument();
    const badge = screen.getByTestId('missing-file-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Missing on disk');
  });

  it('calls onSelectFile when an item is clicked and closes menu', () => {
    const handleSelect = vi.fn();
    render(<RecentFilesMenu recentFiles={sampleRecents} onSelectFile={handleSelect} />);
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    fireEvent.click(screen.getByTestId('recent-item-guide.md'));
    expect(handleSelect).toHaveBeenCalledWith('/docs/guide.md');
    expect(screen.queryByTestId('recents-dropdown')).not.toBeInTheDocument();
  });

  it('calls onRemoveFile when the remove button is clicked without triggering onSelectFile', () => {
    const handleSelect = vi.fn();
    const handleRemove = vi.fn();
    render(
      <RecentFilesMenu
        recentFiles={sampleRecents}
        onSelectFile={handleSelect}
        onRemoveFile={handleRemove}
      />
    );
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    const removeBtn = screen.getByTestId('remove-recent-deleted.md');
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalledWith('/docs/deleted.md');
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('calls onClearFiles when "Clear All" button is clicked', () => {
    const handleClear = vi.fn();
    render(<RecentFilesMenu recentFiles={sampleRecents} onClearFiles={handleClear} />);
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    const clearBtn = screen.getByTestId('clear-recents-btn');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    expect(handleClear).toHaveBeenCalled();
    expect(screen.queryByTestId('recents-dropdown')).not.toBeInTheDocument();
  });

  it('renders empty message when no recent files are present', () => {
    render(<RecentFilesMenu recentFiles={[]} />);
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    expect(screen.getByTestId('recents-empty-msg')).toHaveTextContent('No recent documents');
    expect(screen.queryByTestId('clear-recents-btn')).not.toBeInTheDocument();
  });

  it('closes dropdown when Escape key is pressed and restores focus to trigger button', () => {
    render(<RecentFilesMenu recentFiles={sampleRecents} />);
    const trigger = screen.getByTestId('header-recents-btn');
    fireEvent.click(trigger);
    expect(screen.getByTestId('recents-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('recents-dropdown')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes dropdown when clicking outside', () => {
    render(
      <div>
        <span data-testid="outside-el">Outside</span>
        <RecentFilesMenu recentFiles={sampleRecents} />
      </div>
    );
    const trigger = screen.getByTestId('header-recents-btn');
    fireEvent.click(trigger);
    expect(screen.getByTestId('recents-dropdown')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside-el'));
    expect(screen.queryByTestId('recents-dropdown')).not.toBeInTheDocument();
  });

  it('supports keyboard navigation via ArrowDown, ArrowUp, Home, End', () => {
    render(<RecentFilesMenu recentFiles={sampleRecents} />);
    fireEvent.click(screen.getByTestId('header-recents-btn'));

    const item1 = screen.getByTestId('recent-item-guide.md');
    const item2 = screen.getByTestId('recent-item-deleted.md');

    // Arrow down from item1 to item2
    fireEvent.keyDown(item1, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(item2);

    // Arrow up back to item1
    fireEvent.keyDown(item2, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(item1);

    // End key moves to last item
    fireEvent.keyDown(item1, { key: 'End' });
    expect(document.activeElement).toBe(item2);

    // Home key moves to first item
    fireEvent.keyDown(item2, { key: 'Home' });
    expect(document.activeElement).toBe(item1);
  });

  it('handles 200-char long paths with full title tooltip and end-ellipsis at 800px width in both themes', () => {
    const longPath = '/home/user/very/long/nested/directory/structure/that/keeps/going/and/going/to/verify/that/plain/css/end/ellipsis/truncates/the/path/correctly/without/breaking/layout/or/overflowing/the/popover/boundary/document-with-extended-name.md';
    expect(longPath.length).toBeGreaterThan(200);

    const longRecents: RecentFileItem[] = [
      {
        filePath: longPath,
        filename: 'document-with-extended-name.md',
        lastOpenedAt: '2026-10-26T12:00:00Z',
        exists: true,
      },
    ];

    for (const theme of ['light', 'dark']) {
      document.documentElement.setAttribute('data-theme', theme);
      const { unmount } = render(
        <div style={{ width: '800px', display: 'flex', justifyContent: 'flex-end' }}>
          <RecentFilesMenu recentFiles={longRecents} />
        </div>
      );

      fireEvent.click(screen.getByTestId('header-recents-btn'));
      const dropdown = screen.getByTestId('recents-dropdown');
      expect(dropdown).toBeInTheDocument();

      const item = screen.getByTestId('recent-item-document-with-extended-name.md');
      const pathEl = item.querySelector('.recents-item-path');
      expect(pathEl).toBeInTheDocument();
      // Verifies title attribute holds the full non-truncated 200+ char path
      expect(pathEl).toHaveAttribute('title', longPath);
      expect(pathEl).toHaveTextContent(longPath);

      unmount();
    }
  });
});

describe('RecentsStore & InMemoryRecentsAdapter', () => {
  it('deduplicates paths and moves reopened files to index 0', async () => {
    const adapter = new InMemoryRecentsAdapter([], 5);
    const store = new RecentsStore(adapter);

    await store.addRecentFile('/docs/one.md');
    await store.addRecentFile('/docs/two.md');
    await store.addRecentFile('/docs/three.md');

    let list = store.getRecentFiles();
    expect(list).toHaveLength(3);
    expect(list[0].filePath).toBe('/docs/three.md');

    // Reopen one.md
    await store.addRecentFile('/docs/one.md');
    list = store.getRecentFiles();
    expect(list).toHaveLength(3);
    expect(list[0].filePath).toBe('/docs/one.md');
    expect(list[1].filePath).toBe('/docs/three.md');
    expect(list[2].filePath).toBe('/docs/two.md');
  });

  it('enforces maximum bound and removes items', async () => {
    const adapter = new InMemoryRecentsAdapter([], 3);
    const store = new RecentsStore(adapter);

    await store.addRecentFile('/a.md');
    await store.addRecentFile('/b.md');
    await store.addRecentFile('/c.md');
    await store.addRecentFile('/d.md');

    let list = store.getRecentFiles();
    expect(list).toHaveLength(3);
    expect(list[0].filePath).toBe('/d.md');
    expect(list[2].filePath).toBe('/b.md'); // /a.md dropped off

    await store.removeRecentFile('/c.md');
    list = store.getRecentFiles();
    expect(list).toHaveLength(2);
    expect(list.map((i) => i.filePath)).toEqual(['/d.md', '/b.md']);

    await store.clearRecentFiles();
    expect(store.getRecentFiles()).toHaveLength(0);
  });
});
