import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabBar } from './TabBar';
import { TabItem as TabItemData } from './types';

const mockTabs: TabItemData[] = [
  {
    id: 'tab-1',
    filePath: '/docs/intro.md',
    filename: 'intro.md',
    parentDir: 'docs',
    displayTitle: 'intro.md',
    content: '# Intro',
    status: 'ready',
  },
  {
    id: 'tab-2',
    filePath: '/docs/setup.md',
    filename: 'setup.md',
    parentDir: 'docs',
    displayTitle: 'setup.md',
    content: '# Setup',
    status: 'ready',
  },
  {
    id: 'tab-3',
    filePath: '/missing.md',
    filename: 'missing.md',
    parentDir: '',
    displayTitle: 'missing.md',
    content: '',
    status: 'missing',
    errorMessage: 'File not found on disk',
  },
];

describe('TabBar & TabItem Components (US-007.2)', () => {
  it('renders nothing when tabs list is empty', () => {
    const { container } = render(
      <TabBar tabs={[]} activeTabId={null} onSelectTab={vi.fn()} onCloseTab={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders accessible tab list and tab items with correct roles and aria attributes', () => {
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-2"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
      />
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);

    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[0]).toHaveTextContent('intro.md');

    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveClass('is-active');
    expect(tabs[1]).toHaveTextContent('setup.md');

    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveTextContent('missing.md');
  });

  it('calls onSelectTab when a tab is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-1"
        onSelectTab={handleSelect}
        onCloseTab={vi.fn()}
      />
    );

    const tabs = screen.getAllByRole('tab');
    fireEvent.click(tabs[1]);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith('tab-2');
  });

  it('calls onCloseTab when close button is clicked', () => {
    const handleClose = vi.fn();
    const handleSelect = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-1"
        onSelectTab={handleSelect}
        onCloseTab={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText('Close tab: setup.md');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledWith('tab-2');
    // Clicking close button must not trigger tab selection
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('closes tab on middle-click (button === 1 auxclick)', () => {
    const handleClose = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-1"
        onSelectTab={vi.fn()}
        onCloseTab={handleClose}
      />
    );

    const tabs = screen.getAllByRole('tab');
    fireEvent.mouseDown(tabs[0], { button: 1 });

    expect(handleClose).toHaveBeenCalledWith('tab-1');
  });

  it('displays status badge for missing or error files without crashing', () => {
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-3"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
      />
    );

    const missingBadge = screen.getByRole('status', { name: 'File not found on disk' });
    expect(missingBadge).toBeInTheDocument();
    expect(missingBadge).toHaveTextContent('Missing');
  });

  it('handles keyboard navigation with ArrowRight and ArrowLeft', () => {
    const handleSelect = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-1"
        onSelectTab={handleSelect}
        onCloseTab={vi.fn()}
      />
    );

    const tablist = screen.getByRole('tablist');
    fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    expect(handleSelect).toHaveBeenCalledWith('tab-2');

    fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    expect(handleSelect).toHaveBeenCalledWith('tab-3'); // Wraps to last tab

    fireEvent.keyDown(tablist, { key: 'End' });
    expect(handleSelect).toHaveBeenCalledWith('tab-3');

    fireEvent.keyDown(tablist, { key: 'Home' });
    expect(handleSelect).toHaveBeenCalledWith('tab-1');
  });

  it('closes active tab on Ctrl+W keyboard shortcut', () => {
    const handleClose = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-2"
        onSelectTab={vi.fn()}
        onCloseTab={handleClose}
      />
    );

    // Trigger window Ctrl+W
    fireEvent.keyDown(window, { key: 'w', ctrlKey: true });
    expect(handleClose).toHaveBeenCalledWith('tab-2');

    // Trigger Cmd+W (macOS metaKey)
    fireEvent.keyDown(window, { key: 'W', metaKey: true });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('renders +X more pill when tabs exceed visible limit and opens hidden tabs dropdown', () => {
    const handleSelect = vi.fn();
    render(
      <TabBar
        tabs={mockTabs}
        activeTabId="tab-1"
        onSelectTab={handleSelect}
        onCloseTab={vi.fn()}
        maxVisibleTabs={2}
      />
    );

    // Visible tabs in list: tab-1 and tab-2
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);

    // Overflow pill shows "+1 more"
    const pill = screen.getByTestId('tab-overflow-pill');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('+1 more');

    // Menu is closed initially
    expect(screen.queryByTestId('tab-overflow-menu')).toBeNull();

    // Click pill to open dropdown
    fireEvent.click(pill);
    expect(screen.getByTestId('tab-overflow-menu')).toBeInTheDocument();
    expect(screen.getByTestId('overflow-item-tab-3')).toHaveTextContent('missing.md');

    // Click hidden tab in dropdown to select it
    fireEvent.click(screen.getByTestId('overflow-item-tab-3'));
    expect(handleSelect).toHaveBeenCalledWith('tab-3');
    expect(screen.queryByTestId('tab-overflow-menu')).toBeNull();
  });

  describe('Tab Context Menu', () => {
    it('opens context menu on right-click on a tab and supports Close, Close Others, and Close All', () => {
      const handleClose = vi.fn();
      const handleCloseAll = vi.fn();
      const handleCloseOthers = vi.fn();

      render(
        <TabBar
          tabs={mockTabs}
          activeTabId="tab-1"
          onSelectTab={vi.fn()}
          onCloseTab={handleClose}
          onCloseAllTabs={handleCloseAll}
          onCloseOtherTabs={handleCloseOthers}
        />
      );

      const tabs = screen.getAllByRole('tab');

      // Right-click on setup.md (tab-2)
      fireEvent.contextMenu(tabs[1]);

      const contextMenu = screen.getByTestId('tab-context-menu');
      expect(contextMenu).toBeInTheDocument();
      expect(screen.getByTestId('tab-menu-close')).toHaveTextContent('Close');
      expect(screen.getByTestId('tab-menu-close-others')).toHaveTextContent('Close Others');
      expect(screen.getByTestId('tab-menu-close-all')).toHaveTextContent('Close All');

      // Clicking Close calls onCloseTab with tab-2 and closes context menu
      fireEvent.click(screen.getByTestId('tab-menu-close'));
      expect(handleClose).toHaveBeenCalledWith('tab-2');
      expect(screen.queryByTestId('tab-context-menu')).toBeNull();

      // Right-click again and click Close Others
      fireEvent.contextMenu(tabs[0]);
      expect(screen.getByTestId('tab-context-menu')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('tab-menu-close-others'));
      expect(handleCloseOthers).toHaveBeenCalledWith('tab-1');
      expect(screen.queryByTestId('tab-context-menu')).toBeNull();

      // Right-click again and click Close All
      fireEvent.contextMenu(tabs[0]);
      expect(screen.getByTestId('tab-context-menu')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('tab-menu-close-all'));
      expect(handleCloseAll).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('tab-context-menu')).toBeNull();
    });

    it('dismisses context menu on Escape key press and outside click', () => {
      render(
        <TabBar
          tabs={mockTabs}
          activeTabId="tab-1"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
        />
      );

      const tabs = screen.getAllByRole('tab');
      fireEvent.contextMenu(tabs[0]);
      expect(screen.getByTestId('tab-context-menu')).toBeInTheDocument();

      // Press Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('tab-context-menu')).toBeNull();

      // Right click again, then click outside
      fireEvent.contextMenu(tabs[0]);
      expect(screen.getByTestId('tab-context-menu')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByTestId('tab-context-menu')).toBeNull();
    });
  });
});
