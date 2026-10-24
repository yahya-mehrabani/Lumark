# Adversarial Security Fixture: Mermaid Script Injection & Directive Attacks

This fixture tests Mermaid diagram definition attacks, interactive callbacks, dangerous click URLs, and SVG payload smuggling per PRD Section 8.1, Section 8.3, and FR-RENDER-005.

## 1. Mermaid Click Directive with JavaScript Callback

```mermaid
graph TD
    A[Start Node] --> B[Exploit Node]
    click B callback "window.__malicious_executed = true;" "Click to trigger callback"
```

## 2. Mermaid Click Directive with JavaScript URI

```mermaid
graph LR
    User[User Step] --> Action[Dangerous Action]
    click Action "javascript:window.__malicious_executed=true;" "Click for exploit"
```

## 3. Mermaid Click Directive with Data HTML URI

```mermaid
flowchart TD
    NodeA --> NodeB
    click NodeB "data:text/html,<script>window.__malicious_executed=true;</script>" "Data URI"
```

## 4. Mermaid HTML Labels with Script Tag Injection

```mermaid
graph TD
    A["<script>window.__malicious_executed = true;</script>Injected Script"] --> B["<img src=x onerror=window.__malicious_executed=true;>Injected Onerror"]
```

## 5. Safe Mermaid Diagram (Must Render Cleanly)

```mermaid
graph TD
    Start([Application Initialized]) --> CheckAuth{Authorized?}
    CheckAuth -->|Yes| RenderDoc[Render Document Content]
    CheckAuth -->|No| ShowEmpty[Display Empty State]
```
