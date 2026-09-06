from __future__ import annotations

import json
import re
import subprocess
import tempfile
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
PAGES = [
    ROOT / "brand/guidelines.html",
    ROOT / "brand/invoice-generator.html",
    ROOT / "brand/business-card-v2.html",
]
BEHAVIOR_PAGES = PAGES[1:]
SKILL = Path.home() / ".hermes/profiles/ecc/skills/brand/swiftloop-design"


class Inventory(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.refs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.add(values["id"] or "")
        for key in ("src", "href"):
            if values.get(key):
                self.refs.append(values[key] or "")


def read_head(relative: Path) -> str:
    result = subprocess.run(
        ["git", "show", f"HEAD:{relative.as_posix()}"],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout


def inventory(source: str) -> Inventory:
    parsed = Inventory()
    parsed.feed(source)
    return parsed


def inline_scripts(source: str) -> list[str]:
    scripts: list[str] = []
    for match in re.finditer(r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>", source, re.I | re.S):
        attrs = match.group("attrs")
        if re.search(r"\bsrc\s*=", attrs, re.I):
            continue
        type_match = re.search(r"\btype\s*=\s*(['\"])(.*?)\1", attrs, re.I | re.S)
        if type_match and type_match.group(2).strip().lower() not in {"", "text/javascript", "application/javascript", "module"}:
            continue
        scripts.append(match.group("body"))
    return scripts


def check_javascript(path: Path, source: str) -> int:
    scripts = inline_scripts(source)
    for index, script in enumerate(scripts):
        suffix = ".mjs" if "type=\"module\"" in source else ".js"
        with tempfile.NamedTemporaryFile("w", suffix=suffix, delete=False, encoding="utf-8") as handle:
            handle.write(script)
            temp_path = Path(handle.name)
        try:
            subprocess.run(["node", "--check", str(temp_path)], check=True, capture_output=True, text=True)
        finally:
            temp_path.unlink(missing_ok=True)
    return len(scripts)


def resolve_assets(path: Path, source: str) -> list[str]:
    parsed = inventory(source)
    refs = list(parsed.refs)
    refs.extend(match.group(1) for match in re.finditer(r"url\(\s*['\"]?([^)'\"]+)", source, re.I))
    missing: list[str] = []
    for ref in refs:
        value = unquote(ref.strip())
        parts = urlsplit(value)
        if not value or value.startswith(("#", "data:", "mailto:", "tel:", "javascript:")) or parts.scheme or parts.netloc:
            continue
        clean = parts.path
        if not clean:
            continue
        resolved = (ROOT / clean.lstrip("/")) if clean.startswith("/") else (path.parent / clean)
        if not resolved.exists():
            missing.append(value)
    return sorted(set(missing))


pages_report: dict[str, object] = {}
report: dict[str, object] = {"pages": pages_report}
for page in PAGES:
    source = page.read_text(encoding="utf-8")
    assert "api.fontshare.com" not in source and "fonts.googleapis.com" not in source, page
    missing = resolve_assets(page, source)
    assert not missing, f"{page}: missing assets {missing}"
    script_count = check_javascript(page, source)
    pages_report[page.name] = {
        "ids": len(inventory(source).ids),
        "inlineScriptsParsed": script_count,
        "missingAssets": missing,
        "remoteFontDependencies": 0,
    }

for page in BEHAVIOR_PAGES:
    current = page.read_text(encoding="utf-8")
    original = read_head(page.relative_to(ROOT))
    assert inventory(current).ids == inventory(original).ids, f"ID contract changed in {page.name}"
    assert inline_scripts(current) == inline_scripts(original), f"Inline behavior changed in {page.name}"

repo_tokens = json.loads((ROOT / "brand/design-tokens.json").read_text(encoding="utf-8"))
skill_tokens = json.loads((SKILL / "references/design-tokens.json").read_text(encoding="utf-8"))
assert repo_tokens["colors"]["core"] == skill_tokens["colors"]["core"]
assert repo_tokens["strategy"]["promise"] == skill_tokens["strategy"]["promise"]
assert repo_tokens["typography"]["display"]["family"] == "Mirava"
assert repo_tokens["typography"]["body"]["family"] == "Oxanium"
assert repo_tokens["typography"]["label"]["family"] == "Doto"

skill_md = (SKILL / "SKILL.md").read_text(encoding="utf-8")
assert skill_md.startswith("---\n")
frontmatter_end = skill_md.index("\n---\n", 4)
frontmatter = skill_md[4:frontmatter_end]
description_match = re.search(r"^description:\s*(.+)$", frontmatter, re.M)
assert description_match is not None
description = description_match.group(1).strip()
assert len(description) <= 60 and description.endswith(".")
assert not re.search(r"\bAE\d{21}\b", "\n".join(p.read_text(encoding="utf-8") for p in SKILL.rglob("*.*")))

report["behaviorContracts"] = {
    page.name: {"idsUnchanged": True, "inlineJavaScriptUnchanged": True}
    for page in BEHAVIOR_PAGES
}
report["tokens"] = {
    "repoJsonValid": True,
    "skillJsonValid": True,
    "corePaletteSynchronized": True,
    "typeRoles": ["Mirava", "Oxanium", "Doto"],
}
report["skill"] = {
    "frontmatterPresent": True,
    "descriptionLength": len(description),
    "referencesPresent": sorted(str(p.relative_to(SKILL)) for p in SKILL.rglob("*.*")),
    "ibanPatternPresent": False,
}

print(json.dumps(report, indent=2))
