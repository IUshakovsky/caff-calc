#!/usr/bin/env python3
"""Check the "caffeine in X" pages against the acceptance criteria of task C13
in docs/archive/caffcalc-implementation-brief.md. Run after a build:

    bundle exec jekyll build && python3 scripts/check-caffeine-in.py

For every file in _caffeine_in/ it checks that:
  - the slug exists in _data/beverages.yml, as do its `related` slugs
  - the built page has at least 250 words of page-specific copy (the
    .caffeine-in-body block, which excludes the templated sections)
  - the page shows the entry's source link
  - the page is linked from /caffeine-in/ and from the homepage, and is listed
    in sitemap.xml
  - its `article` resolves to a post ("Further reading" is rendered)

Exits non-zero on any failure. Needs PyYAML (pip install pyyaml).
"""
import glob
import html
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: pip install pyyaml")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "_site")
MIN_WORDS = 250
EXPECTED_PAGES = 103
WORD = re.compile(r"[A-Za-z0-9]+(?:['’.-][A-Za-z0-9]+)*")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def front_matter(path):
    m = re.match(r"^---\n(.*?)\n---\n", read(path), re.S)
    return yaml.safe_load(m.group(1)) if m else {}


def body_words(page_html):
    m = re.search(r'<div class="[^"]*caffeine-in-body[^"]*">(.*?)</article>', page_html, re.S)
    if not m:
        return 0
    text = html.unescape(re.sub(r"<[^>]+>", " ", m.group(1)))
    return len(WORD.findall(text))


def main():
    if not os.path.isdir(SITE):
        sys.exit("_site not found - run `bundle exec jekyll build` first")

    beverages = {b["slug"]: b for b in yaml.safe_load(read(os.path.join(ROOT, "_data", "beverages.yml")))}
    index_html = read(os.path.join(SITE, "caffeine-in", "index.html"))
    home_html = read(os.path.join(SITE, "index.html"))
    sitemap = read(os.path.join(SITE, "sitemap.xml"))

    files = sorted(glob.glob(os.path.join(ROOT, "_caffeine_in", "*.md")))
    errors = []
    rows = []
    for path in files:
        slug = os.path.splitext(os.path.basename(path))[0]
        url = f"/caffeine-in/{slug}/"
        fm = front_matter(path)
        bev = beverages.get(slug)
        if not bev:
            errors.append(f"{slug}: no entry with this slug in _data/beverages.yml")
            continue
        for other in fm.get("related") or []:
            if other not in beverages:
                errors.append(f"{slug}: related slug {other!r} not in _data/beverages.yml")
        built = os.path.join(SITE, "caffeine-in", slug, "index.html")
        if not os.path.exists(built):
            errors.append(f"{slug}: {built} was not built")
            continue
        page = read(built)
        words = body_words(page)
        rows.append((slug, words))
        if words < MIN_WORDS:
            errors.append(f"{slug}: {words} words of page-specific copy (minimum {MIN_WORDS})")
        if html.escape(bev["source_url"]) not in page and bev["source_url"] not in page:
            errors.append(f"{slug}: source link {bev['source_url']} not shown")
        if f'href="{url}"' not in index_html:
            errors.append(f"{slug}: not linked from /caffeine-in/")
        if f'href="{url}"' not in home_html:
            errors.append(f"{slug}: not linked from the homepage")
        if f"<loc>https://caffcalc.com{url}</loc>" not in sitemap:
            errors.append(f"{slug}: missing from sitemap.xml")
        if fm.get("article") and "Further reading" not in page:
            errors.append(f"{slug}: article {fm['article']!r} did not resolve to a post")

    print(f"pages:            {len(files)} (expected {EXPECTED_PAGES})")
    if rows:
        fewest = min(rows, key=lambda r: r[1])
        print(f"fewest words:     {fewest[1]} ({fewest[0]})")
        print(f"median words:     {sorted(r[1] for r in rows)[len(rows) // 2]}")
    if len(files) != EXPECTED_PAGES:
        errors.append(f"{len(files)} pages; C13 ships {EXPECTED_PAGES} first")

    if errors:
        print("\nProblems:")
        for err in errors:
            print("  " + err)
        return 1

    print("\nOK - every page is sourced, linked, in the sitemap and above the word floor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
