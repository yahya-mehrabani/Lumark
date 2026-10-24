# Adversarial Security Fixture: Mermaid Script Injection & Directive Attacks

This fixture tests Mermaid diagram definition attacks, interactive callbacks, dangerous click URLs, and SVG payload smuggling per PRD Section 8.1, Section 8.3, and FR-RENDER-005.

## 1. Malicious Mermaid Diagram (Click Callbacks, JavaScript URIs, and Data URIs)

```mermaid
flowchart TD
    NodeA[Target Node A] --> NodeB[Target Node B]
    NodeB --> NodeC[Target Node C]
    click NodeA "javascript:window.__malicious_executed=true;" "Click for JS Exploit"
    click NodeB call exploitCallback() "Click for Callback Exploit"
    click NodeC "data:text/html,<script>window.__malicious_executed=true;</script>" "Data URI Exploit"
```

## 2. Safe Baseline Diagram (Must Render Cleanly)

```mermaid
flowchart TD
    Start([Application Initialized]) --> CheckAuth{Authorized?}
    CheckAuth -->|Yes| RenderDoc[Render Document Content]
    CheckAuth -->|No| ShowEmpty[Display Empty State]
```
