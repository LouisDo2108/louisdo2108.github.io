#!/usr/bin/env python3
"""Add arXiv papers to my Zotero library, following my Zotero conventions, and refresh the BibTeX backup.

Usage:
    python3 scripts/zotero_add.py [--backup <path to My Library.bib>] [--no-push] <spec> [<spec> ...]
    python3 scripts/zotero_add.py --backup <path to My Library.bib>      (only refresh + push the backup)

Each <spec> is   <arxiv_id>|<venue>|<tags>|<collection>   (later fields optional, e.g. just the id):
    "2306.13649|ICLR'24|llm,distillation,gkd|Machine Learning / LLM Foundations"
    "2506.09985||ssl,video,v-jepa 2|Machine Learning / Computer Vision"      (arXiv-only)
    "2501.01234|ICML'26 Workshop|cl,peft|Continual Learning / PEFT for CL"

Conventions applied (see the zotero-conventions memory):
  * title       "[VENUE'YY] Original Title", or "[arxiv'YY] ..." when there is no venue
  * tags        lowercase; venue tag like "iclr24" (none for arXiv-only), plus "workshop" for workshops,
                plus the area / method / concept tags you pass. No arXiv auto-tags.
  * venue field conferenceName (conferences) or journalAbbreviation (journals) = short acronym
  * citationKey <lastname>_<first title words>_<venueyy>  (e.g. agarwal_onpolicydistillatio_iclr24)
  * collection  a leaf collection given by its full path ("Parent / Child"); parents and Cedar are refused

The Zotero API key is read from the macOS Keychain (service "zotero-api-key") and is never printed.
Store it once with:   security add-generic-password -a "$USER" -s zotero-api-key -w
(macOS then prompts for the key, so it never appears in shell history.)

Papers whose title is already in the library (ignoring the [VENUE'YY] prefix) are skipped.
With --backup, it then waits (up to ~4 min) for Zotero desktop to sync the new items and rewrites the
backup file with the full Better BibTeX export of the library (needs Zotero + Better BibTeX running).
If that file sits in a git repo (Zotero-DB) and the export changed it, the file is committed and pushed
to the repo's current branch; --no-push stops before the commit.
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
    s = re.sub(r"^\s*\{?\[[^\]]*\]\}?\s*", "", s)  # ignore the [VENUE'YY] title prefix
    return re.sub(r"[^a-z0-9]", "", s.lower())


JOURNALS = {"TMLR", "TPAMI", "JMLR", "TACL", "IJCV", "TIP", "TNNLS", "TKDE", "TOIS", "TMM", "TCSVT", "NMI"}


def parse_venue(venue, arxiv_date):
    """"ICLR'24" / "ICML'26 Workshop" / "" -> (prefix, acronym or None, year2, is_workshop, is_journal)."""
    if not venue:
        return f"arxiv'{arxiv_date[2:4]}", None, arxiv_date[2:4], False, False
    m = re.fullmatch(r"\s*([A-Za-z][\w&-]*)'(\d{2})(\s+Workshop)?\s*", venue)
    if not m:
        raise ValueError(f"venue must look like ICLR'24 or ICML'26 Workshop, got {venue!r}")
    acr, yy, ws = m.group(1), m.group(2), bool(m.group(3))
    return f"{acr}'{yy}" + (" Workshop" if ws else ""), acr, yy, ws, acr.upper() in JOURNALS


def citation_key(authors, title, venue_tag):
    last = authors[0].rsplit(" ", 1)[-1] if authors else "anon"
    words = "".join(re.sub(r"[^a-z0-9]", "", w.lower()) for w in title.split()[:3])[:19]
    return f"{re.sub(r'[^a-z]', '', last.lower())}_{words}_{venue_tag}"


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
    push = "--no-push" not in args
    args = [a for a in args if a != "--no-push"]
    if "--backup" in args:
        i = args.index("--backup"); backup = args[i + 1]; del args[i:i + 2]
    if not args and backup:
        status = bbt_backup(backup, [])
        if push and status.startswith("written"):
            status += "; " + git_publish(backup, [])
        print(json.dumps({"summary": True, "added": 0, "backup": status})); return
    if not args:
        print(json.dumps({"error": "give at least one spec: <arxiv_id>|<venue>|<tags>|<collection>"})); return

    key = keychain_key()
    if not key:
        print(json.dumps({"error": "no Zotero API key in Keychain (service 'zotero-api-key')"})); return
    code, info = curl(f"{API}/keys/current", key=key)
    if code != 200 or not isinstance(info, dict) or "userID" not in info:
        print(json.dumps({"error": f"Zotero key check failed (HTTP {code})"})); return
    lib = f"{API}/users/{info['userID']}"
    if not info.get("access", {}).get("user", {}).get("write"):
        print(json.dumps({"error": "this Zotero key has no write access"})); return

    # collections by full path; only leaves (no children) may be used
    code, colls = curl(f"{lib}/collections?limit=100", key=key)
    colls = colls if code == 200 and isinstance(colls, list) else []
    by_key = {c["key"]: c["data"] for c in colls}
    parents = {c["data"].get("parentCollection") for c in colls}

    def cpath(k):
        d = by_key[k]
        return (cpath(d["parentCollection"]) + " / " if d.get("parentCollection") else "") + d["name"]
    path_to_key = {cpath(k): k for k in by_key}

    created = []
    for spec in args:
        aid, venue, tags, coll = (spec.split("|") + ["", "", ""])[:4]
        aid, coll = aid.strip(), coll.strip()
        if not re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", aid):
            print(json.dumps({"id": aid, "status": "skipped", "reason": "not an arXiv id"})); continue
        coll_key = None
        if coll:
            coll_key = path_to_key.get(coll)
            reason = ("no such collection" if not coll_key else
                      "not a leaf collection" if coll_key in parents else
                      "Cedar is off limits" if coll.split(" / ")[0] == "Cedar" else "")
            if reason:
                print(json.dumps({"id": aid, "status": "skipped", "reason": f"{reason}: {coll}"}, ensure_ascii=False)); continue
        meta = arxiv_meta(aid)
        if not meta:
            print(json.dumps({"id": aid, "status": "error", "reason": "arXiv lookup failed"})); continue
        try:
            prefix, acr, yy, workshop, journal = parse_venue(venue.strip(), meta["date"])
        except ValueError as e:
            print(json.dumps({"id": aid, "status": "skipped", "reason": str(e)})); continue
        q = urllib.parse.quote(meta["title"][:80])
        code, hits = curl(f"{lib}/items?q={q}&qmode=titleCreatorYear&limit=10&itemType=-attachment", key=key)
        if code == 200 and isinstance(hits, list) and any(norm(h["data"].get("title", "")) == norm(meta["title"]) for h in hits):
            print(json.dumps({"id": aid, "title": meta["title"], "status": "already in Zotero"})); continue

        venue_tag = f"{acr.lower()}{yy}" if acr else f"arxiv{yy}"
        tag_list = ([venue_tag] if acr else []) + (["workshop"] if workshop else [])
        tag_list += [t.strip().lower() for t in tags.split(",") if t.strip()]
        tag_list = list(dict.fromkeys(tag_list))
        title = f"[{prefix}] {meta['title']}"
        item = {
            "itemType": "journalArticle" if journal else "conferencePaper" if acr else "preprint",
            "title": title,
            "creators": [creator(a) for a in meta["authors"]],
            "abstractNote": meta["abstract"],
            "date": meta["date"],
            "url": f"https://arxiv.org/abs/{aid}",
            "extra": f"arXiv: {aid}",
            "citationKey": citation_key(meta["authors"], meta["title"], venue_tag),
            "tags": [{"tag": t} for t in tag_list],
            "collections": [coll_key] if coll_key else [],
        }
        if journal:
            item["journalAbbreviation"] = acr
        elif acr:
            item["conferenceName"] = acr
        else:
            item.update({"repository": "arXiv", "archiveID": f"arXiv:{aid}"})
        code, res = curl(f"{lib}/items", key=key, method="POST", data=json.dumps([item]))
        if code == 200 and isinstance(res, dict) and res.get("successful"):
            k = next(iter(res["successful"].values()))["key"]
            created.append((k, meta["title"]))
            print(json.dumps({"id": aid, "title": title, "tags": tag_list, "collection": coll or None,
                              "status": "added", "zotero_key": k}, ensure_ascii=False))
        else:
            print(json.dumps({"id": aid, "title": title, "status": "error", "reason": f"HTTP {code}: {res}"}, ensure_ascii=False))

    backup_status = "not requested"
    if backup:
        backup_status = bbt_backup(backup, [t for _, t in created])
        if push and backup_status.startswith("written"):
            backup_status += "; " + git_publish(backup, [t for _, t in created])
    print(json.dumps({"summary": True, "added": len(created), "backup": backup_status}))


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


def git_publish(path, new_titles):
    """Commit and push `path` if it lives in a git repo and changed."""
    import os
    repo = os.path.dirname(os.path.abspath(path))
    git = lambda *a: subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True, check=False)  # noqa: E731
    if git("rev-parse", "--is-inside-work-tree").stdout.strip() != "true":
        return "not a git repo, not pushed"
    name = os.path.basename(path)
    if not git("status", "--porcelain", "--", name).stdout.strip():
        return "unchanged, nothing to push"
    if new_titles:
        shown = "; ".join(t[:60] for t in new_titles[:3]) + (f" (+{len(new_titles) - 3} more)" if len(new_titles) > 3 else "")
        msg = f"Update Better BibTeX export (added: {shown})"
    else:
        msg = "Update Better BibTeX export"
    r = git("add", "--", name)
    if r.returncode == 0:
        r = git("commit", "-q", "-m", msg, "--", name)
    if r.returncode != 0:
        return f"git commit failed: {(r.stderr or r.stdout).strip()[:200]}"
    r = git("push", "-q")
    if r.returncode != 0:
        return f"committed but push failed: {r.stderr.strip()[:200]}"
    return "committed and pushed " + git("rev-parse", "--short", "HEAD").stdout.strip()


if __name__ == "__main__":
    main()
