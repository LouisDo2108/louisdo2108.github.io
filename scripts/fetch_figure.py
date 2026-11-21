#!/usr/bin/env python3
"""Fetch a paper's key figure (architecture/overview, else Figure 1) from its arXiv HTML version.

Usage:
    python3 scripts/fetch_figure.py <arxiv_id> --list
        → JSON list of the paper's figures: [{"i": 0, "caption": "Figure 1: ..."}, ...]
    python3 scripts/fetch_figure.py <arxiv_id> <out_dir> <slug> [--pick N]
        → downloads figure N (default: first caption that looks like an architecture/overview,
          else the first figure) to <out_dir>/<slug>.<ext>, shrinks it to ≤1400 px on macOS,
          and prints {"file": ..., "caption": ..., "source": ...} or {"error": ...}.

Standard library + curl only (curl uses the system trust store).
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.parse

UA = "paper-digest-figure-fetcher/1.0"
KEYWORDS = ("architecture", "overview", "framework", "pipeline", "illustration of", "our method",
            "our approach", "the proposed", "model design", "schematic", "summary of our")


def get(url):
    r = subprocess.run(["curl", "-sSfL", "--max-time", "30", "-A", UA, "-w", "\n%{url_effective}", url],
                       capture_output=True, check=False)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.decode("utf-8", "replace").strip() or f"curl exit {r.returncode}")
    body, _, final = r.stdout.rpartition(b"\n")
    return final.decode(), body


def clean(s):
    # keep math as its alt text so captions like "MRL is adaptable" don't lose words
    def tex(m):
        t = html.unescape(m.group(1)).replace("~", " ")
        t = re.sub(r"\\(?:rm|text|mathrm|mathbf|mathcal|textbf|textit|it|bf)\b", "", t)
        t = re.sub(r"\\[a-zA-Z]+", "", t)
        return re.sub(r"[{}\\]", "", t)
    s = re.sub(r"<math[^>]*alttext=\"([^\"]*)\"[^>]*>.*?</math>", tex, s, flags=re.S)
    s = re.sub(r"<math.*?</math>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def figures_for(arxiv_id):
    base, body = get(f"https://arxiv.org/html/{arxiv_id}")
    page = body.decode("utf-8", "replace")
    out = []
    for m in re.finditer(r"<figure[^>]*class=\"[^\"]*ltx_figure[^\"]*\"[^>]*>(.*?)</figure>", page, flags=re.S):
        block = m.group(1)
        cap_m = re.search(r"<figcaption[^>]*>(.*?)</figcaption>", block, flags=re.S)
        caption = clean(cap_m.group(1)) if cap_m else ""
        if not caption.lower().startswith("figure"):
            continue
        imgs = [i for i in re.findall(r"<img[^>]*src=\"([^\"]+)\"", block)
                if not i.startswith("data:") and "static.arxiv.org" not in i]
        if imgs:
            out.append({"caption": caption, "src": imgs[0]})
    return base, out


def resolve(base, arxiv_id, src):
    # Paths are either "<id>vN/figs/x.png" (relative to /html/) or "x1.png" (relative to the paper dir).
    if src.startswith(arxiv_id.split("v")[0]):
        return urllib.parse.urljoin("https://arxiv.org/html/", src)
    return urllib.parse.urljoin(base if base.endswith("/") else base + "/", src)


def main():
    args = sys.argv[1:]
    if not args or not re.fullmatch(r"\d{4}\.\d{4,5}(v\d+)?", args[0]):
        print(json.dumps({"error": "first argument must be a new-style arXiv id"}))
        return
    arxiv_id = args[0]
    try:
        base, figs = figures_for(arxiv_id)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"error": f"no arXiv HTML: {e}"}))
        return
    if "--list" in args:
        print(json.dumps([{"i": i, "caption": f["caption"][:200]} for i, f in enumerate(figs)], ensure_ascii=False))
        return
    if len(args) < 3:
        print(json.dumps({"error": "usage: fetch_figure.py <arxiv_id> <out_dir> <slug> [--pick N]"}))
        return
    out_dir, slug = args[1], re.sub(r"[^a-z0-9-]", "-", args[2].lower())
    if not figs:
        print(json.dumps({"error": "no figure images in arXiv HTML"}))
        return
    if "--pick" in args:
        idx = int(args[args.index("--pick") + 1])
        if not 0 <= idx < len(figs):
            print(json.dumps({"error": f"--pick out of range (0..{len(figs) - 1})"}))
            return
        fig = figs[idx]
    else:
        fig = next((f for f in figs if any(k in f["caption"].lower() for k in KEYWORDS)), figs[0])
    url = resolve(base, arxiv_id, fig["src"])
    ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"):
        ext = ".png"
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, slug + ext)
    try:
        _, data = get(url)
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"error": f"image download failed: {e}"}))
        return
    with open(path, "wb") as f:
        f.write(data)
    if ext in (".png", ".jpg", ".jpeg") and shutil.which("sips"):
        subprocess.run(["sips", "-Z", "1400", path], capture_output=True, check=False)
    caption = fig["caption"]
    if len(caption) > 300:
        caption = caption[:297].rsplit(" ", 1)[0] + "…"
    print(json.dumps({"file": slug + ext, "caption": caption, "source": url}, ensure_ascii=False))


if __name__ == "__main__":
    main()
