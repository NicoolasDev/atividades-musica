(function () {
  "use strict";

  function createKey(note, showLabels) {
    const key = document.createElement("button");
    key.type = "button";
    key.className = "piano-key " + (note.isBlack ? "black" : "white");
    key.dataset.keyId = note.id;
    key.style.setProperty("--key-position", note.whitePosition === undefined ? note.position : note.whitePosition);
    const octave = Math.floor(note.midi / 12) - 1;
    key.setAttribute("aria-label", note.names.cipher[0] + octave);
    key.setAttribute("aria-pressed", "false");
    key.textContent = showLabels ? note.names.cipher[0] : "";
    if (showLabels) {
      key.classList.add("has-label");
    }
    return key;
  }

  function renderKeyboard(container, notes, options) {
    container.replaceChildren();
    const showLabels = Boolean(options && options.showLabels);
    const whiteNotes = notes.filter(function (note) { return !note.isBlack; })
      .sort(function (left, right) { return left.position - right.position; });
    whiteNotes.forEach(function (note) { container.appendChild(createKey(note, showLabels)); });

    notes.filter(function (note) { return note.isBlack; })
      .sort(function (left, right) { return left.position - right.position; })
      .forEach(function (note) { container.appendChild(createKey(note, showLabels)); });
    container.style.setProperty("--white-count", String(whiteNotes.length));
  }

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.Piano = Object.freeze({ renderKeyboard: renderKeyboard });
}());
