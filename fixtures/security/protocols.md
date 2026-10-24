# Adversarial Security Fixture: Protocol Smuggling & Link Schemes

This fixture tests dangerous URL schemes, obfuscated script protocols, and links per PRD Section 8.1, Section 8.2, and Section 8.3.

## 1. Direct JavaScript Scheme Links

[Click for JavaScript Payload](javascript:window.__malicious_executed=true;alert(1))

[JavaScript Void Link](javascript:void(0))

## 2. Mixed-Case and Obfuscated JavaScript Schemes

[Mixed Case Scheme](JavaScriPt:window.__malicious_executed=true;)

[Whitespace Obfuscated Scheme](javascript :window.__malicious_executed=true;)

[Control Character Scheme](jav&#x09;ascript:window.__malicious_executed=true;)

## 3. Data URL and VBScript Schemes

[Data HTML Script Payload](data:text/html,<script>window.__malicious_executed=true;</script>)

[Data HTML Base64 Payload](data:text/html;base64,PHNjcmlwdD53aW5kb3cuX19tYWxpY2lvdXNfZXhlY3V0ZWQgPSB0cnVlOzwvc2NyaXB0Pg==)

[VBScript Scheme](vbscript:msgbox("attack"))

## 4. Dangerous System and File Protocols

[Arbitrary File URL](file:///etc/passwd)

[Windows Shell Protocol](shell:calc.exe)

[MS Diagnostic Tool Protocol](ms-msdt:/id%20PCWDiagnostic)

## 5. Legitimate Safe Protocols (Must be permitted or routed safely)

[Safe HTTPS Link](https://example.com/safe-page)

[Safe HTTP Link](http://example.com/blog)

[Safe Mailto Link](mailto:contact@example.com)

[Safe In-Document Anchor](#safe-section)

[Safe Relative Document Link](./other-document.md)

<h3 id="safe-section">Safe Target Section</h3>
<p>Target for safe anchor link.</p>
