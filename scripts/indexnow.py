#!/usr/bin/env python3
"""Submit new and changed pages to IndexNow (Bing, Yandex, Seznam, Naver...).

Compares the sitemap that was live before a deploy with the freshly built one
and submits every URL that is new or whose <lastmod> changed. Run it only
after the deploy is live: search engines fetch the key file and the pages
straight away.

Usage:
  python3 scripts/indexnow.py OLD_SITEMAP NEW_SITEMAP [--all] [--dry-run]

OLD_SITEMAP may be missing or empty (first deploy); then every URL is sent.
--all sends every URL in NEW_SITEMAP regardless of the old one.
"""
import json
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

HOST = "caffcalc.com"
KEY = "7e223ec72b48fffb591b8f50129565d0"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
BATCH = 10000  # IndexNow limit per request


def read_sitemap(path):
    p = Path(path)
    if not p.is_file() or p.stat().st_size == 0:
        return {}
    try:
        root = ET.parse(p).getroot()
    except ET.ParseError as e:
        print(f"warning: cannot parse {path}: {e}")
        return {}
    urls = {}
    for url in root.findall("s:url", NS):
        loc = url.findtext("s:loc", default="", namespaces=NS).strip()
        if loc:
            urls[loc] = normalize(url.findtext("s:lastmod", default="", namespaces=NS))
    return urls


def normalize(lastmod):
    """Compare instants, not strings: the same commit time is written with a
    different UTC offset depending on the build machine's time zone."""
    s = lastmod.strip()
    try:
        dt = datetime.fromisoformat(s)
    except ValueError:
        return s
    if dt.tzinfo is None:
        return dt.isoformat()
    return dt.astimezone(timezone.utc).isoformat()


def submit(urls):
    body = json.dumps({
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        ENDPOINT, data=body, method="POST",
        headers={"Content-Type": "application/json; charset=utf-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 2
    old, new = read_sitemap(args[0]), read_sitemap(args[1])
    if not new:
        print("error: new sitemap is empty or missing")
        return 1

    if "--all" in argv or not old:
        changed = sorted(new)
    else:
        changed = sorted(u for u, mod in new.items() if old.get(u) != mod)

    print(f"{len(changed)} of {len(new)} URLs new or changed")
    for u in changed:
        print("  " + u)
    if not changed or "--dry-run" in argv:
        return 0

    for i in range(0, len(changed), BATCH):
        status = submit(changed[i:i + BATCH])
        # 200 = accepted, 202 = accepted, key validation pending
        print(f"IndexNow response: {status}")
        if status not in (200, 202):
            # Don't fail the deploy over this; flag it in the Actions log.
            print(f"::warning::IndexNow returned {status}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
