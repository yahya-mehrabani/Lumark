import { useState, useEffect, useRef } from 'react';
import { Events, WML } from "@wailsio/runtime";
import { GreetService, SpikeDocumentService } from "../bindings/markdown-viewer";
import { MarkdownViewer, DocumentInfo } from './MarkdownViewer';

// Show the actual Wails version this project was generated against.
const wailsVersion = "v3.0.0-beta.34";

function App() {
  const [doc, setDoc] = useState<DocumentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'viewer' | 'diagnostics'>('viewer');
  const [name, setName] = useState<string>('');
  const [time, setTime] = useState<string>('Listening for Time event...');
  const [loadStatus, setLoadStatus] = useState<string>('Initializing viewer...');

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

  const doGreet = () => {
    const n = name || 'anonymous';
    GreetService.Greet(n).then(showToast).catch(console.error);
  };

  const loadDocumentPath = (path: string) => {
    setLoadStatus(`Loading ${path}...`);
    SpikeDocumentService.LoadFile(path)
      .then((d) => {
        setDoc({
          filePath: d.filePath,
          filename: d.filename,
          dir: d.dir,
          content: d.content,
        });
        setLoadStatus(`Loaded ${d.filename}`);
        setActiveTab('viewer');
      })
      .catch((err) => {
        console.error('Failed to load document:', err);
        setLoadStatus(`Error loading document: ${err}`);
      });
  };

  useEffect(() => {
    // 1. Initial check for document loaded via CLI argument in Go backend
    SpikeDocumentService.GetCurrentDocument()
      .then((current) => {
        if (current && current.content) {
          setDoc({
            filePath: current.filePath,
            filename: current.filename,
            dir: current.dir,
            content: current.content,
          });
          setLoadStatus(`Loaded ${current.filename}`);
        } else {
          // Default to the cross-feature monolithic spike fixture
          loadDocumentPath('fixtures/spike/monolithic-fixture.md');
        }
      })
      .catch((err) => {
        console.warn('GetCurrentDocument failed, falling back to fixture:', err);
        loadDocumentPath('fixtures/spike/monolithic-fixture.md');
      });

    // 2. Listen for document open events from secondary instances
    Events.On('document:open', (eventData: any) => {
      const data = eventData.data;
      if (data) {
        setDoc({
          filePath: data.filePath,
          filename: data.filename,
          dir: data.dir,
          content: data.content,
        });
        showToast(`Opened: ${data.filename}`);
        setActiveTab('viewer');
      }
    });

    Events.On('file:open', (pathData: any) => {
      const p = pathData.data;
      if (typeof p === 'string' && p.trim()) {
        loadDocumentPath(p);
      }
    });

    // 3. Listen for time event
    Events.On('time', (timeValue: any) => {
      const full = timeValue.data;
      const compact = (full.match(/\d{1,2}:\d{2}:\d{2}/) || [full])[0];
      setTime(window.matchMedia('(max-width: 640px)').matches ? compact : full);
    });

    WML.Reload();
  }, []);

  return (
    <div className="viewer-app-container">
      {/* Top Navigation Bar */}
      <nav className="top-nav-bar">
        <div className="nav-brand">
          <img src="/wails.png" className="nav-logo" alt="Wails Logo" />
          <span className="nav-title">Markdown Viewer</span>
          <span className="nav-badge">Spike Baseline</span>
        </div>

        <div className="nav-actions">
          <button
            className={`nav-btn ${activeTab === 'viewer' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('viewer')}
          >
            Document View
          </button>
          <button
            className={`nav-btn ${activeTab === 'diagnostics' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('diagnostics')}
          >
            Spike Diagnostics
          </button>
          <button
            className="nav-btn"
            onClick={() => loadDocumentPath('fixtures/spike/monolithic-fixture.md')}
          >
            Reload Fixture
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      {activeTab === 'viewer' && doc ? (
        <MarkdownViewer document={doc} />
      ) : activeTab === 'diagnostics' ? (
        <main className="container">
          <header className="brand">
            <a className="brand-mark" data-wml-openURL="https://v3.wails.io" aria-label="Wails website">
              <img src="/wails.png" className="brand-logo" alt="Wails logo" />
            </a>
            <a className="brand-badge" data-wml-openURL="https://reactjs.org" aria-label="React">
              <img src="/react.svg" alt="React logo" />
            </a>
          </header>

          <h1 className="title">
            <span className="title-accent">Wails +</span> <span className="title-name"><span className="title-name-text">React</span></span>
          </h1>
          <p className="subtitle">Spike Baseline Loaded</p>

          <div className="greet">
            <div className="input-box">
              <svg className="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                aria-label="input"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="Your name"
                autoComplete="off"
              />
              <button aria-label="greet-btn" className="btn" onClick={doGreet}>
                Greet
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      ) : (
        <div className="markdown-viewport">
          <p className="doc-paragraph is-ltr">{loadStatus}</p>
        </div>
      )}

      {/* Footer */}
      <hr className="footer-divider" />
      <footer className="footer">
        <span className="footer-version"><span>{wailsVersion}</span></span>
        <span className="footer-time">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{time}</span>
        </span>
        <a className="footer-docs" data-wml-openURL="https://v3.wails.io" aria-label="Wails documentation">
          Docs
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="7" y1="17" x2="17" y2="7" />
            <polyline points="7 7 17 7 17 17" />
          </svg>
        </a>
      </footer>

      {/* Toast Notification */}
      <div className="toast" ref={toastRef} role="status" aria-live="polite">
        <span className="toast-label">From Go</span>
        <span aria-label="result" className="toast-msg" ref={resultRef}></span>
      </div>
    </div>
  );
}

export default App;
