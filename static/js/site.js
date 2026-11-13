// Small, dependency-free enhancements. Everything degrades gracefully without JS.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // ── Reveal on scroll ───────────────────────────────────────
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
    // stagger siblings slightly
    reveals.forEach((el) => {
      const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
      el.style.setProperty("--d", `${Math.min(sibs.indexOf(el), 6) * 60}ms`);
      io.observe(el);
    });
  } else {
    reveals.forEach((el) => el.classList.add("in"));
  }

  // ── Header border on scroll ────────────────────────────────
  const header = document.querySelector(".site-header");
  const onScroll = () => header && header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ── Cursor glow + card spotlight (desktop only) ────────────
  if (finePointer && !reduceMotion) {
    let raf = 0, mx = 0, my = 0;
    window.addEventListener("pointermove", (e) => {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(() => {
        document.body.style.setProperty("--mx", `${mx}px`);
        document.body.style.setProperty("--my", `${my}px`);
        raf = 0;
      });
    }, { passive: true });
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--x", `${e.clientX - r.left}px`);
        card.style.setProperty("--y", `${e.clientY - r.top}px`);
      });
    });
  }

  // ── Publication filters ────────────────────────────────────
  const filters = document.querySelectorAll(".filter");
  if (filters.length) {
    const pubs = document.querySelectorAll(".pub");
    const groups = document.querySelectorAll(".year-group");
    filters.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => { b.classList.toggle("active", b === btn); b.setAttribute("aria-pressed", b === btn); });
      pubs.forEach((p) => p.classList.toggle("hidden", f !== "all" && !p.dataset.topics.split(" ").includes(f)));
      groups.forEach((g) => g.classList.toggle("hidden", !g.querySelector(".pub:not(.hidden)")));
    }));
  }

  // ── Copy buttons on code blocks ────────────────────────────
  document.querySelectorAll(".prose pre, .cite pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.className = "copy-btn"; btn.type = "button"; btn.textContent = "copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector("code")?.innerText ?? pre.innerText);
        btn.textContent = "copied ✓";
      } catch { btn.textContent = "failed"; }
      setTimeout(() => (btn.textContent = "copy"), 1400);
    });
    pre.appendChild(btn);
  });

  // ── Reading progress + active TOC entry ────────────────────
  const bar = document.getElementById("progress-bar");
  const article = document.querySelector(".post-article");
  if (bar && article) {
    const update = () => {
      const r = article.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(Math.max(-r.top / total, 0), 1) : 1;
      bar.style.width = `${p * 100}%`;
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }
  const tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const map = new Map();
    tocLinks.forEach((a) => {
      const el = document.getElementById(decodeURIComponent(a.hash.slice(1)));
      if (el) map.set(el, a);
    });
    const tio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("active"));
          map.get(e.target)?.classList.add("active");
        }
      });
    }, { rootMargin: "-80px 0px -70% 0px" });
    map.forEach((_, el) => tio.observe(el));
  }

  // ── Hero: a slowly drifting "embedding space" ──────────────
  const canvas = document.getElementById("embedding-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const palette = ["94,234,212", "165,180,252", "252,211,77"];
    let W = 0, H = 0, dpr = 1, pts = [], running = false, t = 0;
    const centers = [[0.3, 0.35], [0.7, 0.32], [0.5, 0.72]];

    const seed = () => {
      pts = [];
      const n = Math.round(Math.min(W, H) / 4.5);
      for (let i = 0; i < n; i++) {
        const c = i % 3;
        const ang = Math.random() * Math.PI * 2;
        const rad = Math.pow(Math.random(), 0.8) * 0.2;
        pts.push({
          c, ox: centers[c][0] + Math.cos(ang) * rad, oy: centers[c][1] + Math.sin(ang) * rad,
          ph: Math.random() * Math.PI * 2, sp: 0.25 + Math.random() * 0.5, r: 1 + Math.random() * 1.6,
        });
      }
    };
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed(); draw();
    };
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // clusters breathe & drift: a gentle nod to representation drift in continual learning
      const drift = Math.sin(t * 0.15) * 0.03;
      const P = pts.map((p) => {
        const cx = p.ox + Math.sin(t * p.sp + p.ph) * 0.012 + (p.c === 0 ? drift : p.c === 1 ? -drift : 0);
        const cy = p.oy + Math.cos(t * p.sp * 0.8 + p.ph) * 0.012 + (p.c === 2 ? drift * 0.6 : 0);
        return [cx * W, cy * H, p];
      });
      const maxD = Math.min(W, H) * 0.12;
      ctx.lineWidth = 0.6;
      for (let i = 0; i < P.length; i++) {
        for (let j = i + 1; j < P.length; j++) {
          const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1];
          const d = Math.hypot(dx, dy);
          if (d < maxD) {
            const same = P[i][2].c === P[j][2].c;
            ctx.strokeStyle = `rgba(${same ? palette[P[i][2].c] : "200,210,220"},${(1 - d / maxD) * (same ? 0.22 : 0.06)})`;
            ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
          }
        }
      }
      P.forEach(([x, y, p]) => {
        ctx.fillStyle = `rgba(${palette[p.c]},0.9)`;
        ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
      });
      // centroids
      centers.forEach(([cx, cy], k) => {
        const x = (cx + (k === 0 ? drift : k === 1 ? -drift : 0)) * W, y = (cy + (k === 2 ? drift * 0.6 : 0)) * H;
        ctx.strokeStyle = `rgba(${palette[k]},0.5)`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(t * 0.8 + k) * 1.5, 0, Math.PI * 2); ctx.stroke();
      });
    };
    const loop = () => {
      if (!running) return;
      t += 1 / 60; draw();
      requestAnimationFrame(loop);
    };
    resize();
    window.addEventListener("resize", () => { clearTimeout(canvas._rt); canvas._rt = setTimeout(resize, 150); });
    if (!reduceMotion && "IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => {
        const was = running; running = e.isIntersecting && !document.hidden;
        if (running && !was) requestAnimationFrame(loop);
      }).observe(canvas);
      document.addEventListener("visibilitychange", () => {
        const was = running; running = !document.hidden && canvas.getBoundingClientRect().bottom > 0;
        if (running && !was) requestAnimationFrame(loop);
      });
    }
  }
})();
