#!/usr/bin/env python3
"""Prove no post is orphaned: every post URL in _site must be linked from at
least one *other* page in _site.

Acceptance check for task B11 in docs/archive/caffcalc-implementation-brief.md.
Run after `bundle exec jekyll build`:

    python3 scripts/check-internal-links.py

Exits non-zero if any post has zero internal inbound links, or if any page
links to a merged-away post (a /blog/ redirect stub pointing at another post).

jekyll-redirect-from stubs (recognisable by their meta refresh) are neither
posts nor link sources.
"""
import os
import re
import sys
from collections import defaultdict

SITE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_site")
HREF = re.compile(rb'href=["\']([^"\'#?]+)', re.I)
# Post permalinks are now /blog/slug/ (migrated from /YYYY/MM/DD/slug/)
POST_URL = re.compile(r"^/blog/[^/]+/$")
STUB = re.compile(rb'<meta http-equiv="refresh" content="0; url=([^"]+)"', re.I)


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

    bodies, merged = {}, {}
    for path, url in pages.items():
        with open(path, "rb") as fh:
            bodies[path] = fh.read()
        m = STUB.search(bodies[path])
        if m:
            dest = normalise(m.group(1), url)
            # a /blog/ stub that forwards to another post = a merged-away post
            if POST_URL.match(url) and dest and POST_URL.match(dest):
                merged[url] = dest

    stub_paths = {p for p, b in bodies.items() if STUB.search(b)}
    posts = {u for p, u in pages.items() if POST_URL.match(u) and p not in stub_paths}
    inbound = defaultdict(set)
    to_merged = defaultdict(set)

    for path, src_url in pages.items():
        if path in stub_paths:
            continue
        for href in set(HREF.findall(bodies[path])):
            target = normalise(href, src_url)
            if target is None:
                continue
            for candidate in (target, target.rstrip("/") + "/"):
                if candidate in posts and candidate != src_url:
                    inbound[candidate].add(src_url)
                if candidate in merged:
                    to_merged[candidate].add(src_url)

    orphans = sorted(p for p in posts if not inbound[p])
    counts = sorted(((len(inbound[p]), p) for p in posts))

    print(f"posts found:      {len(posts)}")
    print(f"orphans:          {len(orphans)}")
    if posts:
        print(f"fewest inbound:   {counts[0][0]} ({counts[0][1]})")
        print(f"median inbound:   {counts[len(counts) // 2][0]}")
        print(f"most inbound:     {counts[-1][0]} ({counts[-1][1]})")

    print(f"links to merged:  {sum(len(v) for v in to_merged.values())}")

    if to_merged:
        print("\nLinks to merged-away posts (point them at the redirect target):")
        for dead in sorted(to_merged):
            for src in sorted(to_merged[dead]):
                print(f"  {src} -> {dead} (now {merged[dead]})")
    if orphans:
        print("\nPosts with zero internal inbound links:")
        for o in orphans:
            print("  " + o)
    if orphans or to_merged:
        return 1

    print("\nOK - every post has at least one internal inbound link.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
