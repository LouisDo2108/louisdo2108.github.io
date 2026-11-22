#!/usr/bin/env python3
"""Check whether papers are already in the Zotero backup (LouisDo2108/Zotero-DB, "My Library.bib").

Usage:
    python3 scripts/zotero_lookup.py "Title one" "Title two" ...
        → one JSON line per title: {"title": ..., "in_zotero": true/false, "match": "<bib title or null>"}

Matching ignores case, LaTeX braces and punctuation, and also accepts a prefix match (≥ 40 chars)
so subtitles don't cause misses. The bib is downloaded once per run with curl.
"""
import json
import re
import subprocess
import sys

BIB_URL = "https://raw.githubusercontent.com/LouisDo2108/Zotero-DB/main/My%20Library.bib"


def norm(s):
    s = re.sub(r"^\s*\{?\[[^\]]*\]\}?\s*", "", s)  # drop the [VENUE'YY] prefix used in titles
    s = re.sub(r"\\[a-zA-Z]+", "", s)
    return re.sub(r"[^a-z0-9]", "", s.lower())


def main():
    r = subprocess.run(["curl", "-sSfL", "--max-time", "60", BIB_URL], capture_output=True, check=False)
    if r.returncode != 0:
        print(json.dumps({"error": "could not download the Zotero bib"}))
        return
    bib = r.stdout.decode("utf-8", "replace")
    titles = []
    for m in re.finditer(r"^\s*title\s*=\s*\{(.*)\},?\s*$", bib, flags=re.M):
        raw = m.group(1)
        titles.append((norm(raw), re.sub(r"[{}]", "", raw)))
    for q in sys.argv[1:]:
        nq = norm(q)
        hit = next((t for n, t in titles if n == nq or (len(nq) >= 40 and (n.startswith(nq[:40]) or nq.startswith(n[:40]) and len(n) >= 40))), None)
        print(json.dumps({"title": q, "in_zotero": hit is not None, "match": hit}, ensure_ascii=False))


if __name__ == "__main__":
    main()
