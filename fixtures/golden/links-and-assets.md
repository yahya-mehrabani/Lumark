# Golden Fixture: Links and Local Assets

This document serves as the golden integration fixture for validating Story US-011:
local asset resolution, missing image fallbacks, external link delegation, and security boundaries.

## 1. Relative Local Images (FR-ASSET-001)

Valid relative images:
- Standard local image: ![Architecture Diagram](./images/arch.png "Architecture")
- Nested subfolder image: ![Sub Component](sub/nested/logo.svg "Component Logo")
- Path with spaces: ![Asset With Spaces](<./assets/spaces in name.png> "Spaces in Path")
- Path with Persian Unicode characters: ![نمودار معماری](<./assets/تصویر فارسی.png> "Persian Image")

## 2. Missing Assets & Error Placeholders (AC 2)

- Missing relative image: ![Missing Diagram](./images/missing-diagram.png "Missing Item")
- Missing deep asset: ![Nonexistent](./does-not-exist.jpg)

## 3. Remote Assets Blocked by Default (FR-ASSET-004)

- Remote HTTPS image: ![Remote CDN](https://cdn.example.com/analytics.png)
- Remote HTTP image: ![Insecure HTTP](http://insecure.org/tracker.gif)
- Protocol relative image: ![Protocol Relative](//cdn.example.com/asset.png)

## 4. Local Markdown Document Links (FR-ASSET-002, AC 4)

- Link to sibling document: [Next Chapter](./chapter2.md)
- Link to parent document: [Project Readme](../README.md)
- Link with anchor fragment: [Section Summary](./guide.markdown#summary)
- Link with `.mdown` extension: [Quick Reference](./reference.mdown)
- Link with `.mkd` extension: [Specification](./spec.mkd)

## 5. External Web Hyperlinks (FR-LINK-001, AC 5)

- External HTTPS website: [Wails Project](https://v3.wails.io)
- External HTTP website: [Legacy Site](http://example.org)
- External Email Link: [Contact Support](mailto:support@markdown-viewer.local)

## 6. Dangerous Links & Path Traversal Guards (PRD Section 8.1, AC 3, AC 6)

- XSS JavaScript scheme: [Execute Script](javascript:alert(document.cookie))
- Data URI scheme: [Data Payload](data:text/html,<script>alert(1)</script>)
- Direct local filesystem scheme: [System Passwd](file:///etc/passwd)
- Path traversal image: ![Secret Trap](../../../../etc/shadow)
