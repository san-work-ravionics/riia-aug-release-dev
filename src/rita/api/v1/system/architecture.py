"""System router — groma architecture map reader.

ADR-001 Tier 1: filesystem read (groma/ OKF 0.2 Markdown), no DB access.
Mirrors the pattern of data_prep.py.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["system:architecture"])

_REPO_ROOT = Path(__file__).parent.parent.parent.parent.parent.parent
_GROMA_ROOT = _REPO_ROOT / "groma"


def _parse_md(text: str) -> tuple[dict, str]:
    if not text.startswith("---"):
        return {}, text.strip()
    end = text.find("\n---", 4)
    if end == -1:
        return {}, text.strip()
    try:
        fm = yaml.safe_load(text[4:end]) or {}
    except Exception:
        fm = {}
    body = text[end + 4:].strip()
    return fm, body


def _read_md(path: Path) -> tuple[dict, str]:
    if not path.exists():
        return {}, ""
    return _parse_md(path.read_text(encoding="utf-8"))


def _parse_relationships(body: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    in_table = False
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("## Relationships"):
            in_table = True
            continue
        if in_table and line.startswith("## "):
            break
        if in_table and line.startswith("|") and "---" not in line and "Source" not in line:
            parts = [c.strip() for c in line.strip("|").split("|")]
            if len(parts) >= 2:
                # Strip OKF link syntax [Label](path "id") → Label
                import re
                def strip_link(s: str) -> str:
                    m = re.match(r'\[([^\]]+)\]', s)
                    return m.group(1) if m else s
                rows.append({
                    "source": strip_link(parts[0]),
                    "target": strip_link(parts[1]),
                    "description": parts[2] if len(parts) > 2 else "",
                    "technology": parts[3] if len(parts) > 3 else "",
                })
    return rows


@router.get("/architecture")
def get_architecture() -> dict[str, Any]:
    """Return the full groma C4 architecture map as structured JSON."""
    if not _GROMA_ROOT.exists():
        return {"project": {}, "actors": [], "externals": [], "systems": []}

    # project
    fm, body = _read_md(_GROMA_ROOT / "project.md")
    project: dict[str, Any] = {
        "title": fm.get("title", ""),
        "description": fm.get("description", ""),
        "overview": body,
    }

    # actors
    actors: list[dict[str, Any]] = []
    for f in sorted((_GROMA_ROOT / "actors").glob("*.md")):
        fm, body = _read_md(f)
        g = fm.get("groma") or {}
        actors.append({
            "id": g.get("id", f.stem),
            "title": fm.get("title", f.stem),
            "description": fm.get("description", ""),
            "overview": body,
        })

    # externals
    externals: list[dict[str, Any]] = []
    for f in sorted((_GROMA_ROOT / "externals").glob("*.md")):
        fm, body = _read_md(f)
        g = fm.get("groma") or {}
        externals.append({
            "id": g.get("id", f.stem),
            "title": fm.get("title", f.stem),
            "description": fm.get("description", ""),
            "overview": body,
        })

    # systems → containers → components
    systems: list[dict[str, Any]] = []
    sys_dir = _GROMA_ROOT / "systems"
    if sys_dir.exists():
        for sys_path in sorted(p for p in sys_dir.iterdir() if p.is_dir()):
            sys_fm, sys_body = _read_md(sys_path / "system.md")
            g = sys_fm.get("groma") or {}

            containers: list[dict[str, Any]] = []
            con_dir = sys_path / "containers"
            if con_dir.exists():
                for con_path in sorted(p for p in con_dir.iterdir() if p.is_dir()):
                    con_fm, con_body = _read_md(con_path / "container.md")
                    cg = con_fm.get("groma") or {}

                    components: list[dict[str, Any]] = []
                    comp_dir = con_path / "components"
                    if comp_dir.exists():
                        for comp_f in sorted(comp_dir.glob("*.md")):
                            comp_fm, comp_body = _read_md(comp_f)
                            xg = comp_fm.get("groma") or {}
                            overview = comp_body.split("## Relationships")[0].strip()
                            components.append({
                                "id": xg.get("id", comp_f.stem),
                                "title": comp_fm.get("title", comp_f.stem),
                                "description": comp_fm.get("description", ""),
                                "technology": xg.get("technology", ""),
                                "overview": overview,
                                "relationships": _parse_relationships(comp_body),
                            })

                    containers.append({
                        "id": cg.get("id", con_path.name),
                        "title": con_fm.get("title", con_path.name),
                        "description": con_fm.get("description", ""),
                        "technology": cg.get("technology", ""),
                        "overview": con_body,
                        "components": components,
                    })

            systems.append({
                "id": g.get("id", sys_path.name),
                "title": sys_fm.get("title", sys_path.name),
                "description": sys_fm.get("description", ""),
                "overview": sys_body,
                "containers": containers,
            })

    return {"project": project, "actors": actors, "externals": externals, "systems": systems}
