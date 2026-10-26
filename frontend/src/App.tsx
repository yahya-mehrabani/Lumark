import { useState, useEffect, useRef } from 'react';
import { Events, WML, Window } from "@wailsio/runtime";
import { SpikeDocumentService } from "../bindings/markdown-viewer";
import * as DialogService from "../bindings/markdown-viewer/internal/dialogs/service";
import { MarkdownViewer } from './MarkdownViewer';
import { AppShell } from './features/shell/AppShell';
import { loadDroppedFiles } from './features/shell/batchLoader';
import { tabStore } from './features/tabs/tabStore';

import { triggerPrint } from './features/viewport/printController';
import { SettingsModal, settingsStore } from './features/preferences';
import { recentsStore, useRecentFiles } from './features/recents';
import { restoreTabsOnStartup, saveOpenTabsToSettings, handleFileChanged, syncTabWatches, WailsWatcherAdapter } from './features/tabs';
import { ErrorBoundary } from './features/errors';
import { ToastContainer, defaultToastStore } from './features/notifications';

export function App() {
  const [, setTime] = useState<string>('Listening for Time event...');
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const { recentFiles, addRecentFile, removeRecentFile, clearRecentFiles } = useRecentFiles(recentsStore);

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
    }, 3500);
    defaultToastStore.showInfo(message);
  };

  const loadDocumentPath = (path: string, silent = false) => {
    SpikeDocumentService.LoadFile(path)
      .then((d) => {
        tabStore.openTab({
          filePath: d.filePath,
          filename: d.filename,
          parentDir: d.dir,
          content: d.content,
          status: 'ready',
        });
        addRecentFile(d.filePath);
        if (!silent) {
          defaultToastStore.showSuccess(`Loaded ${d.filename}`);
        }
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
        defaultToastStore.showError(err, () => handleOpenFile());
      });
  };

  const handlePrint = () => {
    triggerPrint({
      onError: (err) => defaultToastStore.showError(err),
    });
  };

  useEffect(() => {
    // 0. Load persisted user preferences and recent files
    recentsStore.load().catch((err) => {
      console.warn('Failed to load recent files on startup:', err);
    });

    settingsStore.load().then(async () => {
      // Restore previously open tabs if configured
      await restoreTabsOnStartup({
        tabStore,
        settingsStore,
        docLoader: async (p) => {
          const doc = await SpikeDocumentService.LoadFile(p);
          return {
            filePath: doc.filePath,
            filename: doc.filename,
            dir: doc.dir,
            content: doc.content,
          };
        },
      });
    }).catch((err) => {
      console.warn('Failed to load persisted settings on startup:', err);
    });

    // Automatically persist open tab paths whenever tabs change
    let saveTabsTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeTabs = tabStore.subscribe(() => {
      clearTimeout(saveTabsTimer);
      saveTabsTimer = setTimeout(() => {
        saveOpenTabsToSettings(tabStore, settingsStore).catch((err) => {
          console.warn('Failed to save open tabs to settings:', err);
        });
      }, 200);
    });

    // Automatically synchronize OS file watches with currently open tabs
    const watcherAdapter = new WailsWatcherAdapter();
    let watchedPaths = new Set<string>();
    const unsubscribeWatcher = tabStore.subscribe(() => {
      watchedPaths = syncTabWatches(tabStore, watcherAdapter, watchedPaths);
    });

    // Synchronize window and document title with active tab file name
    const syncWindowTitle = () => {
      const activeTab = tabStore.getActiveTab();
      const title = activeTab
        ? `${activeTab.filename || activeTab.displayTitle} — Markdown Viewer`
        : 'Markdown Viewer';

      if (typeof document !== 'undefined' && document.title !== title) {
        document.title = title;
      }
      try {
        Window?.SetTitle?.(title)?.catch(() => {});
      } catch {
        // Ignore outside desktop runtime
      }
    };

    syncWindowTitle();
    const unsubscribeTitle = tabStore.subscribe(syncWindowTitle);

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

    // 3. Listen for debounced external file modifications / deletions
    Events.On('file:changed', (eventData: any) => {
      const data = eventData?.data;
      if (data && typeof data.path === 'string') {
        handleFileChanged(
          {
            path: data.path,
            type: data.type || 'modified',
          },
          {
            tabStore,
            loadDocument: async (filePath) => {
              const doc = await SpikeDocumentService.LoadFile(filePath);
              return {
                content: doc.content,
                filename: doc.filename,
                dir: doc.dir,
              };
            },
            onReloadSuccess: (_id, filename) => {
              showToast(`Reloaded ${filename} (disk change)`);
            },
            onFileMissing: (_id, filename) => {
              showToast(`File missing: ${filename}`);
            },
          }
        );
      }
    });

    // 4. Listen for time event
    Events.On('time', (timeValue: any) => {
      const full = timeValue?.data || '';
      const compact = (full.match(/\d{1,2}:\d{2}:\d{2}/) || [full])[0];
      setTime(window.matchMedia('(max-width: 640px)').matches ? compact : full);
    });

    WML.Reload();

    return () => {
      clearTimeout(saveTabsTimer);
      unsubscribeTabs();
      unsubscribeWatcher();
      unsubscribeTitle();
    };
  }, []);

  const handleOpenFile = async () => {
    try {
      const paths = await DialogService.OpenFiles();
      if (paths && paths.length > 0) {
        const validPaths = paths.filter((p) => p && p.trim());
        if (validPaths.length === 1) {
          loadDocumentPath(validPaths[0]);
        } else if (validPaths.length > 1) {
          for (const p of validPaths) {
            loadDocumentPath(p, true);
          }
          defaultToastStore.showSuccess(`Loaded ${validPaths.length} documents`);
        }
      }
    } catch (err) {
      console.error('Failed to open file dialog:', err);
      defaultToastStore.showError(err);
    }
  };

  const handleFileDrop = async (files: File[]) => {
    await loadDroppedFiles(files, {
      store: tabStore,
      notifyWarning: (msg) => defaultToastStore.showWarning(msg),
      notifySuccess: (msg) => defaultToastStore.showSuccess(msg),
    });
  };

  return (
    <ErrorBoundary>
      <AppShell
        store={tabStore}
        onOpenFile={handleOpenFile}
        onPrint={handlePrint}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onFileDrop={handleFileDrop}
        onSelectRecentFile={(filePath) => loadDocumentPath(filePath)}
        onRemoveRecentFile={removeRecentFile}
        onClearRecentFiles={clearRecentFiles}
        recentFiles={recentFiles}
        renderDocument={(tab) => (
          <div className="markdown-viewport">
            {tab.status === 'missing' && (
              <div
                className="document-error-notice"
                role="alert"
                data-testid="missing-file-banner"
                style={{
                  margin: '16px 24px 0 24px',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fca5a5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>
                  <strong>File missing on disk:</strong> {tab.errorMessage || 'This file has been deleted or moved.'}
                </span>
              </div>
            )}
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

      {/* Accessible Toast Notification System */}
      <ToastContainer store={defaultToastStore} />

      {/* Legacy Go Status Overlay */}
      <div className="toast" ref={toastRef} role="status" aria-live="polite">
        <span className="toast-label">From Go</span>
        <span aria-label="result" className="toast-msg" ref={resultRef}></span>
      </div>
    </ErrorBoundary>
  );
}

export default App;
