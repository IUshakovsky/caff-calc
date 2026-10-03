#!/usr/bin/env python3
"""Count inbound internal links per page from the built site.

Run after a build:

    bundle exec jekyll build && python3 scripts/inlinks_report.py

Each page in _site/ is split into chrome (the top navbar and the <footer>) and
main content (everything else in <body>). For every /blog/*/ and
/caffeine-in/*/ page the report gives the number of distinct *other* pages
linking to it from main content ("main"), the same minus archive listings
(/blog/, /page/N/, /pages/topics/) ("ctx", i.e. links someone chose to place),
and separately from chrome. Several links from the same source page count once.
The minimums apply to "main", as in the brief.

Not counted as sources: jekyll-redirect-from stubs (old /YYYY/MM/DD/slug/
URLs, recognisable by their meta refresh) and the feed.

Options:
    --save FILE      write the counts as JSON (e.g. a baseline)
    --compare FILE   show baseline -> now for each page, from a saved JSON
    --min-blog N     exit non-zero if any /blog/ post has fewer than N (default 4)
    --min-drink N    same for /caffeine-in/<drink>/ pages (default 5)
    --all            list every page, not just those below the minimum

It also lists any internal link to an old date-based URL or to an .html /
index.html variant, which should not exist.
"""
import argparse
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "_site")
HREF = re.compile(r'<a\b[^>]*?\bhref=["\']([^"\']+)["\']', re.I)
NAVBAR = re.compile(r'<nav class="navbar.*?</nav>', re.S)
FOOTER = re.compile(r"<footer\b.*?</footer>", re.S)
HEAD = re.compile(r"<head\b.*?</head>", re.S)
STUB = re.compile(r'<meta http-equiv="refresh"', re.I)
OLD_URL = re.compile(r"^/20\d\d/\d\d/\d\d/")
BLOG = re.compile(r"^/blog/[^/]+/$")
DRINK = re.compile(r"^/caffeine-in/[^/]+/$")
# Hub pages that live under /caffeine-in/ but are not drink pages
# Archive listings: count toward "main" but not toward "ctx" (contextual)
LISTING = re.compile(r"^/(blog/|page/\d+/|pages/topics/)$")
DRINK_HUBS = {"/caffeine-in/coffee/", "/caffeine-in/tea/", "/caffeine-in/energy-drinks/",
              "/caffeine-in/sodas/", "/caffeine-in/starbucks/"}


def url_for(path):
    rel = os.path.relpath(path, SITE).replace(os.sep, "/")
    if rel == "index.html":
        return "/"
    if rel.endswith("/index.html"):
        return "/" + rel[: -len("index.html")]
    return "/" + rel


def resolve(href, from_url):
    """Site-absolute path for an internal href (query/fragment dropped), else None."""
    href = href.strip()
    m = re.match(r"^(?:https?:)?//(?:www\.)?([^/]+)(/[^?#]*)?", href)
    if m:
        if m.group(1) != "caffcalc.com":
            return None
        href = m.group(2) or "/"
    elif re.match(r"^[a-z]+:", href, re.I) or href.startswith("#"):
        return None
    href = re.split(r"[?#]", href)[0]
    if not href:
        return None
    if not href.startswith("/"):
        href = os.path.normpath(os.path.join(os.path.dirname(from_url), href)) + ("/" if href.endswith("/") else "")
    return href


def collect():
    pages = {}
    for root, _, files in os.walk(SITE):
        for f in files:
            if f.endswith(".html"):
                pages[os.path.join(root, f)] = url_for(os.path.join(root, f))

    main_in = defaultdict(set)
    chrome_in = defaultdict(set)
    bad = []
    for path, src in pages.items():
        with open(path, encoding="utf-8", errors="replace") as fh:
            body = fh.read()
        if STUB.search(body):
            continue
        body = HEAD.sub("", body)
        chrome = "".join(NAVBAR.findall(body)) + "".join(FOOTER.findall(body))
        main = FOOTER.sub("", NAVBAR.sub("", body))
        for part, bucket in ((main, main_in), (chrome, chrome_in)):
            for href in HREF.findall(part):
                target = resolve(href, src)
                if target is None:
                    continue
                if OLD_URL.match(target) or target.endswith(".html"):
                    bad.append((src, href))
                    continue
                if not target.endswith("/"):
                    target += "/"
                if target != src:
                    bucket[target].add(src)

    targets = sorted(u for u in pages.values()
                     if BLOG.match(u) or (DRINK.match(u) and u not in DRINK_HUBS))
    counts = {u: {"main": len(main_in[u]),
                  "ctx": sum(1 for s in main_in[u] if not LISTING.match(s)),
                  "chrome": len(chrome_in[u])} for u in targets}
    return counts, bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--save")
    ap.add_argument("--compare")
    ap.add_argument("--min-blog", type=int, default=4)
    ap.add_argument("--min-drink", type=int, default=5)
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    if not os.path.isdir(SITE):
        sys.exit("_site not found - run `bundle exec jekyll build` first")
    counts, bad = collect()
    base = {}
    if args.compare:
        with open(args.compare) as fh:
            base = json.load(fh)

    def minimum(u):
        return args.min_blog if u.startswith("/blog/") else args.min_drink

    short = [u for u in counts if counts[u]["main"] < minimum(u)]
    rows = counts if args.all else short
    if rows:
        head = f"{'page':62} {'main':>9} {'ctx':>9} {'nav/footer':>10}"
        print(head)
        print("-" * len(head))
        for u in sorted(rows, key=lambda u: (counts[u]["main"], u)):
            m = counts[u]["main"]
            c = counts[u]["ctx"]
            main_col = f"{base[u]['main']}->{m}" if u in base else str(m)
            ctx_col = f"{base[u]['ctx']}->{c}" if u in base else str(c)
            print(f"{u:62} {main_col:>9} {ctx_col:>9} {counts[u]['chrome']:>10}")
        print()

    for kind, rx in (("/blog/", BLOG), ("/caffeine-in/", DRINK)):
        group = [u for u in counts if rx.match(u) and u.startswith(kind)]
        vals = sorted(counts[u]["main"] for u in group)
        cvals = sorted(counts[u]["ctx"] for u in group)
        line = (f"{kind:14} pages={len(group):3}  main min={vals[0]:3} median={vals[len(vals) // 2]:3}  "
                f"ctx min={cvals[0]:3} median={cvals[len(cvals) // 2]:3}  "
                f"below {minimum(group[0])}: {sum(1 for u in group if u in short)}")
        if base:
            bvals = sorted(base[u]["main"] for u in group if u in base)
            bc = sorted(base[u]["ctx"] for u in group if u in base)
            if bvals:
                line += (f"\n{'':14} baseline         main min={bvals[0]:3} median={bvals[len(bvals) // 2]:3}  "
                         f"ctx min={bc[0]:3} median={bc[len(bc) // 2]:3}")
        print(line)

    if bad:
        print(f"\nLinks to old date URLs or .html variants: {len(bad)}")
        for src, href in sorted(set(bad))[:40]:
            print(f"  {src} -> {href}")

    if args.save:
        with open(args.save, "w") as fh:
            json.dump(counts, fh, indent=1, sort_keys=True)
        print(f"\nsaved {args.save}")

    return 1 if short or bad else 0


if __name__ == "__main__":
    sys.exit(main())
