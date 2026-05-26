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

All images live in `/images/` as numbered JPGs. There is no asset manifest — filenames are referenced directly in HTML.

## Adding a new exhibition page

1. Add the slug to `order.json` at the desired position.
2. Update the `▲`/`▼` links on the neighboring pages.
3. Create the new HTML file following the structure of an existing page (see e.g. `ausstellung.html`): `<meta>` tags with description/keywords, `<link>` to both stylesheets, the nav block, then content.
4. Add a link to `index.html`.

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

## Deployment

GitHub Pages deployed automatisch von `main` — der `CNAME`-Eintrag zeigt auf `fondationtschuess.org`.

## Form handling

`information.html` uses [Pageclip](https://pageclip.co) for the newsletter subscription form (script loaded from their CDN).
