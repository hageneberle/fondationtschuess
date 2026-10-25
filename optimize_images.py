#!/usr/bin/env python3
"""
Fondation Tschuess — Bildoptimierung
=====================================
Konvertiert alle JPEG-Bilder nach WebP (quality 85, method 6) und aktualisiert
die HTML-Dateien, sodass Browser WebP laden und JPEG als Fallback erhalten.

Voraussetzung:
    pip install Pillow

Ausführen (vom Repo-Root):
    python optimize_images.py

Was das Skript tut:
    0. Alle JPEGs in images/<projekt>/ (ohne images/unpublished/) werden verarbeitet
    1. Bilder mit Breite >2000px auf 2000px runterskalieren (JPEG wird überschrieben)
    2. Für jedes JPEG eine WebP-Version erstellen (images/foo.jpg → images/foo.webp)
    3. HTML-Dateien: <img src="images/foo.jpg"> → <picture>…</picture>
    4. Open-Graph-/Twitter-Tags: auf Seiten ohne og:title ergänzen (aus <title>,
       Description, Canonical und dem ersten Bild der Seite), bei allen Seiten
       og:image:width/height an die tatsächliche Bildgröße anpassen

Was das Skript NICHT tut:
    - Originalbilder löschen (JPEGs bleiben als Fallback erhalten)
    - Bereits konvertierte Dateien neu verarbeiten (Skip wenn WebP neuer als JPEG)
    - HTML-Dateien anfassen, die bereits <picture> enthalten
    - Open-Graph-Tags auf noindex-Seiten ergänzen
    - JSON-LD schreiben (Künstler, Daten, Ort bitte von Hand aus der <h1> übernehmen)
"""

import html
import re
import sys
import io
import urllib.parse
from pathlib import Path

# UTF-8 Ausgabe erzwingen (Windows-Konsole nutzt sonst cp1252)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# ── Konfiguration ────────────────────────────────────────────────────────────

WEBP_QUALITY = 85   # 85 = exzellente Qualität ohne sichtbare Artefakte.
                    # 80 wäre kleiner, 90 wäre noch besser — 85 ist der
                    # empfohlene Sweet-Spot für Kunstfotografie.

WEBP_METHOD  = 6    # Kodierungsaufwand: 0 = schnell/größer, 6 = langsam/kleiner.
                    # Method 6 erzeugt die kleinsten Dateien. Da wir das nur einmal
                    # machen, lohnt sich die Wartezeit.

JPEG_QUALITY = 85   # Nur relevant für die 2 Ausreißer (6016px), die runterskaliert
                    # und als neues JPEG gespeichert werden.

MAX_WIDTH    = 2000 # Pixel. Bilder breiter als dieser Wert werden herunterskaliert.

# ─────────────────────────────────────────────────────────────────────────────

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow ist nicht installiert.")
    print("Bitte ausführen: pip install Pillow")
    sys.exit(1)

ROOT       = Path(__file__).parent
IMAGES_DIR = ROOT / "images"
SITE_URL   = "https://fondationtschuess.org/"


# ── HTML lesen/schreiben ohne Zeilenenden umzuwandeln ────────────────────────
# Manche Seiten haben Windows-Zeilenenden (CRLF). read_text()/write_text()
# würden sie in LF umwandeln, dann sähe im Diff die ganze Datei geändert aus.

def read_html(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def write_html(path, text):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


# ── Schritt 1 + 2: Bilder konvertieren ───────────────────────────────────────

def optimize_images():
    # Bilder liegen in Unterordnern je Projekt (images/<projekt>/foo.jpg);
    # images/unpublished/ wird nicht verarbeitet.
    # Auf Windows ist das Dateisystem case-insensitiv → deduplicieren
    seen = set()
    jpgs = []
    for p in sorted(IMAGES_DIR.rglob("*.jpg")) + sorted(IMAGES_DIR.rglob("*.JPG")):
        rel = p.relative_to(IMAGES_DIR)
        if "unpublished" in rel.parts:
            continue
        if rel.as_posix().lower() not in seen:
            seen.add(rel.as_posix().lower())
            jpgs.append(p)
    if not jpgs:
        print(f"Keine JPEGs in {IMAGES_DIR} gefunden.")
        return

    print(f"Verarbeite {len(jpgs)} Bilder …\n")

    total_jpg  = 0
    total_webp = 0
    skipped    = 0
    resized    = []

    for jpg_path in jpgs:
        jpg_bytes  = jpg_path.stat().st_size
        total_jpg += jpg_bytes
        webp_path  = jpg_path.with_suffix(".webp")

        # Skip: WebP existiert bereits und ist neuer als das JPEG
        if webp_path.exists() and webp_path.stat().st_mtime > jpg_path.stat().st_mtime:
            total_webp += webp_path.stat().st_size
            skipped += 1
            continue

        with Image.open(jpg_path) as img:

            # EXIF-Orientierung korrekt anwenden (Hochformat-Fotos)
            img = ImageOps.exif_transpose(img)

            w, h        = img.size
            was_resized = False

            # Ausreißer: zu breite Bilder auf MAX_WIDTH runterskalieren
            if w > MAX_WIDTH:
                new_h = round(h * MAX_WIDTH / w)
                img   = img.resize((MAX_WIDTH, new_h), Image.LANCZOS)
                # JPEG-Fallback ebenfalls verkleinert speichern
                img.save(jpg_path, "JPEG", quality=JPEG_QUALITY,
                         optimize=True, progressive=True)
                was_resized = True
                resized.append(f"{jpg_path.name}  ({w}×{h} → {MAX_WIDTH}×{new_h})")

            # Farbmodus sicherstellen (CMYK, RGBA o.ä. → RGB)
            if img.mode != "RGB":
                img = img.convert("RGB")

            # WebP speichern
            img.save(webp_path, "WEBP",
                     quality=WEBP_QUALITY,
                     method=WEBP_METHOD,
                     lossless=False)

        webp_bytes  = webp_path.stat().st_size
        total_webp += webp_bytes
        pct         = (1 - webp_bytes / jpg_bytes) * 100
        icon        = "v" if was_resized else "+"

        print(f"  {icon}  {jpg_path.name}")
        if was_resized:
            print(f"       runterskaliert auf {MAX_WIDTH}px")
        print(f"       JPEG {jpg_bytes//1024:>4} KB  →  WebP {webp_bytes//1024:>4} KB  "
              f"({pct:.0f}% kleiner)")

    print()
    print("─" * 56)
    print(f"  JPEGs gesamt  {total_jpg  / 1024 / 1024:>6.1f} MB")
    print(f"  WebP gesamt   {total_webp / 1024 / 1024:>6.1f} MB")
    pct_total = (1 - total_webp / total_jpg) * 100 if total_jpg else 0
    saved_mb  = (total_jpg - total_webp) / 1024 / 1024
    print(f"  Ersparnis     {pct_total:>5.0f}%  ({saved_mb:.1f} MB weniger im Repo)")
    if resized:
        print(f"\n  Runterskaliert ({len(resized)}):")
        for r in resized:
            print(f"    · {r}")
    if skipped:
        print(f"\n  Übersprungen: {skipped} (WebP bereits aktuell)")
    print("─" * 56)


# ── Schritt 3: HTML aktualisieren ────────────────────────────────────────────

def update_html():
    """
    Ersetzt alle <img src="images/foo.jpg" …> durch:

        <picture>
          <source srcset="images/foo.webp" type="image/webp">
          <img src="images/foo.jpg" …>
        </picture>

    Dateien, die bereits <picture> enthalten, werden übersprungen.
    """

    html_files = sorted(ROOT.glob("*.html"))
    print(f"\nAktualisiere HTML-Dateien ({len(html_files)} Stück) …\n")

    # Matcht: <img [irgendwas] src="images/datei.jpg" [irgendwas]>
    # Erfordert: src zeigt auf images/ und endet auf .jpg (case-insensitiv)
    IMG_RE = re.compile(
        r'<img\s[^>]*?src="(images/[^"]+\.jpg)"[^>]*?>',
        re.IGNORECASE | re.DOTALL,
    )

    def wrap(match):
        img_tag  = match.group(0)
        jpg_src  = match.group(1)
        webp_src = jpg_src.rsplit(".", 1)[0] + ".webp"
        return (
            f"<picture>"
            f'<source srcset="{webp_src}" type="image/webp">'
            f"{img_tag}"
            f"</picture>"
        )

    updated_files = 0
    for html_path in html_files:
        text = read_html(html_path)

        if "<picture>" in text:
            print(f"  >  {html_path.name}: bereits <picture>, uebersprungen")
            continue

        new_text, n = IMG_RE.subn(wrap, text)

        if n > 0:
            write_html(html_path, new_text)
            print(f"  +  {html_path.name}: {n} Bild{'er' if n != 1 else ''} umgestellt")
            updated_files += 1
        else:
            print(f"  –  {html_path.name}: keine Bilder")

    print(f"\n  {updated_files} Datei(en) aktualisiert.")


# ── Schritt 4: Open-Graph-/Twitter-Tags ──────────────────────────────────────

def image_size(path):
    """Größe so, wie Browser das Bild anzeigen (EXIF-Drehung berücksichtigt)."""
    with Image.open(path) as img:
        w, h = img.size
        if img.getexif().get(0x0112) in (5, 6, 7, 8):  # um 90° gedreht
            w, h = h, w
    return w, h


def update_og_tags():
    """
    Seiten ohne og:title bekommen direkt nach dem Canonical den OG-/Twitter-Block,
    wie er auf den bestehenden Seiten steht. Titel und Beschreibung kommen aus
    <title> und <meta name="description">, das Bild ist das erste der Seite.

    Bei allen Seiten werden og:image:width/height auf die tatsächliche Größe
    des og:image gesetzt (z. B. nachdem Schritt 1 ein Bild verkleinert hat).
    """

    html_files = sorted(ROOT.glob("*.html"))
    print(f"\nPruefe Open-Graph-Tags ({len(html_files)} Seiten) …\n")

    updated_files = 0
    for html_path in html_files:
        text = read_html(html_path)
        head = text.split("</head>")[0]
        if re.search(r'<meta name="robots" content="[^"]*noindex', head):
            continue
        new_text = text

        if 'property="og:title"' not in head:
            title  = re.search(r"<title>(.*?)</title>", head, re.S)
            desc   = re.search(r'<meta name="description" content="([^"]*)"', head)
            canon  = re.search(r'^([ \t]*)<link rel="canonical" href="([^"]*)">', head, re.M)
            img    = re.search(r'<img\s[^>]*?src="(images/[^"]+)"', text)
            missing = [n for n, m in (("<title>", title), ("description", desc),
                                      ("canonical", canon), ("Bild", img)) if not m]
            if missing:
                print(f"  !  {html_path.name}: keine OG-Tags, es fehlt {', '.join(missing)}")
                continue

            nl     = "\r\n" if "\r\n" in text else "\n"
            indent = canon.group(1)
            w, h   = image_size(ROOT / img.group(1))
            img_url = SITE_URL + urllib.parse.quote(img.group(1), safe="/,()+-_.~'")
            value  = lambda s: html.escape(html.unescape(s.strip()), quote=True)
            tags = [
                ("property", "og:title",        value(title.group(1))),
                ("property", "og:description",  value(desc.group(1))),
                ("property", "og:image",        img_url),
                ("property", "og:image:width",  w),
                ("property", "og:image:height", h),
                ("property", "og:url",          canon.group(2)),
                ("property", "og:type",         "website"),
                ("property", "og:site_name",    "Fondation Tschuess"),
                ("name",     "twitter:card",        "summary_large_image"),
                ("name",     "twitter:title",       value(title.group(1))),
                ("name",     "twitter:description", value(desc.group(1))),
                ("name",     "twitter:image",       img_url),
            ]
            block = "".join(f'{nl}{indent}<meta {k}="{n}" content="{v}">' for k, n, v in tags)
            new_text = new_text[:canon.end()] + block + new_text[canon.end():]
            print(f"  +  {html_path.name}: OG-Tags ergaenzt ({img.group(1)}, {w}×{h})")

        # og:image:width/height an die tatsächliche Bildgröße anpassen
        og_img = re.search(r'<meta property="og:image" content="' + re.escape(SITE_URL) + r'([^"]+)"', new_text)
        if og_img:
            img_path = ROOT / urllib.parse.unquote(og_img.group(1))
            if img_path.exists():
                w, h = image_size(img_path)
                for name, val in (("width", w), ("height", h)):
                    new_text, n = re.subn(
                        r'(<meta property="og:image:' + name + r'" content=")(\d+)(")',
                        lambda m: m.group(1) + str(val) + m.group(3), new_text)
            else:
                print(f"  !  {html_path.name}: og:image nicht gefunden ({img_path.relative_to(ROOT)})")

        if new_text != text:
            write_html(html_path, new_text)
            if 'property="og:title"' in head:
                print(f"  ~  {html_path.name}: og:image-Groesse aktualisiert")
            updated_files += 1

    print(f"\n  {updated_files} Datei(en) aktualisiert.")


# ── Hauptprogramm ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 56)
    print("  Fondation Tschuess — Bildoptimierung")
    print("=" * 56)
    print()

    if not IMAGES_DIR.is_dir():
        print(f"Fehler: Verzeichnis '{IMAGES_DIR}' nicht gefunden.")
        print("Bitte das Skript aus dem Repo-Root ausführen.")
        sys.exit(1)

    optimize_images()
    update_html()
    update_og_tags()

    print()
    print("=" * 56)
    print("  Fertig.")
    print()
    print("  Naechste Schritte:")
    print("  1. Seiten im Browser pruefen (WebP + JPEG-Fallback)")
    print("  2. git add -A && git commit -m '...'")
    print("  3. Pull Request oeffnen")
    print("=" * 56)
