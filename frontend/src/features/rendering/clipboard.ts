import { Clipboard } from '@wailsio/runtime';

/**
 * Copies raw source text to system clipboard.
 * Preserves exact tabs, spaces, newlines, and Unicode characters without highlighter markup.
 *
 * Fallback chain:
 * 1. navigator.clipboard.writeText (Standard Web API)
 * 2. Wails v3 Clipboard.SetText (Native desktop runtime)
 * 3. document.execCommand('copy') with hidden textarea (Headless / fallback)
 */
export async function copyToClipboard(rawText: string): Promise<void> {
  // 1. Try standard web clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(rawText);
      return;
    } catch {
      // If web clipboard threw (e.g. permissions denied), try next fallback
    }
  }

  // 2. Try native Wails v3 Clipboard API
  if (typeof Clipboard !== 'undefined' && typeof Clipboard.SetText === 'function') {
    try {
      await Clipboard.SetText(rawText);
      return;
    } catch {
      // Continue to execCommand fallback
    }
  }

  // 3. Fallback to hidden textarea with execCommand
  if (typeof document !== 'undefined' && typeof document.execCommand === 'function') {
    const textArea = document.createElement('textarea');
    textArea.value = rawText;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    try {
      textArea.select();
      const success = document.execCommand('copy');
      if (!success) {
        throw new Error('Clipboard copy command was not successful');
      }
      return;
    } finally {
      if (textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    }
  }

  throw new Error('No supported clipboard mechanism found in current environment');
}
