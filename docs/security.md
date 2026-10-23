# Security and Privacy Specification

**Document Status:** Canonical Security Baseline<br>
**Authority:** Derived from [PRD.md](../PRD.md) Section 8 (Security and Privacy Requirements)<br>
**Canonical Path:** `docs/security.md`<br>
**Related Decisions:** [`ADR-0003: HTML & CSS Sanitization Policy`](decisions/ADR-0003-sanitization-css-policy.md)<br>
**Related Epics:** `EPIC-001`, `EPIC-004`

---

## 1. Threat Model & Security Posture

The Markdown Viewer renders files obtained from untrusted local, network, or Internet sources. Every document must be treated as **potentially adversarial input**.

The primary threat scenarios include:
1. **Remote Code Execution / IPC Hijacking:** Malicious Markdown attempting to invoke native Go methods, shell commands, or operating system utilities via crafted payloads or links.
2. **Cross-Site Scripting (XSS) in Desktop Context:** Injected `<script>` tags, inline event attributes, or SVG vectors attempting to execute code within the privileged or sandboxed WebView origin.
3. **Information Disclosure & Local File Theft:** Relative links or crafted image URLs attempting path traversal (`../../etc/passwd` or `C:\Windows\System32`) to exfiltrate local files.
4. **Denial of Service & UI Hijacking:** CSS injection covering application navigation or chrome with overlays, infinite recursion via deeply nested markup, or memory exhaustion.

---

## 2. Mandatory Security Invariants (PRD §8.1)

All implementation layers must enforce these ten invariants unconditionally:

| Invariant ID | Security Rule | Enforcement Layer | Verification Reference |
|---|---|---|---|
| **SEC-INVAR-01** | Markdown and HTML never execute arbitrary scripts in the application origin. | `rehype-sanitize` AST filter | `US-015`, `US-016` (Adversarial Corpus) |
| **SEC-INVAR-02** | Documents cannot invoke Go bindings or native runtime methods directly. | Isolated WebView DOM bridge | `US-003`, `US-015` |
| **SEC-INVAR-03** | Documents cannot navigate the top-level app window to external URLs. | Controlled Link Handler | `US-011` |
| **SEC-INVAR-04** | Documents cannot run shell commands or execute arbitrary OS protocols silently. | Link protocol allowlist (`http`, `https`, `mailto`) | `US-011`, `US-016` |
| **SEC-INVAR-05** | Remote content (images, fonts, stylesheets) is not fetched automatically. | Custom local asset resolver / CSP | `US-011`, `US-015` |
| **SEC-INVAR-06** | CSS cannot escape the document container or manipulate application chrome. | Scoped CSS AST transformer (`ADR-0003`) | `US-015`, `US-016` |
| **SEC-INVAR-07** | SVG content treated as active; scripts and events stripped or rasterized safely. | DOMPurify / rehype SVG filter | `US-013`, `US-016` |
| **SEC-INVAR-08** | File paths validated as data; never concatenated into shell commands. | Go native service path validation | `US-005`, `US-006` |
| **SEC-INVAR-09** | Local file access strictly scoped to active document directory and user actions. | Go DocumentService sandbox | `US-005`, `US-011` |
| **SEC-INVAR-10** | Application logs and settings exclude document text. | Data minimization serializer | `US-025`, `US-028` |

---

## 3. WebView Security Boundary (PRD §8.2)

1. **Inert Document DOM:** Content is rendered as inert HTML elements within the React application tree inside `.markdown-content`. The WebView is never navigated directly to local file URLs (`file:///...`).
2. **External Link Delegation:** Clicking an external web link (`https://example.com`) does not open a WebView window. The event is intercepted by the frontend, validated against permitted schemes, and delegated to Go's OS browser dispatcher (`runtime.BrowserOpenURL` / OS default browser).
3. **Narrow CSP:** The WebView runtime is configured with the most restrictive Content Security Policy supported:
   ```text
   default-src 'none'; img-src 'self' data: local-asset:; style-src 'self' 'unsafe-inline'; font-src 'self' data:;
   ```

---

## 4. Adversarial Test Corpus Requirements (PRD §8.3)

The automated test suite (`US-016`) must validate that malicious payloads are neutralized:
- Script injection: `<script>`, `<script src="...">`, obfuscated event handlers (`<img src=x onerror=alert(1)>`).
- Protocol tricks: `javascript:`, `vbscript:`, `data:text/html`, whitespace-padded protocols (`java\nscript:`).
- Active SVG: `<svg><script>...</script></svg>`, `<svg onload="...">`, foreignObject tags.
- Structural exploits: `<iframe>`, `<embed>`, `<object>`, `<form>`, `<meta http-equiv="refresh">`.
- CSS escapes: `@import`, `url(javascript:...)`, `position: fixed; width: 100vw; height: 100vh;`.

---

## 5. Privacy Guarantees (PRD §8.4)

- **Zero Telemetry:** No usage metrics, crash pings, analytics, or background update pings.
- **Strictly Offline Operation:** The application functions fully without an active Internet connection.
- **Data Minimization:** No document text or file contents are persisted in application configuration (`settings.json`) or diagnostics logs.
- **Dependency Audit:** All third-party npm packages and Go modules are audited via `govulncheck` and `npm audit` for hidden network behavior or telemetry.
