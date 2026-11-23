#!/usr/bin/env python3
"""Stamp immutable deployment identity and cache-busting URLs in staged Pages HTML.

The source HTML stays framework-free and untouched. Only the _site artifact is
versioned so old browser/CDN HTML never mixes with cached JS/CSS from another commit.
"""
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import re
import sys


def rewrite(root: Path, commit: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("A full 40-character git commit SHA is required")
    if not (root / "preview/index.html").is_file():
        raise ValueError("Pages artifact must contain preview/index.html")

    attribute = re.compile(
        r'(?P<attr>\b(?:href|src)=)(?P<quote>["\'])(?P<url>[^"\']+)(?P=quote)'
    )

    def version_link(match: re.Match) -> str:
        url = match.group("url")
        if url.startswith(("#", "//", "data:", "mailto:", "javascript:")):
            return match.group(0)
        parts = urlsplit(url)
        if parts.scheme or parts.netloc or not parts.path.lower().endswith(
            (".css", ".js", ".html")
        ):
            return match.group(0)
        query = [(k, v) for k, v in parse_qsl(parts.query) if k != "v"]
        query.append(("v", commit))
        final = urlunsplit(
            (parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
        )
        return f'{match.group("attr")}{match.group("quote")}{final}{match.group("quote")}'

    for page in sorted(root.rglob("*.html")):
        html = page.read_text(encoding="utf-8")
        html = attribute.sub(version_link, html)
        if "</head>" not in html:
            raise ValueError(f"Missing </head>: {page}")
        html = html.replace(
            "</head>",
            f'<meta name="mp-deployment-commit" content="{commit}">\n</head>',
            1,
        )
        if page.relative_to(root).as_posix() == "preview/index.html":
            html = html.replace(
                "UI prototype</span>",
                f"UI prototype · сборка {commit[:7]}</span>",
                1,
            )
        if page.relative_to(root).as_posix() == "modules/platform/contract-demo/index.html":
            html = html.replace(
                "UI prototype / mock</span>",
                f"UI prototype / mock · сборка {commit[:7]}</span>",
                1,
            )
        page.write_text(html, encoding="utf-8")

    preview = (root / "preview/index.html").read_text(encoding="utf-8")
    concept = (
        root / "modules/platform/contract-demo/index.html"
    ).read_text(encoding="utf-8")
    for name, html in (("preview", preview), ("concept", concept)):
        if f'mp-deployment-commit" content="{commit}"' not in html:
            raise AssertionError(f"Missing deployment marker on {name}")
        if f"concept.js?v={commit}" not in concept:
            raise AssertionError("Concept JS is not cache-busted")
        if 'value="reader"' in concept.lower():
            raise AssertionError("Retired Platform Reader is present")
    print(f"Versioned GitHub Pages site for commit {commit}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: version_pages_assets.py _site <full-git-sha>")
    rewrite(Path(sys.argv[1]), sys.argv[2])
