import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, RecentFileItem } from './EmptyState';

describe('EmptyState Component (US-007.3)', () => {
  it('renders title, subtitle, Open File button, and shortcut cheatsheet', () => {
    render(<EmptyState onOpenFile={vi.fn()} />);

    expect(screen.getByRole('heading', { level: 2, name: /open document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open markdown file/i })).toBeInTheDocument();
    expect(screen.getByText(/drop markdown \(\.md\) files here/i)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /keyboard shortcuts/i })).toBeInTheDocument();
  });

  it('triggers onOpenFile when the Open File button is clicked', () => {
    const handleOpenFile = vi.fn();
    render(<EmptyState onOpenFile={handleOpenFile} />);

    const openBtn = screen.getByRole('button', { name: /open markdown file/i });
    fireEvent.click(openBtn);

    expect(handleOpenFile).toHaveBeenCalledTimes(1);
  });

  it('handles drag-over and drag-leave state transitions on the dropzone', () => {
    render(<EmptyState />);

    const dropzone = screen.getByRole('region', { name: /dropzone for markdown files/i });
    expect(dropzone).not.toHaveClass('is-drag-over');

    fireEvent.dragOver(dropzone);
    expect(dropzone).toHaveClass('is-drag-over');
    expect(screen.getByText(/release to open markdown files/i)).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(dropzone).not.toHaveClass('is-drag-over');
    expect(screen.getByText(/drop markdown \(\.md\) files here/i)).toBeInTheDocument();
  });

  it('handles file drop and triggers onFileDrop with dropped files', () => {
    const handleFileDrop = vi.fn();
    render(<EmptyState onFileDrop={handleFileDrop} />);

    const dropzone = screen.getByRole('region', { name: /dropzone for markdown files/i });
    const fakeFile = new File(['# Title'], 'notes.md', { type: 'text/markdown' });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [fakeFile],
      },
    });

    expect(handleFileDrop).toHaveBeenCalledTimes(1);
    expect(handleFileDrop).toHaveBeenCalledWith([fakeFile]);
  });

  it('renders recent files list and calls onSelectRecentFile when clicked', () => {
    const handleSelectRecent = vi.fn();
    const recentFiles: RecentFileItem[] = [
      { filePath: '/projects/readme.md', filename: 'readme.md' },
      { filePath: '/docs/spec.md', filename: 'spec.md' },
    ];

    render(
      <EmptyState
        recentFiles={recentFiles}
        onSelectRecentFile={handleSelectRecent}
      />
    );

    expect(screen.getByText('readme.md')).toBeInTheDocument();
    expect(screen.getByText('spec.md')).toBeInTheDocument();

    const recentItem = screen.getByRole('button', { name: /open recent file: readme\.md/i });
    fireEvent.click(recentItem);

    expect(handleSelectRecent).toHaveBeenCalledWith('/projects/readme.md');

    // Also test keyboard selection
    fireEvent.keyDown(recentItem, { key: 'Enter' });
    expect(handleSelectRecent).toHaveBeenCalledTimes(2);
  });

  it('displays empty message when no recent files are present', () => {
    render(<EmptyState recentFiles={[]} />);
    expect(screen.getByText(/no recent documents/i)).toBeInTheDocument();
  });
});
