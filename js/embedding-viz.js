// ─────────────────────────────────────────────────────────────────────────────
//  Embedding-space explainer: continual classification vs. continual retrieval.
//
//  One shared "world" of image embeddings (squares) and caption embeddings
//  (circles), coloured by concept. When the encoder is updated on task t+1, every
//  old point drifts *inside its own cluster*: class decisions survive, but local
//  neighbourhoods get reshuffled — so cross-modal retrieval breaks.
//
//  Markup contract (see templates/index.html):
//    <div data-viz-group [data-autoplay="false"]>
//      <canvas data-mode="retrieval|classification"></canvas>   (1 or more)
//      [data-metric="r1|acc"] [data-bar="r1|acc"] [data-phase]   (optional HUD)
//      .viz-play  input.viz-range  .viz-toggle  .viz-tip          (optional controls)
//    </div>
//
//  Vanilla JS + 2D canvas, no dependencies. Pauses off-screen, honours
//  prefers-reduced-motion, and renders only when something changes.
// ─────────────────────────────────────────────────────────────────────────────
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const WX = 4 / 3;          // the world is [0, 4/3] × [0, 1]
  const LOOP = 17;           // seconds per autoplay loop
  const FONT = '500 10.5px "JetBrains Mono", ui-monospace, monospace';

  // ── Data ───────────────────────────────────────────────────────────────────
  const CONCEPTS = [
    { name: "woman", rgb: [167, 139, 250], c: [0.36, 0.33], task: 0, caps: [
      "A woman in a white dress sits (…)", "A sketch of a woman (…)",
      "A painting of a woman's face in blue and green (…)", "A portrait of a lady in a garden (…)",
      "A woman reading by the window (…)", "An old photo of a woman smiling (…)",
      "A woman holding an umbrella (…)"] },
    { name: "child", rgb: [94, 234, 212], c: [0.98, 0.29], task: 0, caps: [
      "A child running on the beach (…)", "A boy flying a red kite (…)",
      "Two kids reading a picture book (…)", "A toddler with a balloon (…)",
      "A girl drawing with crayons (…)", "A child in a yellow raincoat (…)",
      "Kids playing football in the park (…)"] },
    { name: "man", rgb: [252, 211, 77], c: [0.52, 0.76], task: 0, caps: [
      "A man riding a bicycle (…)", "An old fisherman at dawn (…)",
      "A man in a grey suit (…)", "A chef plating a dish (…)",
      "A man playing the violin (…)", "A hiker on a mountain ridge (…)",
      "A man reading a newspaper (…)"] },
    { name: "strawberries", rgb: [251, 113, 133], c: [1.07, 0.75], task: 1, caps: [
      "A painting of red strawberries (…)", "A bowl of fresh berries (…)",
      "A strawberry tart on a plate (…)", "Strawberries in a wicker basket (…)",
      "A field of strawberry plants (…)"] },
  ];

  // Deterministic randomness, so the layout is identical on every visit.
  function rng(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (r) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

  function buildWorld(seed) {
    const r = rng(seed), S = 0.072, pts = [];
    CONCEPTS.forEach((C, k) => {
      C.caps.forEach((text, i) => {
        const p0 = [C.c[0] + gauss(r) * S, C.c[1] + gauss(r) * S];
        const ang = r() * Math.PI * 2, off = 0.012 + r() * 0.008;
        const c0 = [p0[0] + Math.cos(ang) * off, p0[1] + Math.sin(ang) * off];
        // Where a naively fine-tuned encoder sends old data: same cluster (labels
        // survive), new spot inside it (neighbourhoods don't). New-task data is
        // learned by the new encoder, so it does not drift.
        let p1 = p0, c1 = c0;
        if (!C.task) {
          p1 = [C.c[0] + gauss(r) * S, C.c[1] + gauss(r) * S];
          c1 = [p1[0] + gauss(r) * 0.048, p1[1] + gauss(r) * 0.048];
        }
        const img = { k, type: "img", task: C.task, p0, p1, pos: [0, 0], vis: 1, text: `image · ${C.name} #${i + 1}` };
        const cap = { k, type: "cap", task: C.task, p0: c0, p1: c1, pos: [0, 0], vis: 1, text: `“${text}”` };
        img.pair = cap; cap.pair = img;
        pts.push(img, cap);
      });
    });
    return pts;
  }

  // ── Dynamics ───────────────────────────────────────────────────────────────
  const ease = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

  // a: encoder update (task t → t+1), b: new-task data present, g: consolidation
  function timeline(t) {
    if (t < 3)    return { a: 0, b: 0, g: 0, phase: 0 };
    if (t < 6.5)  { const u = ease((t - 3) / 3.5); return { a: u, b: u, g: 0, phase: 1 }; }
    if (t < 9.5)  return { a: 1, b: 1, g: 0, phase: 1 };
    if (t < 12.5) return { a: 1, b: 1, g: ease((t - 9.5) / 3), phase: 2 };
    if (t < 15.5) return { a: 1, b: 1, g: 1, phase: 2 };
    const u = ease((t - 15.5) / 1.5);
    return { a: 1 - u, b: 1 - u, g: 1 - u, phase: 3 };
  }
  const PHASES = [
    "task t · encoder after training",
    "task t+1 · naive fine-tuning",
    "task t+1 · with consolidation",
    "rewinding to task t",
  ];
  const phaseOf = (s) => (s.a < 0.04 ? 0 : s.g > 0.5 ? 2 : 1);

  function place(pts, s) {
    const d = s.a * (1 - 0.82 * s.g);           // effective drift
    const th = d * 0.13, cs = Math.cos(th), sn = Math.sin(th), cx = WX / 2, cy = 0.5;
    for (const p of pts) {
      if (p.task) { p.pos[0] = p.p0[0]; p.pos[1] = p.p0[1]; p.vis = s.b; continue; }
      const x = p.p0[0] + (p.p1[0] - p.p0[0]) * d - cx;
      const y = p.p0[1] + (p.p1[1] - p.p0[1]) * d - cy;
      p.pos[0] = cx + x * cs - y * sn;           // plus a slight global rotation
      p.pos[1] = cy + x * sn + y * cs;
      p.vis = 1;
    }
    return d;
  }

  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

  function centroids(pts, s) {
    const acc = CONCEPTS.map(() => [0, 0, 0]);
    for (const p of pts) {
      if (p.task && s.b < 0.35) continue;
      const A = acc[p.k]; A[0] += p.pos[0]; A[1] += p.pos[1]; A[2]++;
    }
    return acc.flatMap((A, k) => (A[2] ? [{ k, x: A[0] / A[2], y: A[1] / A[2] }] : []));
  }
  function nearestCentroid(cents, x, y) {
    let best = 0, bd = Infinity;
    for (let i = 0; i < cents.length; i++) {
      const d = (cents[i].x - x) ** 2 + (cents[i].y - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return cents[best].k;
  }
  function rankCaptions(pts, q) {
    return pts
      .filter((p) => p.type === "cap" && p.vis > 0.3)
      .map((p) => [d2(p.pos, q.pos), p])
      .sort((a, b) => a[0] - b[0])
      .map((e) => e[1]);
  }
  function metrics(pts, s) {
    const caps = pts.filter((p) => p.type === "cap" && p.vis > 0.3);
    const cents = centroids(pts, s);
    let hit = 0, n = 0, ok = 0, m = 0;
    for (const p of pts) {
      if (p.task) continue;
      m++; if (nearestCentroid(cents, p.pos[0], p.pos[1]) === p.k) ok++;
      if (p.type !== "img") continue;
      n++;
      let best = null, bd = Infinity;
      for (const c of caps) { const d = d2(c.pos, p.pos); if (d < bd) { bd = d; best = c; } }
      if (best === p.pair) hit++;
    }
    return { r1: hit / n, acc: ok / m, cents };
  }

  // Default query: an image whose caption is rank-1 at task t, lost after naive
  // fine-tuning, and recovered with consolidation (prefer the "woman" concept).
  function pickStoryQuery(pts) {
    const top1 = (q, s) => { place(pts, s); return rankCaptions(pts, q)[0] === q.pair; };
    const imgs = pts.filter((p) => p.type === "img" && !p.task).sort((a, b) => a.k - b.k);
    const pick = imgs.find((q) =>
      top1(q, { a: 0, b: 0, g: 0 }) && !top1(q, { a: 0.5, b: 1, g: 0 }) &&
      !top1(q, { a: 1, b: 1, g: 0 }) && top1(q, { a: 1, b: 1, g: 1 })) || imgs[0];
    place(pts, { a: 0, b: 0, g: 0 });
    return pick;
  }

  // ── Rendering helpers ──────────────────────────────────────────────────────
  const glowCache = new Map();
  function glow(rgb) {
    const key = rgb.join();
    if (glowCache.has(key)) return glowCache.get(key);
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${key},0.55)`); gr.addColorStop(0.35, `rgba(${key},0.16)`); gr.addColorStop(1, `rgba(${key},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    glowCache.set(key, c);
    return c;
  }
  // Keep the part of convex polygon `poly` that is closer to point a than to b.
  function clipHalfPlane(poly, a, b) {
    const nx = b[0] - a[0], ny = b[1] - a[1];
    const c = (b[0] * b[0] + b[1] * b[1] - a[0] * a[0] - a[1] * a[1]) / 2;
    const side = (p) => p[0] * nx + p[1] * ny - c;      // < 0 → closer to a
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
      if (sp <= 0) out.push(p);
      if ((sp < 0) !== (sq < 0)) {
        const t = sp / (sp - sq);
        out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    return out;
  }
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  function shape(ctx, p, x, y, size, fill) {
    ctx.beginPath();
    if (p.type === "img") ctx.rect(x - size, y - size, size * 2, size * 2);
    else ctx.arc(x, y, size * 0.92, 0, Math.PI * 2);
    fill ? ctx.fill() : ctx.stroke();
  }

  // ── A single canvas view ───────────────────────────────────────────────────
  class View {
    constructor(canvas, mode, group) {
      this.canvas = canvas; this.mode = mode; this.group = group;
      this.ctx = canvas.getContext("2d");
      this.ringR = 0; this.rankA = new Map();
      this.resize();
      new ResizeObserver(() => { this.resize(); group.dirty = true; }).observe(canvas);
    }
    resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.W = Math.max(r.width, 10); this.H = Math.max(r.height, 10);
      this.canvas.width = Math.round(this.W * dpr); this.canvas.height = Math.round(this.H * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.s = Math.min(this.W / WX, this.H) * 0.94;
      this.ox = (this.W - WX * this.s) / 2; this.oy = (this.H - this.s) / 2;
      this.size = Math.max(2.6, Math.min(4.2, this.s / 95));
    }
    sx(p) { return this.ox + p[0] * this.s; }
    sy(p) { return this.oy + p[1] * this.s; }
    pick(x, y, filter) {
      let best = null, bd = (this.size * 4) ** 2;
      for (const p of this.group.pts) {
        if (p.vis < 0.3 || (filter && !filter(p))) continue;
        const d = (this.sx(p.pos) - x) ** 2 + (this.sy(p.pos) - y) ** 2;
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }

    draw(time, drift, M) {
      const { ctx, W, H } = this;
      ctx.clearRect(0, 0, W, H);
      if (this.mode === "classification") this.drawField(M.cents);
      this.drawGhosts(drift);
      if (this.mode === "classification") this.drawClassification(time, M);
      else this.drawRetrieval(time);
    }

    // Voronoi regions of the class centroids, computed exactly: each region is
    // the (padded) canvas rectangle clipped by the half-planes "closer to me
    // than to centroid j" (Sutherland–Hodgman against one line at a time).
    drawField(cents) {
      const { ctx } = this, b = this.group.state.b, P = 40;
      const pts = cents.map((c) => [this.ox + c.x * this.s, this.oy + c.y * this.s]);
      cents.forEach((c, i) => {
        let poly = [[-P, -P], [this.W + P, -P], [this.W + P, this.H + P], [-P, this.H + P]];
        pts.forEach((q, j) => {
          if (j !== i) poly = clipHalfPlane(poly, pts[i], q);
        });
        if (poly.length < 3) return;
        const C = CONCEPTS[c.k], fade = C.task ? b : 1;
        ctx.beginPath();
        poly.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        const gr = ctx.createRadialGradient(pts[i][0], pts[i][1], 0, pts[i][0], pts[i][1], this.s * 0.55);
        gr.addColorStop(0, rgba(C.rgb, 0.11 * fade)); gr.addColorStop(1, rgba(C.rgb, 0.03 * fade));
        ctx.fillStyle = gr; ctx.fill();
        ctx.strokeStyle = rgba(C.rgb, 0.38 * fade); ctx.lineWidth = 1.2; ctx.stroke();
      });
      ctx.font = FONT; ctx.textAlign = "center";
      for (const c of cents) {
        const C = CONCEPTS[c.k];
        ctx.fillStyle = rgba(C.rgb, 0.8 * (C.task ? b : 1));
        ctx.fillText(`class: ${C.name}`, this.ox + c.x * this.s, this.oy + (c.y - 0.135) * this.s);
      }
    }

    // Faint copies at the task-t positions, joined to where they are now.
    drawGhosts(drift) {
      if (drift < 0.02) return;
      const { ctx, size } = this, a = Math.min(drift, 1);
      ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
      for (const p of this.group.pts) {
        if (p.task) continue;
        const rgb = CONCEPTS[p.k].rgb;
        const x0 = this.ox + p.p0[0] * this.s, y0 = this.oy + p.p0[1] * this.s;
        ctx.strokeStyle = rgba(rgb, 0.12 * a);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(this.sx(p.pos), this.sy(p.pos)); ctx.stroke();
        ctx.strokeStyle = rgba(rgb, 0.28 * a);
        shape(ctx, p, x0, y0, size * 0.85, false);
      }
      ctx.setLineDash([]);
    }

    drawPoint(p, alpha, scale = 1) {
      const { ctx } = this, rgb = CONCEPTS[p.k].rgb, x = this.sx(p.pos), y = this.sy(p.pos);
      const a = alpha * p.vis, R = this.size * 4.2 * scale;
      if (a <= 0.01) return;
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a * 0.8;
      ctx.drawImage(glow(rgb), x - R, y - R, R * 2, R * 2);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a;
      ctx.fillStyle = rgba(rgb, 1);
      shape(ctx, p, x, y, this.size * scale * (0.6 + 0.4 * p.vis), true);
      ctx.globalAlpha = 1;
    }

    drawQuery(q, time) {
      const { ctx } = this, x = this.sx(q.pos), y = this.sy(q.pos), r = this.size * 1.7;
      const pulse = this.group.playing ? (time * 0.9) % 1 : 0.35;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pulse)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 14, 0, Math.PI * 2); ctx.stroke();
      this.drawPoint(q, 1, 1.6);
      ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1.4;
      ctx.strokeRect(x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
    }

    drawClassification(time, M) {
      const q = this.group.query;
      for (const p of this.group.pts) this.drawPoint(p, p === q ? 0 : 0.85);
      this.drawQuery(q, time);
      const pred = nearestCentroid(M.cents, q.pos[0], q.pos[1]), ok = pred === q.k;
      this.label(this.sx(q.pos) + 14, this.sy(q.pos) - 12,
        `pred: ${CONCEPTS[pred].name} ${ok ? "✓" : "✗"}`, ok ? [94, 234, 212] : [251, 113, 133]);
    }

    drawRetrieval(time) {
      const { ctx } = this, g = this.group, q = g.query, qx = this.sx(q.pos), qy = this.sy(q.pos);
      const ranked = rankCaptions(g.pts, q), top = ranked.slice(0, 3);
      const qrgb = CONCEPTS[q.k].rgb;

      // top-k neighbourhood ring (smoothly follows the 3rd neighbour)
      const target = top.length ? Math.sqrt(d2(top[top.length - 1].pos, q.pos)) * this.s + this.size * 3 : 0;
      this.ringR += (target - this.ringR) * (reduceMotion ? 1 : 0.14);
      ctx.setLineDash([5, 5]); ctx.lineDashOffset = g.playing ? -time * 14 : 0;
      ctx.strokeStyle = rgba(qrgb, 0.75); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(qx, qy, this.ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // everything else, dimmed
      const focus = new Set([q, q.pair, ...top]);
      for (const p of g.pts) if (!focus.has(p)) this.drawPoint(p, 0.42);

      // rank lines fade in/out as neighbours enter/leave the top-k
      for (const p of g.pts) {
        if (p.type !== "cap") continue;
        const want = top.includes(p) ? 1 : 0, cur = this.rankA.get(p) || 0;
        const next = cur + (want - cur) * (reduceMotion ? 1 : 0.12);
        if (next < 0.01) { this.rankA.delete(p); continue; }
        this.rankA.set(p, next);
        ctx.strokeStyle = `rgba(255,255,255,${0.35 * next})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(this.sx(p.pos), this.sy(p.pos)); ctx.stroke();
      }

      // the correct caption: kept (✓) or lost (✗)
      const pair = q.pair, px = this.sx(pair.pos), py = this.sy(pair.pos), hit = top[0] === pair;
      if (!hit) {
        ctx.setLineDash([2, 3]); ctx.strokeStyle = "rgba(251,113,133,0.55)";
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(px, py); ctx.stroke();
        ctx.beginPath(); ctx.arc(px, py, this.size * 3, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      for (const p of top) this.drawPoint(p, 1, 1.15);
      if (!top.includes(pair)) this.drawPoint(pair, 1, 1.15);
      this.drawQuery(q, time);

      top.forEach((p, i) => {
        const x = this.sx(p.pos), y = this.sy(p.pos);
        this.badge(x + this.size * 2.6, y - this.size * 2.6, String(i + 1), p === pair);
      });
      this.label(px + this.size * 3.4, py + this.size * 4.6,
        hit ? "✓ correct caption @1" : "✗ correct caption lost",
        hit ? [94, 234, 212] : [251, 113, 133]);
    }

    badge(x, y, text, good) {
      const { ctx } = this;
      ctx.fillStyle = good ? "rgba(94,234,212,0.95)" : "rgba(231,233,236,0.92)";
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#0b0d10"; ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y + 0.5);
      ctx.textBaseline = "alphabetic";
    }

    label(x, y, text, rgb) {
      const { ctx } = this;
      ctx.font = FONT; ctx.textAlign = "left";
      const w = ctx.measureText(text).width + 12;
      x = Math.min(Math.max(x, 6), this.W - w - 6); y = Math.min(Math.max(y, 16), this.H - 8);
      ctx.fillStyle = "rgba(11,13,16,0.78)"; ctx.strokeStyle = rgba(rgb, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y - 13, w, 19, 5) : ctx.rect(x, y - 13, w, 19);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = rgba(rgb, 1); ctx.fillText(text, x + 6, y);
    }
  }

  // ── A group: shared world + views + controls ───────────────────────────────
  class Group {
    constructor(root) {
      this.root = root;
      this.pts = buildWorld(11);
      this.query = pickStoryQuery(this.pts);
      this.state = { a: 0, b: 0, g: 0 };
      this.target = { a: 0, b: 0, g: 0 };
      this.t = 0; this.visible = false; this.dirty = true; this.lastHud = 0; this.settle = 0;
      this.playing = !reduceMotion && root.dataset.autoplay !== "false";
      if (reduceMotion) Object.assign(this.state, this.target = { a: 0.9, b: 1, g: 0 });
      this.views = [...root.querySelectorAll("canvas[data-mode]")].map((c) => new View(c, c.dataset.mode, this));
      this.$ = (sel) => root.querySelectorAll(sel);
      this.tip = root.querySelector(".viz-tip");
      this.wire();
      new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.dirty = true; }).observe(root);
    }

    wire() {
      const play = this.root.querySelector(".viz-play");
      const range = this.root.querySelector(".viz-range");
      const toggle = this.root.querySelector(".viz-toggle");
      this.ui = { play, range, toggle };
      play?.addEventListener("click", () => this.setPlaying(!this.playing));
      range?.addEventListener("input", () => {
        this.setPlaying(false);
        const v = range.value / 1000;
        this.target.a = v; this.target.b = Math.min(1, v * 1.6);
        this.dirty = true;
      });
      toggle?.addEventListener("click", () => {
        this.setPlaying(false);
        this.target.g = this.target.g > 0.5 ? 0 : 1;
        if (this.target.a < 0.05) { this.target.a = 1; this.target.b = 1; }
        this.dirty = true;
      });
      this.setPlaying(this.playing);

      for (const v of this.views) {
        const cv = v.canvas, xy = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        cv.addEventListener("pointermove", (e) => {
          const [x, y] = xy(e), p = v.pick(x, y);
          cv.style.cursor = p && p.type === "img" ? "pointer" : "crosshair";
          if (!this.tip) return;
          if (!p) { this.tip.hidden = true; return; }
          const rr = this.root.getBoundingClientRect();
          this.tip.textContent = p.text + (p.type === "img" ? "  — click to query" : "");
          this.tip.style.left = `${e.clientX - rr.left + 14}px`;
          this.tip.style.top = `${e.clientY - rr.top + 14}px`;
          this.tip.hidden = false;
        });
        cv.addEventListener("pointerleave", () => { if (this.tip) this.tip.hidden = true; });
        cv.addEventListener("click", (e) => {
          const [x, y] = xy(e), p = v.pick(x, y, (p) => p.type === "img");
          if (p) { this.query = p; this.dirty = true; }
        });
      }
    }

    setPlaying(on) {
      this.playing = on && !reduceMotion;
      const { play } = this.ui;
      if (play) { play.textContent = this.playing ? "❚❚ pause" : "▶ play"; play.setAttribute("aria-pressed", String(this.playing)); }
      this.dirty = true;
    }

    tick(dt, now) {
      if (!this.visible) return;
      if (this.playing) {
        this.t = (this.t + dt) % LOOP;
        const T = timeline(this.t);
        this.target.a = T.a; this.target.b = T.b; this.target.g = T.g; this.phase = T.phase;
      }
      // ease the actual state toward the target; stop drawing once settled
      let moving = false;
      for (const k of ["a", "b", "g"]) {
        const diff = this.target[k] - this.state[k];
        if (Math.abs(diff) > 1e-3) { this.state[k] += reduceMotion ? diff : diff * 0.12; moving = true; }
        else this.state[k] = this.target[k];
      }
      // keep drawing a little after changes so ring/rank-line easing can finish
      if (moving || this.dirty) this.settle = 45;
      if (!this.playing && this.settle-- <= 0) return;
      this.dirty = false;

      const drift = place(this.pts, this.state);
      const M = metrics(this.pts, this.state);
      for (const v of this.views) v.draw(now / 1000, drift, M);
      if (now - this.lastHud > 90) { this.lastHud = now; this.hud(M); }
    }

    hud(M) {
      const pct = (x) => `${Math.round(x * 100)}%`;
      this.$('[data-metric="r1"]').forEach((el) => (el.textContent = pct(M.r1)));
      this.$('[data-metric="acc"]').forEach((el) => (el.textContent = pct(M.acc)));
      this.$('[data-bar="r1"]').forEach((el) => el.style.setProperty("--v", M.r1));
      this.$('[data-bar="acc"]').forEach((el) => el.style.setProperty("--v", M.acc));
      const phase = this.playing ? this.phase : phaseOf(this.state);
      this.$("[data-phase]").forEach((el) => (el.textContent = PHASES[phase ?? 0]));
      const { range, toggle } = this.ui;
      if (range && this.playing) range.value = Math.round(this.state.a * 1000);
      if (toggle) toggle.setAttribute("aria-pressed", String(this.target.g > 0.5));
    }
  }

  // ── Boot: one animation loop for every group on the page ───────────────────
  const groups = [...document.querySelectorAll("[data-viz-group]")].map((el) => new Group(el));
  if (!groups.length) return;
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!document.hidden) groups.forEach((g) => g.tick(dt, now));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // re-draw once web fonts arrive so canvas labels use them
  document.fonts?.ready.then(() => groups.forEach((g) => (g.dirty = true)));
})();
