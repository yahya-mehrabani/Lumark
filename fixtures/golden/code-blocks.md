# Golden Code Blocks & Syntax Highlighting Fixture

This golden fixture validates PRD Section 5.4, FR-RENDER-003 (Code highlighting), and FR-RENDER-004 (Copy code).

## 1. Supported Language: Go

```go
package main

import (
	"fmt"
	"strings"
)

// Greeter structure representing an entity
type Greeter struct {
	Greeting string
}

func main() {
	g := Greeter{Greeting: "سلام دنیا (Hello World 🌍)"}
	fmt.Println(strings.ToUpper(g.Greeting))
}
```

## 2. Supported Language: TypeScript

```typescript
export interface DocumentSession {
  readonly id: string;
  filename: string;
  isDirty: boolean;
  wordCount: number;
}

export function formatSession(doc: DocumentSession): string {
  const status = doc.isDirty ? '● Unsaved' : 'Saved';
  return `[${doc.id}] ${doc.filename} - ${status} (${doc.wordCount} words)`;
}
```

## 3. Supported Language: Python with Unicode & Comments

```python
import sys

def compute_metrics(text: str) -> dict:
    # تابع پردازش متن و کلمات (Persian RTL comment)
    tokens = text.strip().split()
    return {
        "count": len(tokens),
        "status": "موفق",
        "emoji": "✨"
    }

if __name__ == "__main__":
    print(compute_metrics("آزمایش Antigravity"))
```

## 4. Unknown Language Fallback

```customunknownlanguage
DEFINE ENTITY Customer {
    PRIMARY_KEY id: UUID
    FIELD name: STRING(100)
    CONSTRAINT check_positive_balance CHECK(balance >= 0)
}
```

## 5. Plain Code Block Without Language Identifier

```
Plain log lines without syntax highlight identifier:
2026-10-24 14:00:00 [INFO] Markdown viewer started
2026-10-24 14:00:01 [DEBUG] Initialized Shiki offline grammars
```

## 6. Long Lines Testing Horizontal Scrolling

```bash
curl -X POST "https://api.internal.local/v1/projects/markdown-viewer/deployments?env=production&region=us-east-1&validate=true&notify=team-leads" -H "Authorization: Bearer mock_token_for_length_testing_without_line_wrap_demonstrating_horizontal_scrolling" -H "Content-Type: application/json" -d '{"version":"1.0.0","commit":"85e3726","artifacts":["app-linux-amd64","app-windows-x64.exe"]}'
```
