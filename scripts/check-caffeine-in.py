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
  - its `article` resolves to a post (linked under "Useful articles")
  - every "N mg" in its faq answers is a figure from the data (see faq_numbers)
  - no paragraph of its copy, and no faq question, appears on another page;
    sentences shared between pages are listed as warnings

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


def article_href(slug):
    """Where "Useful articles" links a post: its URL, or its redirect_to target."""
    for path in glob.glob(os.path.join(ROOT, "_posts", f"*-{slug}.md")):
        return front_matter(path).get("redirect_to") or f"/blog/{slug}/"
    return f"/blog/{slug}/"


MG = re.compile(r"(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))? mg")
SENTENCE = re.compile(r"(?<=[.!?])\s+")


def mg_values(bev):
    vals = set()
    for s in bev["servings"]:
        for k in ("caffeine_mg", "caffeine_mg_low", "caffeine_mg_high"):
            if s.get(k) is not None:
                vals.add(s[k])
    if bev.get("usda_mg_per_100g") is not None:
        vals.add(bev["usda_mg_per_100g"])
    return vals


def faq_errors(slug, fm, beverages):
    """Every mg figure in a faq answer must come from the data: a serving of this
    drink or of a faq_drinks drink, a whole number of this drink's servings, what
    those leave of 400/200 mg, a difference between two such figures, or a value
    listed in faq_numbers (taken from the page's own copy)."""
    own = mg_values(beverages[slug])
    base = set(own) | {400, 200, 100}
    for other in fm.get("faq_drinks") or []:
        if other not in beverages:
            return [f"{slug}: faq_drinks slug {other!r} not in _data/beverages.yml"]
        base |= mg_values(beverages[other])
    allowed = set(base) | set(fm.get("faq_numbers") or [])
    for v in own:
        for k in range(1, 21):
            allowed |= {k * v, 400 - k * v, 200 - k * v}
    allowed |= {abs(a - b) for a in base for b in base}
    errors = []
    for item in fm.get("faq") or []:
        for m in MG.finditer(item["answer"]):
            for n in filter(None, m.groups()):
                if float(n) not in allowed:
                    errors.append(f"{slug}: faq figure {m.group(0)!r} not traceable to the data ({item['question']})")
    return errors


def body_text(page_html):
    m = re.search(r'<div class="[^"]*caffeine-in-body[^"]*">(.*?)</article>', page_html, re.S)
    return m.group(1) if m else ""


def paragraphs(page_html):
    for p in re.findall(r"<p>(.*?)</p>", body_text(page_html), re.S):
        text = " ".join(html.unescape(re.sub(r"<[^>]+>", " ", p)).split())
        if len(text.split()) >= 12:
            yield text


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
    warnings = []
    rows = []
    seen_paragraphs = {}
    seen_sentences = {}
    seen_questions = {}
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
        errors.extend(faq_errors(slug, fm, beverages))
        for item in fm.get("faq") or []:
            q = item["question"].strip().lower()
            if q in seen_questions:
                errors.append(f"{slug}: faq question also on {seen_questions[q]}: {item['question']!r}")
            seen_questions.setdefault(q, slug)
        for para in paragraphs(page):
            if para in seen_paragraphs and seen_paragraphs[para] != slug:
                errors.append(f"{slug}: paragraph also on {seen_paragraphs[para]}: {para[:70]!r}...")
            seen_paragraphs.setdefault(para, slug)
            for sent in SENTENCE.split(para):
                if len(sent.split()) >= 10:
                    if sent in seen_sentences and seen_sentences[sent] != slug:
                        warnings.append(f"{slug} / {seen_sentences[sent]}: {sent[:90]!r}")
                    seen_sentences.setdefault(sent, slug)
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
        if fm.get("article") and f'href="{article_href(fm["article"])}"' not in page:
            errors.append(f"{slug}: article {fm['article']!r} did not resolve to a post")

    print(f"pages:            {len(files)} (expected {EXPECTED_PAGES})")
    if rows:
        fewest = min(rows, key=lambda r: r[1])
        print(f"fewest words:     {fewest[1]} ({fewest[0]})")
        print(f"median words:     {sorted(r[1] for r in rows)[len(rows) // 2]}")
    if len(files) != EXPECTED_PAGES:
        errors.append(f"{len(files)} pages; C13 ships {EXPECTED_PAGES} first")

    if warnings:
        print(f"\nSentences shared between pages: {len(warnings)}")
        for w in warnings:
            print("  " + w)

    if errors:
        print("\nProblems:")
        for err in errors:
            print("  " + err)
        return 1

    print("\nOK - every page is sourced, linked, in the sitemap and above the word floor.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
