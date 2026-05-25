/**
 * feed.js – Fondation Tschuess
 * Nahtloser vertikaler Feed aus einzelnen HTML-Seiten.
 * Reihenfolge aus order.json. Schwarzer Trennbalken wie ein Filmstreifen.
 */

(function () {

  const ORDER_URL  = 'order.json';
  const BAR_HEIGHT = '10px';
  const BAR_COLOR  = '#000000';
  const PRELOAD    = '400px';    // wie früh die nächste Seite vorgeladen wird

  // ── Fixer ↵-Button ──────────────────────────────────────────────────────────
  function addIndexButton() {
    const btn = document.createElement('a');
    btn.href = 'index.html';
    btn.innerHTML = '&#8629;';
    btn.style.cssText = `
      position: fixed;
      top: ${BODY_PAD}px;
      right: ${BODY_PAD}px;
      color: #0000EE;
      font-size: 15px;
      font-family: Arial, Helvetica, sans-serif;
      text-decoration: none;
      z-index: 9999;
      line-height: 1;
    `;
    document.body.appendChild(btn);
  }

  // ── Nav ausblenden ──────────────────────────────────────────────────────────
  function hideNav() {
    const s = document.createElement('style');
    s.textContent = `nav { display: none !important; } footer { display: none !important; }`;
    document.head.appendChild(s);
  }

  // ── Trennbalken ─────────────────────────────────────────────────────────────
  function createBar() {
    const bar = document.createElement('div');
    bar.className = 'ft-bar';
    bar.style.cssText = `
      display: block;
      width: 100vw;
      height: ${BAR_HEIGHT};
      background: ${BAR_COLOR};
      flex-shrink: 0;
    `;
    return bar;
  }

  // ── Seiteninhalt aus HTML extrahieren ───────────────────────────────────────
  function extractBody(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.innerHTML;
  }

  // ── Block = Balken + Seiteninhalt ───────────────────────────────────────────
  function createBlock(slug, html) {
    const block = document.createElement('div');
    block.className = 'ft-block';
    block.dataset.slug = slug;

    const bar = createBar();
    const inner = document.createElement('div');
    inner.className = 'ft-inner';
    inner.innerHTML = extractBody(html);

    block.appendChild(bar);
    block.appendChild(inner);
    return block;
  }

  // ── Abschlussbalken (Anfang/Ende des Filmstreifens) ─────────────────────────
  function createEndBar() {
    const bar = createBar();
    bar.classList.add('ft-endbar');
    return bar;
  }

  // ── State ───────────────────────────────────────────────────────────────────
  let order       = [];
  let loadedSlugs = [];
  let loading     = false;
  let atStart     = false;   // Anfangsbalken bereits eingefügt
  let atEnd       = false;   // Endbalken bereits eingefügt
  let feed;

  // ── URL-Hilfsfunktionen ─────────────────────────────────────────────────────
  function currentSlug() {
    const seg = window.location.pathname.split('/').filter(Boolean).pop() || '';
    return seg.replace(/\.html$/, '');
  }

  function slugToUrl(slug) {
    const base = window.location.pathname.split('/').slice(0, -1).join('/');
    return base + '/' + slug;
  }

  function prevSlug(slug) {
    const i = order.indexOf(slug);
    return i > 0 ? order[i - 1] : null;
  }

  function nextSlug(slug) {
    const i = order.indexOf(slug);
    return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
  }

  // ── URL beim Scrollen aktualisieren ─────────────────────────────────────────
  function updateUrl() {
    const blocks = document.querySelectorAll('.ft-block');
    const mid = window.scrollY + window.innerHeight / 2;
    let active = blocks[0];
    blocks.forEach(b => { if (b.offsetTop <= mid) active = b; });
    if (active) {
      const url = slugToUrl(active.dataset.slug);
      if (window.location.pathname !== url)
        history.replaceState(null, '', url);
    }
  }

  // ── Nächste Seite laden ─────────────────────────────────────────────────────
  async function loadNext() {
    if (loading) return;
    const last = loadedSlugs[loadedSlugs.length - 1];
    const next = nextSlug(last);

    if (!next) {
      // Ende des Feeds – Abschlussbalken einfügen
      if (!atEnd) {
        feed.appendChild(createEndBar());
        atEnd = true;
      }
      return;
    }

    loading = true;
    try {
      const html = await fetch(slugToUrl(next)).then(r => r.text());
      const block = createBlock(next, html);
      feed.appendChild(block);
      loadedSlugs.push(next);
      observe(block);
    } catch (e) {
      console.warn('feed.js loadNext:', e);
    }
    loading = false;
  }

  // ── Vorherige Seite laden ───────────────────────────────────────────────────
  async function loadPrev() {
    if (loading) return;
    const first = loadedSlugs[0];
    const prev  = prevSlug(first);

    if (!prev) {
      // Anfang des Feeds – Abschlussbalken oben einfügen
      if (!atStart) {
        feed.insertBefore(createEndBar(), feed.firstChild);
        atStart = true;
      }
      return;
    }

    loading = true;
    try {
      const html = await fetch(slugToUrl(prev)).then(r => r.text());
      const block = createBlock(prev, html);
      const scrollBefore = window.scrollY;
      feed.insertBefore(block, feed.firstChild);
      window.scrollTo(0, scrollBefore + block.offsetHeight);
      loadedSlugs.unshift(prev);
      observe(block);
    } catch (e) {
      console.warn('feed.js loadPrev:', e);
    }
    loading = false;
  }

  // ── Intersection Observer ───────────────────────────────────────────────────
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const slug = e.target.dataset.slug;
      if (slug === loadedSlugs[loadedSlugs.length - 1]) loadNext();
      if (slug === loadedSlugs[0]) loadPrev();
    });
  }, { rootMargin: PRELOAD });

  function observe(block) { io.observe(block); }

  // ── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    addIndexButton();
    hideNav();

    // order.json laden
    try {
      order = await fetch(ORDER_URL).then(r => r.json());
    } catch (e) {
      console.warn('feed.js: order.json nicht gefunden.', e);
      return;
    }

    const slug = currentSlug();
    if (!order.includes(slug)) {
      console.warn('feed.js: Slug nicht in order.json:', slug);
      return;
    }

    // CSS für Feed-Layout
    const style = document.createElement('style');
    // Body-Margin auslesen und als Padding auf ft-inner übertragen
    // damit feed.js den margin nicht überschreibt
    const computedMargin = parseInt(getComputedStyle(document.body).marginLeft) || 25;
    style.textContent = `
      body { margin: 0 !important; overflow-x: hidden; }
      #ft-feed { display: block; }
      .ft-block { display: block; }
      .ft-inner { padding: ${computedMargin}px; box-sizing: border-box; }
      .ft-bar   { display: block; margin-left: -${computedMargin}px; }
    `;
    document.head.appendChild(style);

    // Ersten Block aus aktuellem Body-Inhalt bauen
    const firstInner = document.createElement('div');
    firstInner.className = 'ft-inner';
    while (document.body.firstChild) {
      firstInner.appendChild(document.body.firstChild);
    }

    const firstBlock = document.createElement('div');
    firstBlock.className = 'ft-block';
    firstBlock.dataset.slug = slug;
    firstBlock.appendChild(firstInner);

    feed = document.createElement('div');
    feed.id = 'ft-feed';
    feed.appendChild(firstBlock);
    document.body.appendChild(feed);

    loadedSlugs = [slug];
    observe(firstBlock);

    // Beide Richtungen vorladen
    loadNext();
    loadPrev();
  }

  // Scroll-Event
  let t;
  window.addEventListener('scroll', () => {
    clearTimeout(t);
    t = setTimeout(updateUrl, 100);
  }, { passive: true });

  init();

})();
