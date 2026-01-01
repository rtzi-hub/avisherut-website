(function () {
  // ===== Helpers =====
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  function getFocusable(container) {
    return qsa(
      'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      container
    ).filter(el => el.offsetParent !== null);
  }

  function trapFocus(modalEl) {
    const focusables = getFocusable(modalEl);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    function onKeyDown(e) {
      if (e.key !== "Tab") return;
      if (!focusables.length) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    modalEl.addEventListener("keydown", onKeyDown);
    return () => modalEl.removeEventListener("keydown", onKeyDown);
  }

  // ===== Mobile Menu Modal =====
  const menuBtn = qs(".menuBtn");
  const modal = qs("#mobileMenu");
  const backdrop = qs(".modalBackdrop");
  let releaseTrap = null;
  let lastFocus = null;

  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    backdrop.hidden = false;
    menuBtn.setAttribute("aria-expanded", "true");

    releaseTrap = trapFocus(modal);
    const focusables = getFocusable(modal);
    (focusables[0] || modal).focus();
  }

  function closeModal() {
    modal.hidden = true;
    backdrop.hidden = true;
    menuBtn.setAttribute("aria-expanded", "false");

    if (releaseTrap) releaseTrap();
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  if (menuBtn) {
    menuBtn.addEventListener("click", () => (modal.hidden ? openModal() : closeModal()));
  }

  qsa("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
  if (backdrop) backdrop.addEventListener("click", closeModal);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal && !modal.hidden) closeModal();
      if (a11yPanel && !a11yPanel.hidden) closeA11y();
    }
  });

  // Close modal on clicking a link (single-page anchors)
  if (modal) {
    qsa('a[href^="#"]', modal).forEach(a => {
      a.addEventListener("click", () => closeModal());
    });
  }

  // ===== Smooth scroll (respect reduced motion) =====
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  qsa('a[href^="#"]').forEach(a => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const el = qs(id);
      if (!el) return;
      e.preventDefault();
      el.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
      if (id === "#main") el.focus({ preventScroll: true });
    });
  });

  // ===== WhatsApp lead form =====
  const form = qs("#leadForm");
  const hint = qs("#formHint");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = (qs("#name")?.value || "").trim();
      const phone = (qs("#phone")?.value || "").trim();
      const device = (qs("#device")?.value || "").trim();
      const msg = (qs("#msg")?.value || "").trim();

      // Minimal required validation
      if (!name || !phone) {
        if (hint) hint.textContent = "נא למלא שם וטלפון לחזרה.";
        (!name ? qs("#name") : qs("#phone")).focus();
        return;
      }

      const lines = [
        "היי אבי, אשמח לתאם ביקור טכנאי.",
        "שם: " + name,
        "טלפון לחזרה: " + phone,
        "מכשיר: " + (device || "(לא צוין)"),
        "פרטי תקלה: " + (msg || "(לא צוין)")
      ];

      const url = "https://wa.me/972522230741?text=" + encodeURIComponent(lines.join("\n"));
      const win = window.open(url, "_blank", "noopener,noreferrer");
      if (!win) window.location.href = url;

      if (hint) hint.textContent = "נפתח וואטסאפ עם הודעה מוכנה. אם לא נפתח, בדקו חסימת חלונות קופצים.";
    });
  }

  // ===== Accessibility Panel (optional) =====
  const a11yFab = qs(".a11yFab");
  const a11yPanel = qs("#a11yPanel");

  function applySettings(settings) {
    // Font scale
    document.documentElement.style.setProperty("--fontScale", String(settings.fontScale || 1));

    // Classes
    document.body.classList.toggle("high-contrast", !!settings.highContrast);
    document.body.classList.toggle("highlight-links", !!settings.highlightLinks);
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem("a11ySettings");
      if (!raw) return { fontScale: 1, highContrast: false, highlightLinks: false };
      const s = JSON.parse(raw);
      return {
        fontScale: typeof s.fontScale === "number" ? s.fontScale : 1,
        highContrast: !!s.highContrast,
        highlightLinks: !!s.highlightLinks
      };
    } catch {
      return { fontScale: 1, highContrast: false, highlightLinks: false };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem("a11ySettings", JSON.stringify(settings));
  }

  let settings = loadSettings();
  applySettings(settings);

  function openA11y() {
    a11yPanel.hidden = false;
    a11yFab.setAttribute("aria-expanded", "true");
    const focusables = getFocusable(a11yPanel);
    (focusables[0] || a11yPanel).focus();
  }

  function closeA11y() {
    a11yPanel.hidden = true;
    a11yFab.setAttribute("aria-expanded", "false");
    a11yFab.focus();
  }

  if (a11yFab && a11yPanel) {
    a11yFab.addEventListener("click", () => (a11yPanel.hidden ? openA11y() : closeA11y()));

    qsa("[data-close-a11y]").forEach(b => b.addEventListener("click", closeA11y));

    a11yPanel.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      if (btn.dataset.font === "inc") {
        settings.fontScale = Math.min(1.35, (settings.fontScale || 1) + 0.05);
      } else if (btn.dataset.font === "dec") {
        settings.fontScale = Math.max(0.9, (settings.fontScale || 1) - 0.05);
      } else if (btn.dataset.contrast === "toggle") {
        settings.highContrast = !settings.highContrast;
      } else if (btn.dataset.links === "toggle") {
        settings.highlightLinks = !settings.highlightLinks;
      } else if (btn.dataset.reset === "true") {
        settings = { fontScale: 1, highContrast: false, highlightLinks: false };
      } else {
        return;
      }

      saveSettings(settings);
      applySettings(settings);
    });
  }
})();