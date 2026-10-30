import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Window } from '@wailsio/runtime';
import { AppShell } from './AppShell';
import { createTabStore, TabStore } from '../tabs/tabStore';

describe('AppShell Integration & Component Tests (US-007.4)', () => {
  let store: TabStore;

  beforeEach(() => {
    store = createTabStore();
  });

  it('renders empty state when launched with zero tabs', () => {
    render(<AppShell store={store} />);

    expect(screen.getByRole('heading', { level: 2, name: /open document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open markdown file/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
  });

  it('renders tab and document content when a document is opened', () => {
    render(<AppShell store={store} />);

    act(() => {
      store.openTab({
        filePath: '/docs/architecture.md',
        filename: 'architecture.md',
        content: '# Architecture Overview\nThis is the markdown content.',
      });
    });

    // Tab bar should now render
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /architecture\.md/i })).toBeInTheDocument();

    // Document viewport renders
    expect(screen.getByRole('heading', { level: 1, name: 'architecture.md' })).toBeInTheDocument();
    expect(screen.getByText(/This is the markdown content/)).toBeInTheDocument();

    // Status bar updates
    expect(screen.getByRole('status')).toHaveTextContent('/docs/architecture.md');
    expect(screen.getByRole('status')).toHaveTextContent('1 min read');
  });

  it('switches between tabs and updates active document view', () => {
    render(<AppShell store={store} />);

    act(() => {
      store.openTab({ filePath: '/a.md', filename: 'a.md', content: 'Doc A Content' });
      store.openTab({ filePath: '/b.md', filename: 'b.md', content: 'Doc B Content' });
    });

    // Currently tab B is active
    expect(screen.getByRole('heading', { level: 1, name: 'b.md' })).toBeInTheDocument();
    expect(screen.getByText('Doc B Content')).toBeInTheDocument();

    // Click tab A
    const tabA = screen.getByRole('tab', { name: /a\.md/i });
    fireEvent.click(tabA);

    expect(screen.getByRole('heading', { level: 1, name: 'a.md' })).toBeInTheDocument();
    expect(screen.getByText('Doc A Content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('/a.md');
  });

  it('closing a tab focuses adjacent tab; closing last tab returns to empty state', () => {
    render(<AppShell store={store} />);

    act(() => {
      store.openTab({ filePath: '/first.md', filename: 'first.md', content: 'First' });
      store.openTab({ filePath: '/second.md', filename: 'second.md', content: 'Second' });
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);

    // Close second tab
    const closeBtn2 = screen.getByLabelText('Close tab: second.md');
    fireEvent.click(closeBtn2);

    // Should now focus first tab
    expect(screen.getAllByRole('tab')).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'first.md' })).toBeInTheDocument();
    expect(screen.getByText('First')).toBeInTheDocument();

    // Close first tab (the last remaining tab)
    const closeBtn1 = screen.getByLabelText('Close tab: first.md');
    fireEvent.click(closeBtn1);

    // Must return to empty state
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: /open document/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
  });

  it('re-opening an open document focuses existing tab without duplicating', () => {
    render(<AppShell store={store} />);

    act(() => {
      store.openTab({ filePath: '/test.md', filename: 'test.md', content: 'Original' });
      store.openTab({ filePath: '/other.md', filename: 'other.md', content: 'Other' });
    });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: 'other.md' })).toBeInTheDocument();

    // Re-open test.md
    act(() => {
      store.openTab({ filePath: '/test.md' });
    });

    // Still 2 tabs, but active is now test.md
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 1, name: 'test.md' })).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('displays error notice and badge when file is marked missing or error', () => {
    render(<AppShell store={store} />);

    act(() => {
      const tab = store.openTab({ filePath: '/lost.md', filename: 'lost.md' });
      store.setTabStatus(tab.id, 'missing', 'File was deleted from disk');
    });

    expect(screen.getByRole('status', { name: 'File was deleted from disk' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Missing File: File was deleted from disk');
  });

  it('handles global Ctrl+O to trigger onOpenFile', () => {
    const handleOpenFile = vi.fn();
    render(<AppShell store={store} onOpenFile={handleOpenFile} />);

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
    expect(handleOpenFile).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'O', metaKey: true });
    expect(handleOpenFile).toHaveBeenCalledTimes(2);
  });

  it('renders appBrand as a clickable Home button that triggers Home/Empty State view', () => {
    const handleNavigateHome = vi.fn();
    const { container } = render(
      <AppShell store={store} onNavigateHome={handleNavigateHome} />
    );

    const brand = container.querySelector('#appBrand');
    expect(brand).toBeInTheDocument();
    expect(brand).toHaveAttribute('aria-label', 'Home');

    if (brand) {
      fireEvent.click(brand);
    }
    expect(handleNavigateHome).toHaveBeenCalledTimes(1);
  });

  it('renders 3-dot menu and triggers menu items with keyboard shortcuts', () => {
    const handleOpenFile = vi.fn();
    const handlePrint = vi.fn();
    const handleOpenSettings = vi.fn();
    const handleNavigateHome = vi.fn();

    render(
      <AppShell
        store={store}
        onOpenFile={handleOpenFile}
        onPrint={handlePrint}
        onOpenSettings={handleOpenSettings}
        onNavigateHome={handleNavigateHome}
      />
    );

    const menuBtn = screen.getByTestId('header-menu-btn');
    expect(menuBtn).toBeInTheDocument();

    // Menu is closed initially
    expect(screen.queryByTestId('header-dropdown-menu')).toBeNull();

    // Click 3-dot menu button to open dropdown
    fireEvent.click(menuBtn);
    expect(screen.getByTestId('header-dropdown-menu')).toBeInTheDocument();

    // Verify all menu items exist
    expect(screen.getByTestId('menu-item-open')).toHaveTextContent('Open File');
    expect(screen.getByTestId('menu-item-home')).toHaveTextContent('Home');
    expect(screen.getByTestId('menu-item-print')).toHaveTextContent('Print');
    expect(screen.getByTestId('menu-item-recents')).toHaveTextContent('Recent Files');
    expect(screen.getByTestId('menu-item-preferences')).toHaveTextContent('Preferences');

    // Click Home item
    fireEvent.click(screen.getByTestId('menu-item-home'));
    expect(handleNavigateHome).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('header-dropdown-menu')).toBeNull();

    // Test Ctrl+H shortcut
    fireEvent.keyDown(window, { key: 'H', ctrlKey: true });
    expect(handleNavigateHome).toHaveBeenCalledTimes(2);

    // Test Ctrl+Shift+H shortcut (Issue 10)
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true, shiftKey: true });
    expect(handleNavigateHome).toHaveBeenCalledTimes(3);

    // Test Ctrl+R opens menu and recents submenu (Issue 11)
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    expect(screen.getByTestId('header-dropdown-menu')).toBeInTheDocument();
    expect(screen.getByTestId('recents-submenu')).toBeInTheDocument();

    // Test second Ctrl+R toggles them closed (Issue 11)
    fireEvent.keyDown(window, { key: 'r', ctrlKey: true });
    expect(screen.queryByTestId('header-dropdown-menu')).toBeNull();
    expect(screen.queryByTestId('recents-submenu')).toBeNull();
  });

  it('renders window control buttons (minimize, maximize, close) and triggers Wails Window runtime methods', () => {
    const minSpy = vi.spyOn(Window, 'Minimise').mockImplementation(() => Promise.resolve());
    const maxSpy = vi.spyOn(Window, 'ToggleMaximise').mockImplementation(() => Promise.resolve());
    const closeSpy = vi.spyOn(Window, 'Close').mockImplementation(() => Promise.resolve());

    render(<AppShell store={store} />);

    const controls = screen.getByTestId('window-controls');
    expect(controls).toBeInTheDocument();

    const minBtn = screen.getByTestId('window-minimize-btn');
    const maxBtn = screen.getByTestId('window-maximize-btn');
    const closeBtn = screen.getByTestId('window-close-btn');

    expect(minBtn).toBeInTheDocument();
    expect(maxBtn).toBeInTheDocument();
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(minBtn);
    expect(minSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(maxBtn);
    expect(maxSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(closeBtn);
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('implements frameless window configuration and draggable top bar with non-draggable controls', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Verify main.go configures Frameless: true
    const mainGoPath = path.resolve(__dirname, '../../../../main.go');
    const mainGoContent = fs.readFileSync(mainGoPath, 'utf-8');
    expect(mainGoContent).toMatch(/Frameless:\s*true/);

    // 2. Verify shell.css sets draggable region on top-bar
    const shellCssPath = path.resolve(__dirname, 'shell.css');
    const shellCssContent = fs.readFileSync(shellCssPath, 'utf-8');
    expect(shellCssContent).toMatch(/\.top-bar[^{]*\{[^}]*--wails-draggable:\s*drag/);
    expect(shellCssContent).toMatch(/\.top-bar[^{]*\{[^}]*-webkit-app-region:\s*drag/);

    // 3. Verify shell.css marks buttons, inputs, and window controls as no-drag
    expect(shellCssContent).toMatch(/--wails-draggable:\s*no-drag/);
    expect(shellCssContent).toMatch(/-webkit-app-region:\s*no-drag/);
    expect(shellCssContent).toMatch(/\.window-control-btn/);

    // 4. Verify tabs.css marks tab items and controls as no-drag
    const tabsCssPath = path.resolve(__dirname, '../tabs/tabs.css');
    const tabsCssContent = fs.readFileSync(tabsCssPath, 'utf-8');
    expect(tabsCssContent).toMatch(/\.tab-item[^{]*\{[^}]*--wails-draggable:\s*no-drag/);
    expect(tabsCssContent).toMatch(/\.tab-item[^{]*\{[^}]*-webkit-app-region:\s*no-drag/);
  });
});
