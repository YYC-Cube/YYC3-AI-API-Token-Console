#!/usr/bin/env python3
"""Verify mermaid code fences are balanced across markdown docs.
校验 markdown 文档中 mermaid 代码块开闭配对（pre-commit / CI gate）。
Exit 1 on unbalanced fences.
"""
from __future__ import annotations

import sys
from pathlib import Path

OPEN = "```mermaid"
CLOSE = "```"


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    offenders: list[str] = []
    skip_parts = {"node_modules", "dist", "coverage", ".build", "site"}
    for md in root.rglob("*.md"):
        if skip_parts & set(md.parts):
            continue
        text = md.read_text(encoding="utf-8", errors="ignore")
        inside_mermaid = False
        for lineno, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if not inside_mermaid and stripped.startswith(OPEN):
                inside_mermaid = True
            elif inside_mermaid and stripped == CLOSE:
                inside_mermaid = False
        if inside_mermaid:  # EOF 且 mermaid 块未闭合 unclosed at EOF
            offenders.append(f"{md.relative_to(root)}: unclosed mermaid fence")
    if offenders:
        print("Mermaid fence check FAILED:")
        print("\n".join(f"  - {o}" for o in offenders))
        return 1
    print("Mermaid fence check OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
