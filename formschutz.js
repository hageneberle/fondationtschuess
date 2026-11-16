// Spamschutz für die Pageclip-Newsletter-Formulare (information.html, mailing-list.html).
// Pageclip selbst filtert nichts, deshalb zwei einfache Prüfungen im Browser:
// 1. Honeypot: ein für Menschen unsichtbares Feld, das Bots gern ausfüllen.
// 2. Zeitsperre: Absenden schneller als MIN_SECONDS nach dem Laden ist kein Mensch.
// Fällt eine Prüfung durch, geht nichts an Pageclip - der Bot sieht trotzdem die
// normale Danke-Meldung der Seite. Bots, die direkt an die Pageclip-Adresse senden, erreicht
// das nicht; dafür in Pageclip unter "Domains" nur fondationtschuess.org erlauben.
(function () {
  var MIN_SECONDS = 3;
  var loadedAt = Date.now();

  document.querySelectorAll('.pageclip-form').forEach(function (form) {
    var trap = document.createElement('div');
    trap.setAttribute('aria-hidden', 'true');
    trap.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
    trap.innerHTML = '<label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
    form.appendChild(trap);
    // pageclip.js sucht beim Laden nach Formularen, steht im HTML aber vor dem
    // Formular und findet es nicht - deshalb hier ausdrücklich anbinden
    if (window.Pageclip && !form.onsubmit) window.Pageclip.form(form);
  });

  // Capture-Phase am Dokument: läuft vor dem onsubmit-Handler von pageclip.js
  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form.classList || !form.classList.contains('pageclip-form')) return;
    var trap = form.querySelector('input[name="website"]');
    var tooFast = Date.now() - loadedAt < MIN_SECONDS * 1000;
    if ((trap && trap.value) || tooFast) {
      e.preventDefault();
      form.onsubmit = null; // Versand von pageclip.js abschalten; die Danke-Meldung der Seite läuft normal
      return;
    }
    if (trap) trap.closest('div').remove(); // leeres Feld nicht mit an Pageclip schicken
  }, true);
})();
