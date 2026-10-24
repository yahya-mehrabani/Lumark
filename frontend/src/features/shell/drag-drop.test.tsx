import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DropZone } from './DropZone';

describe('DropZone Component', () => {
  it('renders children correctly without overlay initially', () => {
    render(
      <DropZone onFilesDropped={vi.fn()}>
        <div data-testid="child-content">App Shell Content</div>
      </DropZone>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
  });

  it('shows visual feedback overlay on dragenter and dragover', () => {
    render(
      <DropZone onFilesDropped={vi.fn()}>
        <div>App Shell</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');

    fireEvent.dragEnter(dropzone, {
      dataTransfer: { types: ['Files'] },
    });

    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();
    expect(screen.getByText('Drop Markdown files here to open')).toBeInTheDocument();
    expect(dropzone).toHaveClass('is-drag-over');

    fireEvent.dragOver(dropzone, {
      dataTransfer: { dropEffect: 'none' },
    });

    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();
  });

  it('hides visual overlay on dragleave when leaving the dropzone boundary', () => {
    render(
      <DropZone onFilesDropped={vi.fn()}>
        <div>App Shell</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');

    fireEvent.dragEnter(dropzone);
    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

    fireEvent.dragLeave(dropzone);
    expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
    expect(dropzone).not.toHaveClass('is-drag-over');
  });

  it('handles nested drag enter/leave without prematurely hiding overlay', () => {
    render(
      <DropZone onFilesDropped={vi.fn()}>
        <div data-testid="nested-child">Child Element</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');
    const child = screen.getByTestId('nested-child');

    // Enter container
    fireEvent.dragEnter(dropzone);
    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

    // Enter child (counter = 2)
    fireEvent.dragEnter(child);
    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

    // Leave child (counter = 1) -> still visible
    fireEvent.dragLeave(child);
    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

    // Leave container (counter = 0) -> hidden
    fireEvent.dragLeave(dropzone);
    expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
  });

  it('calls onFilesDropped with single dropped file and clears overlay', () => {
    const handleFilesDropped = vi.fn();
    render(
      <DropZone onFilesDropped={handleFilesDropped}>
        <div>App Shell</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');
    fireEvent.dragEnter(dropzone);
    expect(screen.getByTestId('dropzone-overlay')).toBeInTheDocument();

    const file = new File(['# Title'], 'notes.md', { type: 'text/markdown' });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.queryByTestId('dropzone-overlay')).toBeNull();
    expect(handleFilesDropped).toHaveBeenCalledTimes(1);
    expect(handleFilesDropped).toHaveBeenCalledWith([file]);
  });

  it('calls onFilesDropped with multiple dropped files preserving order', () => {
    const handleFilesDropped = vi.fn();
    render(
      <DropZone onFilesDropped={handleFilesDropped}>
        <div>App Shell</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');

    const file1 = new File(['# File 1'], 'first.md', { type: 'text/markdown' });
    const file2 = new File(['# File 2'], 'second.markdown', { type: 'text/markdown' });
    const file3 = new File(['# File 3'], 'third.mkd', { type: 'text/markdown' });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file1, file2, file3],
      },
    });

    expect(handleFilesDropped).toHaveBeenCalledTimes(1);
    const passedFiles = handleFilesDropped.mock.calls[0][0];
    expect(passedFiles).toHaveLength(3);
    expect(passedFiles[0].name).toBe('first.md');
    expect(passedFiles[1].name).toBe('second.markdown');
    expect(passedFiles[2].name).toBe('third.mkd');
  });

  it('ignores drag events and does not trigger onFilesDropped when disabled', () => {
    const handleFilesDropped = vi.fn();
    render(
      <DropZone onFilesDropped={handleFilesDropped} disabled={true}>
        <div>App Shell</div>
      </DropZone>
    );

    const dropzone = screen.getByTestId('app-dropzone');

    fireEvent.dragEnter(dropzone);
    expect(screen.queryByTestId('dropzone-overlay')).toBeNull();

    const file = new File(['# File'], 'test.md', { type: 'text/markdown' });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(handleFilesDropped).not.toHaveBeenCalled();
    expect(dropzone).toHaveAttribute('aria-dropeffect', 'none');
  });
});
