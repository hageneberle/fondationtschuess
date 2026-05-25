/**
 * feed.js – Fondation Tschuess
 * ====================================================
 * Erzeugt einen nahtlosen vertikalen Feed aus einzelnen
 * HTML-Seiten. Scrollen nach unten lädt die nächste Seite,
 * scrollen nach oben die vorherige. Die URL aktualisiert
 * sich automatisch. ↑↓-Buttons werden ausgeblendet.
 *
 * Einbinden direkt vor </body> in jeder Projektseite:
 * <script src="feed.js"></script>
 */

(function () {

  const ORDER_URL = 'order.json';
  const PRELOAD_MARGIN = '200px'; // wie früh die nächste Seite geladen wird


  // ── Globaler State ──────────────────────────────────────────────────────────
  let order = [];          // alle slugs aus order.json
  let loadedSlugs = [];    // slugs die bereits im DOM sind
  let loading = false;     // verhindert doppeltes Laden

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

  // ── Seite als Block in den Feed einfügen ────────────────────────────────────

  function createBlock(slug, html) {
    const block = document.createElement('div');
    block.className = 'ft-block';
    block.dataset.slug = slug;
    const palette = ['#D0201A', '#E8720C', '#F5C300', '#007B40', '#003F8A'];
    const barColor = palette[Math.floor(Math.random() * palette.length)];

    block.style.cssText = `
      min-height: 100vh;
      box-sizing: border-box;
      border-top: none;
      padding-top: 120vh;
      background-image: linear-gradient(${barColor} 120vh, transparent 120vh);
      background-size: 100vw 120vh;
      background-position: left top;
      background-repeat: no-repeat;
      margin-left: -25px;
      margin-right: -25px;
      padding-left: 25px;
      padding-right: 25px;
      user-select: text;
      -webkit-user-select: text;
    `;
    block.innerHTML = extractBody(html);
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

  // ── Intersection Observer: wann laden? ──────────────────────────────────────

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const slug = entry.target.dataset.slug;

      if (slug === loadedSlugs[loadedSlugs.length - 1]) {
        loadNext();
      }
      if (slug === loadedSlugs[0]) {
        loadPrev();
      }
    });
  }, {
    rootMargin: PRELOAD_MARGIN
  });

  function observeBlock(block) {
    observer.observe(block);
  }

  // ── Scroll → URL aktualisieren ──────────────────────────────────────────────

  let scrollTimer;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateUrl, 100);
  }, { passive: true });

  // ── Init ─────────────────────────────────────────────────────────────────────

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

    const firstBlock = document.createElement('div');
    firstBlock.className = 'ft-block';
    firstBlock.dataset.slug = slug;
    firstBlock.style.cssText = 'min-height: 100vh; box-sizing: border-box; border-top: none; user-select: text; -webkit-user-select: text;';
    while (document.body.firstChild) {
      firstBlock.appendChild(document.body.firstChild);
    }

    window.feed = document.createElement('div');
    feed.id = 'ft-feed';
    feed.style.overflowX = 'hidden';
    feed.style.userSelect = 'text';
    feed.style.webkitUserSelect = 'text';
    document.body.style.overflowX = 'hidden';
    feed.appendChild(firstBlock);
    document.body.appendChild(feed);

    loadedSlugs = [slug];
    observeBlock(firstBlock);

    loadNext();
    loadPrev();
  }

  init();

})();
