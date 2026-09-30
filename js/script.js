/* ============================================================
   FARAH JEMAL — PORTFOLIO
   script.js — Comportements & micro-interactions
   ============================================================ */

(() => {
  'use strict';

  /* ── HELPERS ─────────────────────────────────────────────── */
  const qs  = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const lerp  = (a, b, t) => a + (b - a) * t;

  // localStorage peut lever une exception (navigation privée, file://…)
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  const isTouch = matchMedia('(pointer: coarse)').matches;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const state = { lang: 'fr', theme: 'light', menuOpen: false };

  // Textes d'interface non couverts par data-lang-* (attributs aria, etc.)
  const I18N = {
    fr: { toDark: 'Activer le mode sombre', toLight: 'Activer le mode clair',
          openMenu: 'Ouvrir le menu', closeMenu: 'Fermer le menu', view: 'VOIR' },
    en: { toDark: 'Switch to dark mode', toLight: 'Switch to light mode',
          openMenu: 'Open menu', closeMenu: 'Close menu', view: 'VIEW' }
  };

  function refreshAria() {
    const t = I18N[state.lang];
    qsa('.theme-toggle').forEach(b =>
      b.setAttribute('aria-label', state.theme === 'dark' ? t.toLight : t.toDark)
    );
    const toggle = qs('#navToggle');
    if (toggle) toggle.setAttribute('aria-label', state.menuOpen ? t.closeMenu : t.openMenu);
  }

  /* ============================================================
     1. THÈME CLAIR / SOMBRE  (avec transition douce au clic)
     ============================================================ */
  function initTheme() {
    const root = document.documentElement;
    const meta = qs('meta[name="theme-color"]');
    const media = matchMedia('(prefers-color-scheme: dark)');
    let animTimer;

    function apply(theme, persist, animate) {
      // Transition douce : uniquement lors d'un changement demandé par l'utilisateur
      if (animate && !reducedMotion) {
        root.classList.add('theme-anim');
        clearTimeout(animTimer);
        animTimer = setTimeout(() => root.classList.remove('theme-anim'), 600);
      }
      state.theme = theme;
      root.setAttribute('data-theme', theme);
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#141110' : '#F0EDE8');
      if (persist) store.set('fj-theme', theme);
      refreshAria();
    }

    const saved = store.get('fj-theme');
    apply(
      saved === 'dark' || saved === 'light' ? saved : (media.matches ? 'dark' : 'light'),
      false,
      false
    );

    qsa('.theme-toggle').forEach(b =>
      b.addEventListener('click', () => apply(state.theme === 'dark' ? 'light' : 'dark', true, true))
    );

    // Suit le réglage du système tant que l'utilisateur n'a rien choisi
    const onSystemChange = (e) => {
      if (!store.get('fj-theme')) apply(e.matches ? 'dark' : 'light', false, true);
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  /* ============================================================
     2. LOADER
     ============================================================ */
  function initLoader() {
    const loader   = qs('#loader');
    const numEl    = qs('#loaderNum');
    const fillEl   = qs('#loaderFill');
    const revealEl = qs('#loaderReveal');
    if (!loader) return;

    document.body.style.overflow = 'hidden';

    const duration = reducedMotion ? 200 : 1400;
    const start = performance.now();

    function tick(now) {
      const t = clamp((now - start) / duration, 0, 1);
      const progress = Math.floor(t * 100);
      numEl.textContent = String(progress).padStart(2, '0');
      fillEl.style.width = progress + '%';
      if (t < 1) requestAnimationFrame(tick);
      else finish();
    }

    function finish() {
      loader.classList.add('done');
      revealEl.style.transition = 'transform .7s cubic-bezier(.76,0,.24,1)';
      revealEl.style.transform = 'scaleY(1)';
      setTimeout(() => {
        loader.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.add('is-loaded');
        playHeroIntro();
      }, reducedMotion ? 0 : 720);
    }

    requestAnimationFrame(tick);
  }

  /* ============================================================
     3. CURSEUR PERSONNALISÉ
        - « VOIR » sur les cartes projet
        - anneau de survol normal sur les liens (dont les liens
          « Voir le code / démo » à l'intérieur des cartes)
     ============================================================ */
  function initCursor() {
    const cursor = qs('#cursor');
    if (!cursor || isTouch) return;

    const dot   = qs('.cursor__dot', cursor);
    const ring  = qs('.cursor__ring', cursor);
    const label = qs('.cursor__label', cursor);

    document.body.classList.add('has-cursor'); // masque le curseur natif seulement maintenant

    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;

    addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cursor.classList.add('is-active');
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
    });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-active'));

    (function raf() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform  = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      label.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(raf);
    })();

    const hoverables = 'a, button, .magnetic, input, textarea';
    let lastTarget = null;

    // Recalcule l'état du curseur selon l'élément survolé
    function updateState(target) {
      if (!target || !target.closest) return;
      lastTarget = target;
      const overLink  = target.closest('.project__links a');
      const project   = !overLink && target.closest('[data-cursor="view"]');
      const hoverable = target.closest(hoverables);

      cursor.classList.toggle('is-project', !!project);
      cursor.classList.toggle('is-hovering', !project && !!hoverable);
      if (project) label.textContent = I18N[state.lang].view;
    }

    document.addEventListener('mouseover', (e) => updateState(e.target));

    addEventListener('mousedown', () => cursor.classList.add('is-hovering'));
    addEventListener('mouseup', () => updateState(lastTarget));
  }

  /* ============================================================
     4. SCROLL PROGRESS
     ============================================================ */
  function initScrollProgress() {
    const bar = qs('#scrollProgress');
    if (!bar) return;
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============================================================
     5. NAV — état scrolled, lien actif, menu mobile
     ============================================================ */
  function initNav() {
    const nav = qs('#nav');
    const toggle = qs('#navToggle');
    const mobile = qs('#mobileMenu');
    if (!nav) return;

    const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && mobile) {
      const setMenu = (open) => {
        state.menuOpen = open;
        toggle.classList.toggle('open', open);
        mobile.classList.toggle('open', open);
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        mobile.setAttribute('aria-hidden', String(!open));
        document.body.style.overflow = open ? 'hidden' : '';
        refreshAria();
      };
      toggle.addEventListener('click', () => setMenu(!state.menuOpen));
      qsa('.mobile-link', mobile).forEach(link => link.addEventListener('click', () => setMenu(false)));
      addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.menuOpen) { setMenu(false); toggle.focus(); }
      });
      // Si on repasse en grand écran menu ouvert, on le referme
      matchMedia('(min-width: 901px)').addEventListener?.('change', (e) => {
        if (e.matches && state.menuOpen) setMenu(false);
      });
    }

    // Lien actif au scroll
    const links = qsa('.nav__link[data-section]');
    const sections = links.map(l => qs('#' + l.dataset.section)).filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = entry.target.id;
          links.forEach(l => l.classList.toggle('active', l.dataset.section === id));
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(s => obs.observe(s));
    }

    // Scroll fluide en tenant compte de la nav fixe
    qsa('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (!href || href.length < 2) return; // ignore href="#" seul
        const target = qs(href);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + scrollY - nav.offsetHeight + 1;
        scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    });
  }

  /* ============================================================
     6. LANGUE FR / EN  (traduit aussi le menu, desktop + mobile)
     ============================================================ */
  function initLanguage() {
    const btns = qsa('.lang-btn');
    if (!btns.length) return;

    function apply(lang) {
      state.lang = lang;
      document.documentElement.lang = lang;
      document.body.dataset.lang = lang;

      const attr = lang === 'fr' ? 'langFr' : 'langEn';
      qsa('[data-lang-fr]').forEach(el => {
        const val = el.dataset[attr];
        if (val !== undefined) el.innerHTML = val;
      });

      btns.forEach(b => {
        const active = b.dataset.lang === lang;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
      });

      store.set('fj-lang', lang);
      updateRoles();
      refreshAria();
    }

    btns.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.lang !== state.lang) apply(b.dataset.lang);
    }));

    const saved = store.get('fj-lang');
    const browserLang = (navigator.language || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
    const initial = saved === 'en' || saved === 'fr' ? saved : browserLang;
    if (initial !== 'fr') apply(initial);
    else refreshAria();
  }

  /* ============================================================
     7. HERO — split chars + rôle rotatif
     ============================================================ */
  function splitChars() {
    qsa('.split-chars').forEach(word => {
      const text = word.textContent;
      word.textContent = '';
      text.split('').forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'char';
        span.style.transitionDelay = `${i * 0.035}s`;
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        word.appendChild(span);
      });
    });
  }

  function playHeroIntro() {
    qsa('.char').forEach(c => c.classList.add('visible'));
    qsa('#hero .reveal-fade').forEach((el, i) => {
      el.style.transitionDelay = `${0.3 + i * 0.08}s`;
      el.classList.add('visible');
    });
  }

  const ROLES = {
    fr: ['Business Intelligence', 'Data Analyst', 'UI/UX Design', 'Intelligence Artificielle'],
    en: ['Business Intelligence', 'Data Analyst', 'UI/UX Design', 'Artificial Intelligence']
  };
  let roleIndex = 0, roleTimer = null;

  function updateRoles() {
    const el = qs('#roleRotating');
    if (!el) return;
    el.style.transition = 'opacity .35s ease, transform .35s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    roleIndex = 0;
    el.textContent = ROLES[state.lang][0];
    clearInterval(roleTimer);
    if (reducedMotion) return;
    roleTimer = setInterval(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => {
        roleIndex = (roleIndex + 1) % ROLES[state.lang].length;
        el.textContent = ROLES[state.lang][roleIndex];
        el.style.transform = 'translateY(-6px)';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        });
      }, 350);
    }, 2600);
  }

  /* ============================================================
     8. REVEAL ON SCROLL
     ============================================================ */
  function initReveals() {
    const els = qsa('.reveal-fade, .reveal-up, .reveal-project');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    els.forEach(el => {
      if (el.closest('#hero')) return; // géré par playHeroIntro()
      obs.observe(el);
    });
  }

  /* ============================================================
     9. STATS — compteurs animés
     ============================================================ */
  function initStats() {
    const nums = qsa('.stat__num[data-target]');
    if (!nums.length) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.target, 10) || 0;
      if (reducedMotion) { el.textContent = target; return; }
      const duration = 1200;
      const start = performance.now();
      function step(now) {
        const t = clamp((now - start) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(lerp(0, target, eased));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(animate); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    nums.forEach(n => obs.observe(n));
  }

  /* ============================================================
     10. MANIFESTO — mise en lumière mot par mot
     ============================================================ */
  function initManifesto() {
    const el = qs('#manifestoText');
    const section = qs('#manifesto');
    if (!el || !section) return;

    const wrapWords = () => {
      const text = el.textContent.trim();
      el.innerHTML = text.split(/(\s+)/).map(chunk =>
        /^\s+$/.test(chunk) ? chunk : `<span class="w">${chunk}</span>`
      ).join('');
    };
    wrapWords();

    function onScroll() {
      const rect = section.getBoundingClientRect();
      const progress = clamp((innerHeight - rect.top) / (rect.height + innerHeight * 0.4), 0, 1);
      const list = qsa('.w', el);
      const litCount = Math.round(progress * list.length);
      list.forEach((w, i) => w.classList.toggle('lit', i < litCount));
    }

    addEventListener('scroll', onScroll, { passive: true });
    addEventListener('resize', onScroll);
    onScroll();

    // Re-découpe en mots quand le changement de langue réécrit le texte
    new MutationObserver(() => {
      if (qsa('.w', el).length) return;
      wrapWords();
      onScroll();
    }).observe(el, { childList: true });
  }

  /* ============================================================
     11. TIMELINE — ligne qui se déploie
     ============================================================ */
  function initTimeline() {
    const timeline = qs('.timeline');
    const line = qs('.timeline__line');
    if (!timeline || !line) return;

    if (!('IntersectionObserver' in window)) { line.classList.add('visible'); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { line.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.2 });
    obs.observe(timeline);
  }

  /* ============================================================
     12. ÉLÉMENTS MAGNÉTIQUES
     ============================================================ */
  function initMagnetic() {
    if (isTouch || reducedMotion) return;
    qsa('.magnetic').forEach(el => {
      const strength = 0.35;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = 'translate(0,0)'; });
    });
  }

  /* ============================================================
     13. PROJETS — inclinaison 3D au survol (mode clair, souris)
         Les variables --rx / --ry sont lues par le CSS
         ([data-theme="light"] .project__visual)
     ============================================================ */
  function initProjectTilt() {
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || reducedMotion) return;

    const MAX = 8; // inclinaison maximale en degrés

    qsa('.project__visual').forEach(el => {
      el.addEventListener('mousemove', (e) => {
        if (state.theme !== 'light') return; // effet réservé au mode clair
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width  - 0.5;
        const y = (e.clientY - r.top)  / r.height - 0.5;
        el.style.setProperty('--ry', (x * MAX).toFixed(2) + 'deg');
        el.style.setProperty('--rx', (-y * MAX).toFixed(2) + 'deg');
      });
      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ============================================================
     14. HERO CANVAS — particules discrètes
         (pause hors écran / onglet caché, resize « debounced »)
     ============================================================ */
  function initHeroCanvas() {
    const canvas = qs('#heroCanvas');
    const hero = qs('#hero');
    if (!canvas || !hero || isTouch) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, particles = [], running = false, visible = true;

    function resize() {
      w = canvas.width  = hero.offsetWidth  * dpr;
      h = canvas.height = hero.offsetHeight * dpr;
      canvas.style.width  = hero.offsetWidth  + 'px';
      canvas.style.height = hero.offsetHeight + 'px';
      const count = Math.min(70, Math.floor((hero.offsetWidth * hero.offsetHeight) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: (Math.random() * 1.4 + 0.4) * dpr
      }));
      if (reducedMotion) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(201,168,130,0.55)';
      particles.forEach(p => {
        if (!reducedMotion) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = 'rgba(201,168,130,0.5)';
      ctx.lineWidth = 1;
      const maxD = 110 * dpr;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxD) {
            ctx.globalAlpha = (1 - dist / maxD) * 0.25;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    function loop() {
      if (!running) return;
      draw();
      requestAnimationFrame(loop);
    }
    function update() {
      const shouldRun = visible && !document.hidden && !reducedMotion;
      if (shouldRun && !running) { running = true; loop(); }
      else if (!shouldRun) running = false;
    }

    resize();
    let resizeTimer;
    addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 150); });
    document.addEventListener('visibilitychange', update);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update(); }).observe(hero);
    }
    update();
  }

  /* ============================================================
     15. CV — le PDF suit la langue choisie (FR / EN)
         + téléchargement forcé sur l'ordinateur
     ============================================================ */
  function initCV() {
    const frame = qs('#cvFrame');
    const view  = qs('#cvView');
    const dl    = qs('#cvDownload');
    if (!dl) return;

    const FILES = {
      fr: { url: 'assets/cv/farah-jemal-cv-fr.pdf', name: 'Farah-Jemal-CV-FR.pdf' },
      en: { url: 'assets/cv/farah-jemal-cv-fr.pdf', name: 'Farah-Jemal-CV-FR.pdf' }
    };

    const current = () => FILES[document.documentElement.lang === 'en' ? 'en' : 'fr'];

    function save(href, name) {
      const a = document.createElement('a');
      a.href = href;
      a.download = name;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }

    function sync() {
      const { url, name } = current();
      dl.href = url;
      dl.setAttribute('download', name);
      if (view) view.href = url;
      if (frame) {
        const src = url + '#toolbar=0&navpanes=0&view=FitH';
        if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
      }
    }

    dl.addEventListener('click', async (e) => {
      if (location.protocol === 'file:') {
        console.warn('[CV] Site ouvert en file:// : téléchargement forcé impossible. Utilise Live Server ou le site publié.');
        return; // comportement natif du lien
      }
      e.preventDefault();
      const { url, name } = current();
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        const type = res.headers.get('content-type') || '';
        if (!res.ok) throw new Error('Fichier introuvable (HTTP ' + res.status + ') : ' + url);
        if (type.includes('text/html')) throw new Error('Le serveur renvoie une page HTML au lieu du PDF : ' + url);

        const pdf = new Blob([await res.blob()], { type: 'application/pdf' });
        const objectUrl = URL.createObjectURL(pdf);
        save(objectUrl, name);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      } catch (err) {
        console.error('[CV] ' + err.message);
        location.assign(url); // affiche la vraie erreur au lieu d'enregistrer un faux PDF
      }
    });

    sync();
    new MutationObserver(sync).observe(document.documentElement, {
      attributes: true, attributeFilter: ['lang']
    });
  }

  /* ============================================================
     INIT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    splitChars();
    initTheme();
    initLoader();
    initCursor();
    initScrollProgress();
    initNav();
    initLanguage();
    initCV();
    initReveals();
    initStats();
    initManifesto();
    initTimeline();
    initMagnetic();
    initProjectTilt();
    initHeroCanvas();
    updateRoles();

    // Si le loader n'existe pas, jouer l'intro directement
    if (!qs('#loader')) playHeroIntro();
  });
})();