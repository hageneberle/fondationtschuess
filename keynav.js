/*
 * Pfeiltasten springen von Bild zu Bild:
 * rechts/unten = nächstes Bild, links/oben = vorheriges Bild.
 * Wird auf allen Ausstellungsseiten eingebunden (direkter Aufruf und Vorschau im Index).
 */
(function () {
  var OFFSET = 12; // Abstand des Bildes zum oberen Rand nach dem Sprung

  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var forward = (e.key === 'ArrowRight' || e.key === 'ArrowDown');
    var backward = (e.key === 'ArrowLeft' || e.key === 'ArrowUp');
    if (!forward && !backward) return;

    var tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;

    var pics = Array.prototype.slice.call(document.querySelectorAll('picture'));
    if (!pics.length) return; // ohne Bilder normales Scrollen belassen

    // aktuelles Bild: das letzte, dessen Oberkante auf oder über dem oberen Rand liegt
    var cur = -1;
    for (var i = 0; i < pics.length; i++) {
      if (pics[i].getBoundingClientRect().top <= OFFSET + 5) cur = i; else break;
    }

    function jumpTo(pic) {
      window.scrollBy(0, pic.getBoundingClientRect().top - OFFSET);
    }

    e.preventDefault();
    if (forward) {
      if (cur + 1 < pics.length) jumpTo(pics[cur + 1]);
      else window.scrollTo(0, document.documentElement.scrollHeight); // hinter dem letzten Bild: ans Seitenende
    } else {
      if (cur < 0) { window.scrollTo(0, 0); return; }
      var top = pics[cur].getBoundingClientRect().top;
      if (top < OFFSET - 5) jumpTo(pics[cur]);   // mitten im Bild: erst an dessen Anfang
      else if (cur > 0) jumpTo(pics[cur - 1]);
      else window.scrollTo(0, 0);                // erstes Bild: zurück an den Seitenanfang
    }
  });
})();
