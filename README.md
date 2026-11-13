# louisdo2108.github.io

Personal site of Tuan-Luc Huynh (Louis Do), built with [Zola](https://www.getzola.org), a fast static site generator written in Rust. It uses a hand-made dark theme with no JS framework and no Node build step.

## Quick start

```bash
# install Zola once (single binary): https://www.getzola.org/documentation/getting-started/installation/
#   macOS:  brew install zola
#   Linux:  download the release tarball, or `cargo install --locked zola`
zola serve        # http://127.0.0.1:1111 with live reload
zola build        # outputs to ./public
```

Pushing to `main` builds the site and deploys it to the `gh-pages` branch (`.github/workflows/gh-pages.yml`).
GitHub Pages should be set to **Deploy from a branch → `gh-pages` / root**.

## Where things live

| What you want to change | File |
|---|---|
| Name, role, links, nav | `config.toml` → `[extra]` |
| Home page intro paragraph | `content/_index.md` |
| Publications | `data/publications.toml` (`featured = true` shows it on the home page) |
| Focus cards, skills, experience, highlights, open-source projects | `data/profile.toml` |
| About page text | `content/about.md` |
| Blog posts / notes | `content/posts/<slug>/index.md` (+ images in the same folder) |
| CV | `static/files/cv.pdf` |
| Colours, fonts, spacing | `sass/main.scss` (tokens at the top) |
| Animations / small interactions | `static/js/site.js` |

## Writing a post

Create `content/posts/my-note/index.md`:

```toml
+++
title = "My note"
description = "One-line summary shown in lists and link previews."
date = 2026-11-13
[taxonomies]
tags = ["retrieval", "notes"]
[extra]
math = true      # enable KaTeX: $inline$ and $$display$$
# toc = false    # hide the table of contents
# cite = false   # hide the "cite this note" box
+++

Intro paragraph shown in the list.

<!-- more -->

## First section
...
```

Shortcodes:

```
{{ figure(src="plot.png", caption="Fig. 1. Something *interesting*.", width="70%") }}

{% note(kind="tip", title="Takeaway") %}
Markdown **inside** a callout. kind = note | tip | warn
{% end %}
```

Set `draft = true` in the front matter to keep a post out of the published site.
