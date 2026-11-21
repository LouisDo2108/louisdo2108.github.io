#!/usr/bin/env python3
"""Add arXiv papers to my Zotero library and append them to the Zotero-DB BibTeX backup.

Usage:
    python3 scripts/zotero_add.py [--backup <path to My Library.bib>] [--collection "Paper digest"] \
        <arxiv_id>[=<venue>] [<arxiv_id>[=<venue>] ...]

The Zotero API key is read from the macOS Keychain (service "zotero-api-key") and is never printed.
Store it once with:   security add-generic-password -a "$USER" -s zotero-api-key -w
(macOS then prompts for the key, so it never appears in shell history.)

For each id: skips it if the title is already in the library, otherwise creates a `preprint`
item (or `conferencePaper` when a venue is given) from arXiv metadata and files it in the collection.
With --backup, it then waits (up to ~4 min) for Zotero desktop to sync the new items and rewrites the
backup file with the full Better BibTeX export of the library (needs Zotero + Better BibTeX running).
Prints one JSON line per paper plus a final summary line. Standard library + curl only.
"""
import json
import re
import subprocess
import sys
import urllib.parse
import xml.etree.ElementTree as ET

API = "https://api.zotero.org"
ATOM = "{http://www.w3.org/2005/Atom}"


def keychain_key():
    r = subprocess.run(["security", "find-generic-password", "-s", "zotero-api-key", "-w"],
                       capture_output=True, text=True, check=False)
    return r.stdout.strip() if r.returncode == 0 else ""


def curl(url, key=None, method="GET", data=None, accept_json=True):
    cmd = ["curl", "-sS", "--max-time", "60", "-X", method, "-w", "\n%{http_code}", url,
           "-H", "Zotero-API-Version: 3"]
    if key:
        # pass the key via stdin config so it never shows up in the process list
        cmd += ["-K", "-"]
    if data is not None:
        cmd += ["-H", "Content-Type: application/json", "--data-binary", "@-" if not key else data]
    stdin = f'header = "Zotero-API-Key: {key}"\n' if key else (data if data is not None else None)
    r = subprocess.run(cmd, input=stdin, capture_output=True, text=True, check=False)
    body, _, code = r.stdout.rpartition("\n")
    if accept_json:
        try:
            return int(code or 0), json.loads(body) if body.strip() else None
        except json.JSONDecodeError:
            return int(code or 0), body
    return int(code or 0), body


def norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())


def arxiv_meta(aid):
    r = subprocess.run(["curl", "-sSfL", "--max-time", "30", f"https://export.arxiv.org/api/query?id_list={aid}"],
                       capture_output=True, check=False)
    if r.returncode != 0:
        return None
    root = ET.fromstring(r.stdout)
    e = root.find(f"{ATOM}entry")
    if e is None or e.find(f"{ATOM}title") is None:
        return None
    clean = lambda s: re.sub(r"\s+", " ", s or "").strip()  # noqa: E731
    return {
        "title": clean(e.findtext(f"{ATOM}title")),
        "abstract": clean(e.findtext(f"{ATOM}summary")),
        "date": (e.findtext(f"{ATOM}published") or "")[:10],
        "authors": [clean(a.findtext(f"{ATOM}name")) for a in e.findall(f"{ATOM}author")],
    }


def creator(name):
    parts = name.rsplit(" ", 1)
    if len(parts) == 2:
        return {"creatorType": "author", "firstName": parts[0], "lastName": parts[1]}
    return {"creatorType": "author", "name": name}


def main():
    args = sys.argv[1:]
    backup = None
    collection_name = "Paper digest"
    if "--backup" in args:
        i = args.index("--backup"); backup = args[i + 1]; del args[i:i + 2]
    if "--collection" in args:
        i = args.index("--collection"); collection_name = args[i + 1]; del args[i:i + 2]
    if not args:
        print(json.dumps({"error": "give at least one arXiv id"})); return

    key = keychain_key()
    if not key:
        print(json.dumps({"error": "no Zotero API key in Keychain (service 'zotero-api-key')"})); return
    code, info = curl(f"{API}/keys/current", key=key)
    if code != 200 or not isinstance(info, dict) or "userID" not in info:
        print(json.dumps({"error": f"Zotero key check failed (HTTP {code})"})); return
    lib = f"{API}/users/{info['userID']}"
    if not info.get("access", {}).get("user", {}).get("write"):
        print(json.dumps({"error": "this Zotero key has no write access"})); return

    # collection (create if missing)
    coll_key = None
    code, colls = curl(f"{lib}/collections?limit=100", key=key)
    if code == 200 and isinstance(colls, list):
        coll_key = next((c["key"] for c in colls if c["data"]["name"] == collection_name), None)
    if not coll_key:
        code, res = curl(f"{lib}/collections", key=key, method="POST",
                         data=json.dumps([{"name": collection_name}]))
        if code == 200 and isinstance(res, dict) and res.get("successful"):
            coll_key = next(iter(res["successful"].values()))["key"]

    created = []
    for arg in args:
        aid, _, venue = arg.partition("=")
        if not re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", aid):
            print(json.dumps({"id": aid, "status": "skipped", "reason": "not an arXiv id"})); continue
        meta = arxiv_meta(aid)
        if not meta:
            print(json.dumps({"id": aid, "status": "error", "reason": "arXiv lookup failed"})); continue
        q = urllib.parse.quote(meta["title"][:80])
        code, hits = curl(f"{lib}/items?q={q}&qmode=titleCreatorYear&limit=10&itemType=-attachment", key=key)
        if code == 200 and isinstance(hits, list) and any(norm(h["data"].get("title", "")) == norm(meta["title"]) for h in hits):
            print(json.dumps({"id": aid, "title": meta["title"], "status": "already in Zotero"})); continue
        item = {
            "itemType": "conferencePaper" if venue else "preprint",
            "title": meta["title"],
            "creators": [creator(a) for a in meta["authors"]],
            "abstractNote": meta["abstract"],
            "date": meta["date"],
            "url": f"https://arxiv.org/abs/{aid}",
            "extra": f"arXiv: {aid}",
            "tags": [{"tag": "paper-digest"}],
            "collections": [coll_key] if coll_key else [],
        }
        if venue:
            item["proceedingsTitle"] = venue
        else:
            item.update({"repository": "arXiv", "archiveID": f"arXiv:{aid}"})
        code, res = curl(f"{lib}/items", key=key, method="POST", data=json.dumps([item]))
        if code == 200 and isinstance(res, dict) and res.get("successful"):
            k = next(iter(res["successful"].values()))["key"]
            created.append((k, meta["title"]))
            print(json.dumps({"id": aid, "title": meta["title"], "status": "added", "zotero_key": k}))
        else:
            print(json.dumps({"id": aid, "title": meta["title"], "status": "error", "reason": f"HTTP {code}"}))

    backup_status = "not requested"
    if backup:
        backup_status = bbt_backup(backup, [t for _, t in created])
    print(json.dumps({"summary": True, "added": len(created), "backup": backup_status, "collection": collection_name}))


def bbt_backup(path, new_titles, tries=16, wait=15):
    """Rewrite `path` with Better BibTeX's export once every new title shows up in it."""
    import time
    url = "http://127.0.0.1:23119/better-bibtex/export/library?/1/library.bibtex"
    want = {norm(t) for t in new_titles}
    for attempt in range(tries):
        r = subprocess.run(["curl", "-sSf", "--max-time", "60", url], capture_output=True, check=False)
        if r.returncode != 0:
            return "Better BibTeX not reachable (is Zotero desktop open?)"
        bib = r.stdout.decode("utf-8", "replace")
        titles = {norm(re.sub(r"[{}]", "", m)) for m in re.findall(r"^\s*title = \{(.*)\},?$", bib, flags=re.M)}
        if want <= titles and bib.lstrip().startswith("@"):
            with open(path, "w", encoding="utf-8") as f:
                f.write(bib)
            return f"written ({len(re.findall(r'^@', bib, flags=re.M))} entries)"
        time.sleep(wait)
    return "timed out waiting for Zotero desktop to sync the new items; backup not rewritten"


if __name__ == "__main__":
    main()
