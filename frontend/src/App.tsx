import { useState, useEffect, useRef } from 'react';
import { Events, WML } from "@wailsio/runtime";
import { SpikeDocumentService } from "../bindings/markdown-viewer";
import * as DialogService from "../bindings/markdown-viewer/internal/dialogs/service";
import { MarkdownViewer } from './MarkdownViewer';
import { AppShell } from './features/shell/AppShell';
import { loadDroppedFiles } from './features/shell/batchLoader';
import { tabStore } from './features/tabs/tabStore';

import { triggerPrint } from './features/viewport/printController';
import { SettingsModal, settingsStore } from './features/preferences';

export function App() {
  const [, setTime] = useState<string>('Listening for Time event...');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const toastRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLSpanElement | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = (message: string) => {
    if (resultRef.current) {
      resultRef.current.innerText = message;
    }
    if (toastRef.current) {
      toastRef.current.classList.add('is-visible');
    }
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      if (toastRef.current) {
        toastRef.current.classList.remove('is-visible');
      }
    }, 4000);
  };

  const loadDocumentPath = (path: string) => {
    SpikeDocumentService.LoadFile(path)
      .then((d) => {
        tabStore.openTab({
          filePath: d.filePath,
          filename: d.filename,
          parentDir: d.dir,
          content: d.content,
          status: 'ready',
        });
        showToast(`Loaded ${d.filename}`);
      })
      .catch((err) => {
        console.error('Failed to load document:', err);
        const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
        const filename = parts.length > 0 ? parts[parts.length - 1] : 'document.md';
        tabStore.openTab({
          filePath: path,
          filename,
          content: '',
          status: 'error',
          errorMessage: String(err),
        });
        showToast(`Error: ${err}`);
      });
  };

  const handlePrint = () => {
    triggerPrint({
      onError: (err) => showToast(`Print error: ${err.message}`),
    });
  };

  useEffect(() => {
    // 0. Load persisted user preferences
    settingsStore.load().catch((err) => {
      console.warn('Failed to load persisted settings on startup:', err);
    });

    // 1. Initial check for document loaded via CLI argument in Go backend
    SpikeDocumentService.GetCurrentDocument()
      .then((current) => {
        if (current && current.content) {
          tabStore.openTab({
            filePath: current.filePath,
            filename: current.filename,
            parentDir: current.dir,
            content: current.content,
            status: 'ready',
          });
        }
      })
      .catch((err) => {
        console.warn('GetCurrentDocument returned empty or failed:', err);
      });

    // 2. Listen for document open events from secondary instances
    Events.On('document:open', (eventData: any) => {
      const data = eventData?.data;
      if (data) {
        tabStore.openTab({
          filePath: data.filePath,
          filename: data.filename,
          parentDir: data.dir,
          content: data.content,
          status: 'ready',
        });
        showToast(`Opened: ${data.filename}`);
      }
    });

    Events.On('file:open', (pathData: any) => {
      const p = pathData?.data;
      if (typeof p === 'string' && p.trim()) {
        loadDocumentPath(p);
      }
    });

    // 3. Listen for time event
    Events.On('time', (timeValue: any) => {
      const full = timeValue?.data || '';
      const compact = (full.match(/\d{1,2}:\d{2}:\d{2}/) || [full])[0];
      setTime(window.matchMedia('(max-width: 640px)').matches ? compact : full);
    });

    WML.Reload();
  }, []);

  const handleOpenFile = async () => {
    try {
      const paths = await DialogService.OpenFiles();
      if (paths && paths.length > 0) {
        for (const p of paths) {
          if (p && p.trim()) {
            loadDocumentPath(p);
          }
        }
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
      showToast(`Dialog error: ${err}`);
    }
  };

  const handleFileDrop = async (files: File[]) => {
    await loadDroppedFiles(files, {
      store: tabStore,
      notifyWarning: (msg) => showToast(msg),
      notifySuccess: (msg) => showToast(msg),
    });
  };

  return (
    <>
      <AppShell
        store={tabStore}
        onOpenFile={handleOpenFile}
        onPrint={handlePrint}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onFileDrop={handleFileDrop}
        renderDocument={(tab) => (
          <div className="markdown-viewport">
            <MarkdownViewer
              document={{
                filePath: tab.filePath,
                filename: tab.filename,
                dir: tab.parentDir,
                content: tab.content,
              }}
              onOpenDocument={(targetPath) => loadDocumentPath(targetPath)}
              onPrint={handlePrint}
            />
          </div>
        )}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Toast Notification */}
      <div className="toast" ref={toastRef} role="status" aria-live="polite">
        <span className="toast-label">From Go</span>
        <span aria-label="result" className="toast-msg" ref={resultRef}></span>
      </div>
    </>
  );
}

export default App;
