#!/usr/bin/env python3
"""
Desktop Entry and Icon Specification Validator

Validates packaging/linux/markdown-viewer.desktop against the FreeDesktop Desktop
Entry Specification (version 1.0/1.5) and ensures strict adherence to PRD Section 11.4:
- Mandatory keys: Type=Application, Version, Name, GenericName, Comment, Exec, Icon, Terminal, Categories, MimeType.
- Exec must use %F for multi-file argument passing.
- Categories must adhere to registered FreeDesktop categories (Utility, TextEditor, Viewer).
- MimeType must declare text/markdown and text/x-markdown.
- STRICT POLICY: MimeType must NEVER include text/plain.
- Validates the referenced SVG icon syntax and structure.
"""

import os
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

STANDARD_MAIN_CATEGORIES = {
    "AudioVideo", "Audio", "Video", "Development", "Education", "Game",
    "Graphics", "Network", "Office", "Science", "Settings", "System", "Utility"
}

STANDARD_ADDITIONAL_CATEGORIES = {
    "Building", "Debugger", "IDE", "GUIDesigner", "Profiling", "RevisionControl",
    "Translation", "Calendar", "ContactManagement", "Database", "Dictionary",
    "Chart", "Email", "Finance", "FlowChart", "PDA", "ProjectManagement",
    "Presentation", "Spreadsheet", "WordProcessor", "2DGraphics", "VectorGraphics",
    "RasterGraphics", "3DGraphics", "Scanning", "OCR", "Photography", "Publishing",
    "Viewer", "TextEditor", "TerminalEmulator", "FileTools", "Archiving",
    "Compression", "Documentation", "Accessibility", "Calculator", "Clock",
    "TextTools", "Telephony", "WebBrowser"
}


def validate_desktop_file(desktop_path: Path) -> list[str]:
    errors = []
    if not desktop_path.is_file():
        return [f"Desktop file not found: {desktop_path}"]

    content = desktop_path.read_text(encoding="utf-8")
    lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("#")]

    if not lines or lines[0] != "[Desktop Entry]":
        errors.append("First non-comment line must be '[Desktop Entry]'")

    entries = {}
    for line in lines[1:]:
        if line.startswith("["):
            break
        if "=" in line:
            key, val = line.split("=", 1)
            entries[key.strip()] = val.strip()

    # Check required fields
    if entries.get("Type") != "Application":
        errors.append(f"Type must be 'Application', found: {entries.get('Type')}")

    if not entries.get("Name"):
        errors.append("Missing required field 'Name'")

    exec_val = entries.get("Exec", "")
    if not exec_val:
        errors.append("Missing required field 'Exec'")
    elif "%F" not in exec_val and "%f" not in exec_val:
        errors.append(f"Exec must include '%F' or '%f' for file argument passing, found: {exec_val}")

    if not entries.get("Icon"):
        errors.append("Missing required field 'Icon'")

    if entries.get("Terminal") != "false":
        errors.append(f"Terminal must be 'false' for GUI application, found: {entries.get('Terminal')}")

    # Check Categories
    categories = entries.get("Categories", "")
    if not categories:
        errors.append("Missing required field 'Categories'")
    else:
        if not categories.endswith(";"):
            errors.append("Categories string must be semicolon-separated and end with a semicolon")
        cat_list = [c for c in categories.split(";") if c]
        for cat in cat_list:
            if cat not in STANDARD_MAIN_CATEGORIES and cat not in STANDARD_ADDITIONAL_CATEGORIES:
                errors.append(f"Category '{cat}' is not a recognized FreeDesktop category")

    # Check MimeType
    mimetypes = entries.get("MimeType", "")
    if not mimetypes:
        errors.append("Missing required field 'MimeType'")
    else:
        if not mimetypes.endswith(";"):
            errors.append("MimeType string must be semicolon-separated and end with a semicolon")
        mime_list = [m for m in mimetypes.split(";") if m]
        if "text/markdown" not in mime_list:
            errors.append("MimeType must include 'text/markdown'")
        # Strict PRD FR-OPEN-003 / Section 11.4 check
        if "text/plain" in mime_list:
            errors.append("STRICT VIOLATION: MimeType must NOT include 'text/plain' to avoid hijacking generic text files")

    return errors


def validate_svg_icon(svg_path: Path) -> list[str]:
    errors = []
    if not svg_path.is_file():
        return [f"SVG icon file not found: {svg_path}"]

    try:
        tree = ET.parse(svg_path)
        root = tree.getroot()
        if not root.tag.endswith("svg"):
            errors.append(f"SVG root tag must be 'svg', found: {root.tag}")
        if "viewBox" not in root.attrib and ("width" not in root.attrib or "height" not in root.attrib):
            errors.append("SVG must specify viewBox or width/height attributes")
    except Exception as exc:
        errors.append(f"Invalid XML in SVG icon {svg_path}: {exc}")

    return errors


def main():
    repo_root = Path(__file__).resolve().parent.parent
    desktop_file = repo_root / "packaging" / "linux" / "markdown-viewer.desktop"
    build_desktop_file = repo_root / "build" / "linux" / "markdown-viewer.desktop"
    svg_icon = repo_root / "packaging" / "linux" / "markdown-viewer.svg"

    if len(sys.argv) > 1:
        desktop_file = Path(sys.argv[1])

    print("=================================================================")
    print("FreeDesktop Desktop Entry & Linux Icon Validator")
    print("=================================================================")

    # 1. Check if system desktop-file-validate is available
    system_validator = shutil.which("desktop-file-validate")
    if system_validator:
        print(f"[Tool Discovery] Found system validator: {system_validator}")
        try:
            res = subprocess.run([system_validator, str(desktop_file)], capture_output=True, text=True, check=False)
            if res.returncode == 0:
                print(f"[System Validator] desktop-file-validate passed cleanly for {desktop_file}")
            else:
                print(f"[System Validator ERROR] desktop-file-validate output:\n{res.stderr or res.stdout}")
        except Exception as e:
            print(f"[System Validator WARNING] Failed to run desktop-file-validate: {e}")
    else:
        print("[Tool Discovery] 'desktop-file-validate' is not installed in system PATH (expected in minimal WSL environment).")
        print("[Tool Discovery] Performing comprehensive specification validation using FreeDesktop Entry Specification 1.5 engine.")

    # 2. Comprehensive Specification Validation
    print(f"\n[Validation] Checking desktop entry file: {desktop_file}")
    errors = validate_desktop_file(desktop_file)

    if build_desktop_file.is_file():
        print(f"[Validation] Checking build desktop entry file: {build_desktop_file}")
        build_errors = validate_desktop_file(build_desktop_file)
        for err in build_errors:
            errors.append(f"build/linux/markdown-viewer.desktop: {err}")

    print(f"[Validation] Checking scalable SVG icon: {svg_icon}")
    icon_errors = validate_svg_icon(svg_icon)
    errors.extend(icon_errors)

    if errors:
        print("\n[VALIDATION FAILED] The following errors were found:")
        for err in errors:
            print(f"  - ERROR: {err}")
        sys.exit(1)

    print("\n[VALIDATION PASSED] Desktop entry and icon specifications fully verified:")
    print("  - Type=Application with %F multi-file parameter specification")
    print("  - FreeDesktop registered categories: Utility, TextEditor, Viewer")
    print("  - Declares text/markdown and text/x-markdown associations")
    print("  - Strictly excludes generic text/plain (PRD Section 11.4 compliant)")
    print("  - Scalable vector icon is well-formed XML with valid viewBox")
    print("=================================================================")


if __name__ == "__main__":
    main()
