# Adversarial Security Fixture: Event Handlers & Inline Execution

This fixture tests inline event handlers across HTML attributes, obfuscated casings, and SVG attributes per PRD Section 8.1 and Section 8.3.

## 1. Image Event Handlers

<img src="https://example.invalid/nonexistent.png" onerror="window.__img_onerror_fired = true; window.__malicious_executed = true;" alt="Failed image attack" />

<img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'><circle r='1'/></svg>" onload="window.__img_onload_fired = true; window.__malicious_executed = true;" alt="SVG image onload attack" />

## 2. Interactive Mouse and Keyboard Handlers

<a href="#test" onmouseover="window.__onmouseover_fired = true; window.__malicious_executed = true;">Hover Link Attack</a>

<button onclick="window.__onclick_fired = true; window.__malicious_executed = true;">Click Button Attack</button>

<span onmouseenter="window.__malicious_executed = true;" onmouseleave="window.__malicious_executed = true;">Hover Span</span>

<div oncontextmenu="window.__malicious_executed = true;">Right Click Attack</div>

## 3. Focus and Form Handlers

<input type="text" autofocus onfocus="window.__onfocus_fired = true; window.__malicious_executed = true;" onblur="window.__malicious_executed = true;" value="Injected Input" />

<select onchange="window.__malicious_executed = true;">
  <option>Option 1</option>
</select>

## 4. Obfuscated and Mixed-Case Attribute Variations

<img src="invalid.gif" ONERROR="window.__malicious_executed = true;" alt="Uppercase ONERROR" />

<p OnMouseOver="window.__malicious_executed = true;">Mixed-case OnMouseOver</p>

<span style="color: blue;" onclick="window.__malicious_executed = true;">Styled element with onclick</span>

## 5. Body and Window Level Handlers on Elements

<body onload="window.__malicious_executed = true;" onunload="window.__malicious_executed = true;">

<svg onload="window.__svg_onload_fired = true; window.__malicious_executed = true;" width="50" height="50">
  <rect width="50" height="50" fill="red" />
</svg>

## 6. Safe Text Verification

<p>This paragraph contains safe prose and <em>emphasized text</em> that must survive sanitization intact.</p>
