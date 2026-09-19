#!/usr/bin/env python3
"""Validate _data/beverages.yml against the rules of task C12 in
documentation/caffcalc-implementation-brief.md:

  - valid YAML, at least 100 entries, unique slugs
  - every entry has a source_url and a verified date
  - every serving has a point value or a low/high range, never both
  - USDA-derived servings match usda_mg_per_100g * size_g / 100

    python3 scripts/check-beverages.py

Exits non-zero on any failure. Needs PyYAML (pip install pyyaml).
"""
import datetime
import math
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.exit("PyYAML is required: pip install pyyaml")

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_data", "beverages.yml")
MIN_ENTRIES = 100
CATEGORIES = {"coffee", "tea", "energy-drink", "energy-shot", "soda", "chocolate", "supplement", "medicine", "other"}
REQUIRED = ("slug", "product", "category", "servings", "source_name", "source_url", "verified")
SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def usda_mg(per_100g, grams):
    """Round half up, the way a label would, not Python's banker's rounding."""
    return math.floor(per_100g * grams / 100 + 0.5)


def check_serving(slug, i, s, per_100g):
    where = f"{slug} serving {i + 1}"
    errors = []
    point = "caffeine_mg" in s
    ranged = "caffeine_mg_low" in s or "caffeine_mg_high" in s
    if point == ranged:
        errors.append(f"{where}: needs caffeine_mg or caffeine_mg_low/high, not both or neither")
    elif point:
        if not isinstance(s["caffeine_mg"], int) or s["caffeine_mg"] < 0:
            errors.append(f"{where}: caffeine_mg must be a non-negative integer")
    else:
        lo, hi = s.get("caffeine_mg_low"), s.get("caffeine_mg_high")
        if not (isinstance(lo, int) and isinstance(hi, int) and 0 <= lo < hi):
            errors.append(f"{where}: range needs integers with caffeine_mg_low < caffeine_mg_high")
    if s.get("size_oz") is None and s.get("size_g") is None and not s.get("label"):
        errors.append(f"{where}: needs size_oz, size_g or a label")
    if per_100g is not None and "size_g" in s and point:
        expected = usda_mg(per_100g, s["size_g"])
        if s["caffeine_mg"] != expected:
            errors.append(f"{where}: {s['caffeine_mg']} mg does not match USDA "
                          f"{per_100g} mg/100 g x {s['size_g']} g = {expected} mg")
    return errors


def main():
    with open(DATA, encoding="utf-8") as fh:
        entries = yaml.safe_load(fh)
    if not isinstance(entries, list):
        sys.exit(f"{DATA}: expected a list of entries")

    errors = []
    seen = set()
    for n, e in enumerate(entries):
        slug = e.get("slug") or f"entry #{n + 1}"
        missing = [k for k in REQUIRED if not e.get(k)]
        if missing:
            errors.append(f"{slug}: missing {', '.join(missing)}")
            continue
        if not SLUG.match(slug):
            errors.append(f"{slug}: slug must be lowercase letters, digits and hyphens")
        if slug in seen:
            errors.append(f"{slug}: duplicate slug")
        seen.add(slug)
        if e["category"] not in CATEGORIES:
            errors.append(f"{slug}: unknown category {e['category']!r}")
        if not str(e["source_url"]).startswith("https://"):
            errors.append(f"{slug}: source_url must be https")
        if not isinstance(e["verified"], datetime.date):
            errors.append(f"{slug}: verified must be a YYYY-MM-DD date")
        if sum(1 for s in e["servings"] if s.get("default")) > 1:
            errors.append(f"{slug}: more than one default serving")
        for i, s in enumerate(e["servings"]):
            errors.extend(check_serving(slug, i, s, e.get("usda_mg_per_100g")))

    by_category = {}
    for e in entries:
        by_category[e.get("category")] = by_category.get(e.get("category"), 0) + 1

    print(f"entries:          {len(entries)} (minimum {MIN_ENTRIES})")
    print(f"with source_url:  {sum(1 for e in entries if e.get('source_url'))}")
    print(f"featured:         {sum(1 for e in entries if e.get('featured'))}")
    print("by category:      " + ", ".join(f"{k} {v}" for k, v in sorted(by_category.items(), key=str)))

    if len(entries) < MIN_ENTRIES:
        errors.append(f"only {len(entries)} entries; C12 requires at least {MIN_ENTRIES}")

    if errors:
        print("\nProblems:")
        for err in errors:
            print("  " + err)
        return 1

    print("\nOK - every entry is sourced and every serving is well-formed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
