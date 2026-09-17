#!/usr/bin/env python3
"""Prove no post is orphaned: every post URL in _site must be linked from at
least one *other* page in _site.

Acceptance check for task B11 in documentation/caffcalc-implementation-brief.md.
Run after `bundle exec jekyll build`:

    python3 scripts/check-internal-links.py

Exits non-zero if any post has zero internal inbound links.
"""
import os
import re
import sys
from collections import defaultdict

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_site")
HREF = re.compile(rb'href=["\']([^"\'#?]+)', re.I)
# Post permalinks are /YYYY/MM/DD/slug/
POST_URL = re.compile(r"^/\d{4}/\d{2}/\d{2}/[^/]+/$")


def url_for(path):
    """Map an _site file path to the URL it is served at."""
    rel = os.path.relpath(path, SITE).replace(os.sep, "/")
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    if rel == "index.html":
        return "/"
    return "/" + rel


def normalise(href, from_url):
    """Resolve an href to a site-absolute path, or None if it is off-site."""
    href = href.decode("utf-8", "replace").strip()
    if re.match(r"^(https?:)?//", href):
        m = re.match(r"^(?:https?:)?//(?:www\.)?caffcalc\.com(/.*)?$", href)
        if not m:
            return None
        href = m.group(1) or "/"
    elif href.startswith(("mailto:", "tel:", "javascript:", "data:")):
        return None
    elif not href.startswith("/"):
        href = os.path.normpath(os.path.join(os.path.dirname(from_url), href))
        if not href.startswith("/"):
            href = "/" + href
    # Treat /a/b and /a/b/ as the same target, and strip index.html
    if href.endswith("/index.html"):
        href = href[: -len("index.html")]
    return href


def main():
    if not os.path.isdir(SITE):
        sys.exit("_site not found - run `bundle exec jekyll build` first")

    pages = {}
    for root, _, files in os.walk(SITE):
        for f in files:
            if f.endswith(".html"):
                p = os.path.join(root, f)
                pages[p] = url_for(p)

    posts = {u for u in pages.values() if POST_URL.match(u)}
    inbound = defaultdict(set)

    for path, src_url in pages.items():
        with open(path, "rb") as fh:
            body = fh.read()
        for href in set(HREF.findall(body)):
            target = normalise(href, src_url)
            if target is None:
                continue
            for candidate in (target, target.rstrip("/") + "/"):
                if candidate in posts and candidate != src_url:
                    inbound[candidate].add(src_url)

    orphans = sorted(p for p in posts if not inbound[p])
    counts = sorted(((len(inbound[p]), p) for p in posts))

    print(f"posts found:      {len(posts)}")
    print(f"orphans:          {len(orphans)}")
    if posts:
        print(f"fewest inbound:   {counts[0][0]} ({counts[0][1]})")
        print(f"median inbound:   {counts[len(counts) // 2][0]}")
        print(f"most inbound:     {counts[-1][0]} ({counts[-1][1]})")

    if orphans:
        print("\nPosts with zero internal inbound links:")
        for o in orphans:
            print("  " + o)
        return 1

    print("\nOK - every post has at least one internal inbound link.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
