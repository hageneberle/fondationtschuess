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
    1. Bilder mit Breite >2000px auf 2000px runterskalieren (JPEG wird überschrieben)
    2. Für jedes JPEG eine WebP-Version erstellen (images/foo.jpg → images/foo.webp)
    3. HTML-Dateien: <img src="images/foo.jpg"> → <picture>…</picture>

Was das Skript NICHT tut:
    - Originalbilder löschen (JPEGs bleiben als Fallback erhalten)
    - Bereits konvertierte Dateien neu verarbeiten (Skip wenn WebP neuer als JPEG)
    - HTML-Dateien anfassen, die bereits <picture> enthalten
"""

import re
import sys
import io
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


# ── Schritt 1 + 2: Bilder konvertieren ───────────────────────────────────────

def optimize_images():
    # Auf Windows ist das Dateisystem case-insensitiv → deduplicieren
    seen = set()
    jpgs = []
    for p in sorted(IMAGES_DIR.glob("*.jpg")) + sorted(IMAGES_DIR.glob("*.JPG")):
        if p.name.lower() not in seen:
            seen.add(p.name.lower())
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
        text = html_path.read_text(encoding="utf-8")

        if "<picture>" in text:
            print(f"  >  {html_path.name}: bereits <picture>, uebersprungen")
            continue

        new_text, n = IMG_RE.subn(wrap, text)

        if n > 0:
            html_path.write_text(new_text, encoding="utf-8")
            print(f"  +  {html_path.name}: {n} Bild{'er' if n != 1 else ''} umgestellt")
            updated_files += 1
        else:
            print(f"  –  {html_path.name}: keine Bilder")

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

    print()
    print("=" * 56)
    print("  Fertig.")
    print()
    print("  Naechste Schritte:")
    print("  1. Seiten im Browser pruefen (WebP + JPEG-Fallback)")
    print("  2. git add -A && git commit -m '...'")
    print("  3. Pull Request oeffnen")
    print("=" * 56)
