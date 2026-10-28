import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AppShell } from './AppShell';
import { createTabStore, TabStore } from '../tabs/tabStore';

describe('AppShell Integration & Component Tests (US-007.4)', () => {
  let store: TabStore;

  beforeEach(() => {
    store = createTabStore();
  });

  it('renders empty state when launched with zero tabs', () => {
    render(<AppShell store={store} />);

    expect(screen.getByRole('heading', { level: 2, name: /no document open/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open markdown file/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(screen.getByRole('status')).toHaveTextContent('No document open');
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
    expect(screen.getByRole('status')).toHaveTextContent('1 tab open');
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
    expect(screen.getByRole('heading', { level: 2, name: /no document open/i })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ready');
    expect(screen.getByRole('status')).toHaveTextContent('No document open');
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

  it('renders appBrand as a static, non-interactive branding element', () => {
    const handleOpenFile = vi.fn();
    const { container } = render(<AppShell store={store} onOpenFile={handleOpenFile} />);

    const brand = container.querySelector('#appBrand');
    expect(brand).toBeInTheDocument();
    expect(brand).not.toHaveAttribute('role', 'button');
    expect(brand).not.toHaveAttribute('tabindex');

    if (brand) {
      fireEvent.click(brand);
    }
    expect(handleOpenFile).not.toHaveBeenCalled();
  });
});
