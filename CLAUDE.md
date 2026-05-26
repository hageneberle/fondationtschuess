# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static HTML website for Fondation Tschuess (fondationtschuess.org), an art foundation that documents exhibitions, happenings, and screenings. Hosted on GitHub Pages. No build tools, no dependencies, no npm — pure HTML/CSS.

## Architecture

### Navigation order

`order.json` defines the canonical sequence of all exhibition pages (as an array of slugs). Each page's prev/next arrows are derived from this order. When adding or reordering pages, update `order.json` first, then update the nav links in the affected HTML files.

### Page nav pattern

Every exhibition page has a fixed nav in the top-right corner (styled by `nav.css`):

```html
<nav><a href="index.html">↩</a>&nbsp;<a href="[prev].html">▲</a>&nbsp;<a href="[next].html">▼</a></nav>
```

`↩` returns to the index, `▲` goes to the previous page in `order.json`, `▼` goes to the next. The first page in the sequence links back to the last for `▲`, and vice versa for `▼`.

### Stylesheets

- `styles.css` — typography, images, iframe, mobile breakpoint at `max-width: 999px`
- `nav.css` — fixed-position nav (top-right), overrides link style to non-italic black

### Images

Images live in `/images/` as JPEG + WebP pairs (e.g. `foo.jpg` and `foo.webp`). The HTML uses `<picture>` tags so browsers load WebP; JPEG serves as fallback. Both files must exist for every image. `optimize_images.py` creates the WebP versions automatically (see below).

## Adding a new exhibition page

1. Add the slug to `order.json` at the desired position.
2. Add a `<url>` entry to `sitemap.xml` with `<priority>0.80</priority>` — no `<lastmod>`. Use `%C3%B6` etc. for umlauts in the `<loc>` URL.
3. Update the `▲`/`▼` links on the neighboring pages.
4. Place images in `/images/` as JPEGs (max. 2000px wide; camera originals are scaled down automatically).
5. Create the HTML file following the structure of an existing page (see e.g. `ausstellung.html`): `<meta>` tags with description/keywords, `<link>` to both stylesheets, a `<link rel="canonical">` tag, the nav block, then content. Reference images as `<img src="images/foo.jpg" alt="...">` — the script in the next step wraps them in `<picture>` automatically.

```html
<link rel="canonical" href="https://fondationtschuess.org/[slug]">
```

Use `%C3%B6` etc. for umlauts in the canonical URL (same encoding as in `sitemap.xml`).

6. Run `python optimize_images.py` — converts the new JPEGs to WebP and wraps all `<img>` tags in `<picture>` tags. The script skips images that already have an up-to-date WebP.
7. Add a link to `index.html`.

## Git-Regeln

- **Commit-Messages immer auf Deutsch.**
- **Niemals direkt auf `main` pushen.** Stattdessen einen neuen Branch erstellen, Änderungen dort committen und einen Pull Request öffnen.

## Arbeitsweise bei Code-Änderungen

Wenn ich Änderungen am Code vornehme, folge ich immer diesem Ablauf — ohne dass der User mich daran erinnern muss:

1. `git checkout main && git pull` — aktuellen Stand holen
2. `git checkout -b <typ>/<beschreibung>` — neuen Branch erstellen (`fix/`, `feature/`, `refactor/`)
3. Änderungen vornehmen und committen (Message auf Deutsch)
4. Branch pushen und mit `gh pr create` einen PR öffnen

Am Ende jeder Änderung steht immer ein offener PR, nie ein direkter Commit auf `main`.

## Bilder

Alle Bilder liegen als JPEG und WebP in `/images/`. Browser laden WebP (via `<picture>`-Tag), ältere Systeme fallen auf JPEG zurück.

### Neue Bilder hinzufügen

1. JPEG in `/images/` ablegen (max. 2000px Breite, Kamera-Originale werden automatisch skaliert)
2. `python optimize_images.py` ausführen — erstellt die WebP-Version und aktualisiert die HTML-Dateien
3. Voraussetzung: `pip install Pillow` (einmalig)

Das Skript überspringt Bilder, deren WebP-Version bereits aktuell ist.

## Deployment

GitHub Pages deployed automatisch von `main` — der `CNAME`-Eintrag zeigt auf `fondationtschuess.org`.

## Form handling

`information.html` uses [Pageclip](https://pageclip.co) for the newsletter subscription form (script loaded from their CDN).
