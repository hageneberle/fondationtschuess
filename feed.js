/**
 * feed.js – Fondation Tschuess
 */

(function () {

  const ORDER_URL = 'order.json';
  const PRELOAD_MARGIN = '200px';
  
// ── Fixer Index-Button ──────────────────────────────────────────────────────
  const indexBtn = document.createElement('a');
  indexBtn.href = 'index.html';
  indexBtn.innerHTML = '&#8629;';
  indexBtn.style.cssText = `
    position: fixed;
    top: 25px;
    right: 25px;
    color: #0000EE;
    font-size: 20px;
    font-family: Arial, Helvetica, sans-serif;
    text-decoration: none;
    z-index: 9999;
  `;
  document.body.appendChild(indexBtn);
  
  // ── Alle Nav-Buttons ausblenden ─────────────────────────────────────────────
  const hideStyle = document.createElement('style');
  hideStyle.textContent = `nav { display: none !important; }`;
  document.head.appendChild(hideStyle);
  
  // ── Globaler State ──────────────────────────────────────────────────────────
  let order = [];
  let loadedSlugs = [];
  let loading = false;

  // ── Hilfsfunktionen ─────────────────────────────────────────────────────────

  function currentSlug() {
    const path = window.location.pathname;
    const seg = path.split('/').filter(Boolean).pop() || '';
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

  // ── Seite aus HTML-String extrahieren ───────────────────────────────────────

  function extractBody(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    return doc.body.innerHTML;
  }

  // ── Farbbalken erzeugen ─────────────────────────────────────────────────────

  function createBar(barColor) {
    const bar = document.createElement('div');
    bar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 5px;
      background: ${barColor};
      margin-left: 50%;
      transform: translateX(-50%);
    `;
    return bar;
  }

  // ── Seite als Block in den Feed einfügen ────────────────────────────────────

  function createBlock(slug, html) {
    const block = document.createElement('div');
    block.className = 'ft-block';
    block.dataset.slug = slug;
    block.style.cssText = `
      min-height: 5px;
      position: relative;
      padding-top: 5px;
      box-sizing: border-box;
      user-select: text;
      -webkit-user-select: text;
    `;

    // Farbbalken zuerst einfügen
    const palette = ['#000000'];
    const barColor = palette[Math.floor(Math.random() * palette.length)];
    block.appendChild(createBar(barColor));

    // Dann Seiteninhalt
    const content = document.createElement('div');
    content.innerHTML = extractBody(html);
    block.appendChild(content);

    return block;
  }

  // ── URL aktualisieren anhand des sichtbaren Blocks ──────────────────────────

  function updateUrl() {
    const blocks = document.querySelectorAll('.ft-block');
    const viewportMid = window.scrollY + window.innerHeight / 2;

    let active = blocks[0];
    blocks.forEach(block => {
      const top = block.offsetTop;
      if (top <= viewportMid) active = block;
    });

    if (active) {
      const slug = active.dataset.slug;
      const url = slugToUrl(slug);
      if (window.location.pathname !== url) {
        history.replaceState(null, '', url);
      }
    }
  }

  // ── Nächste Seite unten anhängen ────────────────────────────────────────────

  async function loadNext() {
    if (loading) return;
    const lastSlug = loadedSlugs[loadedSlugs.length - 1];
    const next = nextSlug(lastSlug);
    if (!next) return;

    loading = true;
    try {
      const res = await fetch(slugToUrl(next));
      const html = await res.text();
      const block = createBlock(next, html);
      feed.appendChild(block);
      loadedSlugs.push(next);
      observeBlock(block);
    } catch (e) {
      console.warn('feed.js: Konnte nicht laden:', next, e);
    }
    loading = false;
  }

  // ── Vorherige Seite oben einfügen ───────────────────────────────────────────

  async function loadPrev() {
    if (loading) return;
    const firstSlug = loadedSlugs[0];
    const prev = prevSlug(firstSlug);
    if (!prev) return;

    loading = true;
    try {
      const res = await fetch(slugToUrl(prev));
      const html = await res.text();
      const block = createBlock(prev, html);

      const scrollBefore = window.scrollY;
      feed.insertBefore(block, feed.firstChild);
      const addedHeight = block.offsetHeight;
      window.scrollTo(0, scrollBefore + addedHeight);

      loadedSlugs.unshift(prev);
      observeBlock(block);
    } catch (e) {
      console.warn('feed.js: Konnte nicht laden:', prev, e);
    }
    loading = false;
  }

  // ── Intersection Observer ───────────────────────────────────────────────────

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const slug = entry.target.dataset.slug;
      if (slug === loadedSlugs[loadedSlugs.length - 1]) loadNext();
      if (slug === loadedSlugs[0]) loadPrev();
    });
  }, { rootMargin: PRELOAD_MARGIN });

  function observeBlock(block) {
    observer.observe(block);
  }

  // ── Scroll → URL aktualisieren ──────────────────────────────────────────────

  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateUrl, 100);
  }, { passive: true });

  // ── Init ────────────────────────────────────────────────────────────────────

  async function init() {
    try {
      const res = await fetch(ORDER_URL);
      order = await res.json();
    } catch (e) {
      console.warn('feed.js: order.json nicht gefunden.', e);
      return;
    }

    const slug = currentSlug();
    if (!order.includes(slug)) {
      console.warn('feed.js: Aktueller Slug nicht in order.json:', slug);
      return;
    }

    // Ersten Block aus bestehendem Body-Inhalt bauen (kein Farbbalken oben)
    const firstBlock = document.createElement('div');
    firstBlock.className = 'ft-block';
    firstBlock.dataset.slug = slug;
    firstBlock.style.cssText = 'min-height: auto; box-sizing: border-box; user-select: text; -webkit-user-select: text;';
    while (document.body.firstChild) {
      firstBlock.appendChild(document.body.firstChild);
    }

    window.feed = document.createElement('div');
    feed.id = 'ft-feed';
    feed.style.overflowX = 'hidden';
    feed.style.userSelect = 'text';
    feed.style.webkitUserSelect = 'text';
    document.body.style.overflowX = 'hidden';
    document.body.style.margin = '0'; // Body-Margin entfernen – Balken übernimmt Layout
    feed.appendChild(firstBlock);
    document.body.appendChild(feed);

    // Padding für Seiteninhalt global setzen
    const style = document.createElement('style');
    style.textContent = `
      .ft-block > div { padding: 25px; box-sizing: border-box; }
      #ft-feed > .ft-block:first-child { padding: 25px; box-sizing: border-box; }
    `;
    document.head.appendChild(style);

    loadedSlugs = [slug];
    observeBlock(firstBlock);

     loadNext();
    if (prevSlug(slug)) loadPrev();
  }

  init();

})();
