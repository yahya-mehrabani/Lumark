import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CodeBlock } from './components/CodeBlock';
import { copyToClipboard } from './clipboard';

describe('Clipboard Copy Action and Feedback (US-010.3)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('copies exact raw code preserving tabs, spaces, newlines, and Unicode to clipboard', async () => {
    const rawGoCode =
      'package main\n\n// Persian comment: سلام دنیا (Unicode)\nfunc main() {\n\t// \t Tab indented\n\tfmt.Println("🚀 Antigravity")\n}\n';

    let writtenText = '';
    const mockWriteText = vi.fn().mockImplementation(async (text: string) => {
      writtenText = text;
      return Promise.resolve();
    });

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    const onCopySuccess = vi.fn();

    render(
      <CodeBlock
        rawCode={rawGoCode}
        language="go"
        onCopySuccess={onCopySuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('shiki-wrapper')).toBeInTheDocument();
    });

    const copyBtn = screen.getByTestId('copy-code-button');
    expect(copyBtn).toHaveTextContent('Copy');

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledTimes(1);
      expect(writtenText).toBe(rawGoCode);
      expect(onCopySuccess).toHaveBeenCalledWith(rawGoCode);
      expect(copyBtn).toHaveTextContent('Copied!');
      expect(copyBtn).toHaveClass('copied');
      expect(copyBtn).toHaveAttribute('aria-label', 'Copied to clipboard');
    });

    // Verify tabs, spaces, newlines, and Unicode are strictly preserved
    expect(writtenText).toContain('\t// \t Tab indented');
    expect(writtenText).toContain('سلام دنیا (Unicode)');
    expect(writtenText).toContain('🚀 Antigravity');
    expect(writtenText.endsWith('\n')).toBe(true);
  });

  it('automatically dismisses "Copied!" feedback and reverts to "Copy" after 2 seconds', async () => {
    vi.useFakeTimers();

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<CodeBlock rawCode="const a = 1;" language="typescript" />);

    const copyBtn = screen.getByTestId('copy-code-button');
    expect(copyBtn).toHaveTextContent('Copy');

    // Trigger copy
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(copyBtn).toHaveTextContent('Copied!');
    expect(copyBtn).toHaveClass('copied');

    // Advance time by 1999ms - should still be "Copied!"
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(copyBtn).toHaveTextContent('Copied!');

    // Advance time by another 1ms to reach 2000ms - reverts to "Copy"
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(copyBtn).toHaveTextContent('Copy');
    expect(copyBtn).not.toHaveClass('copied');
  });

  it('handles clipboard errors gracefully and shows "Failed" state', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    // Also fail execCommand
    const originalExecCommand = document.execCommand;
    document.execCommand = vi.fn().mockReturnValue(false);

    const onCopyError = vi.fn();

    render(
      <CodeBlock
        rawCode="test code"
        language="bash"
        onCopyError={onCopyError}
      />
    );

    const copyBtn = screen.getByTestId('copy-code-button');

    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(copyBtn).toHaveTextContent('Failed');
      expect(copyBtn).toHaveClass('error');
      expect(copyBtn).toHaveAttribute('aria-label', 'Failed to copy code');
      expect(onCopyError).toHaveBeenCalled();
    });

    document.execCommand = originalExecCommand;
  });

  it('copyToClipboard utility directly preserves exact raw string without modification', async () => {
    const rawUnicodeSnippet = 'const x = "مرحبا بالعالم 🌟";\n\t\treturn x;\n';
    let copiedResult = '';

    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockImplementation(async (text: string) => {
          copiedResult = text;
        }),
      },
      writable: true,
      configurable: true,
    });

    await copyToClipboard(rawUnicodeSnippet);

    expect(copiedResult).toBe(rawUnicodeSnippet);
    expect(copiedResult).toContain('\t\t');
    expect(copiedResult).toContain('مرحبا بالعالم 🌟');
  });

  it('copyToClipboard falls back to execCommand if navigator.clipboard throws', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
      writable: true,
      configurable: true,
    });

    const originalExecCommand = document.execCommand;
    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    await expect(copyToClipboard('fallback-text')).resolves.not.toThrow();
    expect(mockExecCommand).toHaveBeenCalledWith('copy');

    document.execCommand = originalExecCommand;
  });
});
