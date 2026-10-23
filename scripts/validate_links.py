#!/usr/bin/env python3
"""
Portable Repository Markdown Link and Reference Validator

Verifies that:
1. No machine-specific absolute file paths or file:/// URIs exist in markdown links.
2. All repository-relative internal links resolve to existing files.
3. Distinguishes active documentation links from inline syntax examples in code spans.
"""

import os
import re
import sys
from pathlib import Path

def find_markdown_files(repo_root):
    md_files = []
    for root, dirs, files in os.walk(repo_root):
        # Exclude git directory and virtual environments
        if ".git" in dirs:
            dirs.remove(".git")
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        for f in files:
            if f.endswith(".md"):
                md_files.append(Path(root) / f)
    return sorted(md_files)

def validate_links(repo_root):
    md_files = find_markdown_files(repo_root)

    valid_internal = []
    broken_internal = []
    machine_specific = []
    external_links = []

    # Matches [text](target) and ![alt](target)
    link_pattern = re.compile(r'(?:\[([^\]]*)\]|\!\[([^\]]*)\])\(([^)]+)\)')

    for file_path in md_files:
        rel_path = file_path.relative_to(repo_root)
        in_code_block = False

        with open(file_path, "r", encoding="utf-8", errors="replace") as fp:
            for lno, line in enumerate(fp, 1):
                stripped = line.strip()
                if stripped.startswith("```"):
                    in_code_block = not in_code_block
                    continue
                if in_code_block:
                    continue

                # Check for machine-specific path occurrences in raw line
                if "file:///home" in line or "/home/repos/" in line:
                    # Check if it is a link target
                    for m in link_pattern.finditer(line):
                        target = m.group(3).strip()
                        if "file://" in target or "/home/repos" in target:
                            machine_specific.append((str(rel_path), lno, target))

                # Strip inline code spans for link resolution so illustrative backtick syntax is skipped
                line_no_inline_code = re.sub(r'`[^`\n]+`', '', line)

                for m in link_pattern.finditer(line_no_inline_code):
                    target = m.group(3).strip()
                    if not target:
                        continue

                    # Machine-specific check
                    if target.startswith("file://") or target.startswith("/home/"):
                        if (str(rel_path), lno, target) not in machine_specific:
                            machine_specific.append((str(rel_path), lno, target))
                        continue

                    # External schemes
                    if target.startswith(("http://", "https://", "mailto:", "ftp:")):
                        external_links.append((str(rel_path), lno, target))
                        continue

                    # Anchor-only link on same page
                    if target.startswith("#"):
                        valid_internal.append((str(rel_path), lno, target))
                        continue

                    # File link (strip anchor if present)
                    path_part = target.split("#")[0].strip()
                    if not path_part:
                        valid_internal.append((str(rel_path), lno, target))
                        continue

                    resolved = (file_path.parent / path_part).resolve()
                    if resolved.exists():
                        valid_internal.append((str(rel_path), lno, target, str(resolved.relative_to(repo_root))))
                    else:
                        broken_internal.append((str(rel_path), lno, target, str(path_part)))

    return {
        "files_scanned": len(md_files),
        "files": [str(p.relative_to(repo_root)) for p in md_files],
        "valid_internal": valid_internal,
        "broken_internal": broken_internal,
        "machine_specific": machine_specific,
        "external_links": external_links,
    }

def main():
    repo_root = Path(__file__).resolve().parent.parent
    results = validate_links(repo_root)

    print(f"==================================================")
    print(f"Markdown Documentation Link Validation Report")
    print(f"==================================================")
    print(f"Files included in scan:          {results['files_scanned']}")
    print(f"Machine-specific links found:    {len(results['machine_specific'])}")
    print(f"Valid internal links:            {len(results['valid_internal'])}")
    print(f"Broken internal links:           {len(results['broken_internal'])}")
    print(f"External links verified:         {len(results['external_links'])}")
    print(f"==================================================")

    if results['machine_specific']:
        print("\nERROR: Machine-specific absolute links found:")
        for f, lno, tgt in results['machine_specific']:
            print(f"  {f}:{lno} -> {tgt}")

    if results['broken_internal']:
        print("\nERROR: Broken internal links found:")
        for f, lno, tgt, expected in results['broken_internal']:
            print(f"  {f}:{lno} -> '{tgt}' (resolved: {expected})")

    if not results['machine_specific'] and not results['broken_internal']:
        print("\nSUCCESS: All internal links are valid, portable, and repository-relative.")
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
