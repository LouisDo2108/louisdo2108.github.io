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
})();
