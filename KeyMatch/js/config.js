(function () {
  "use strict";

  const noteDefinitions = [
    { id: "c4", pitch: "c", midi: 60, isBlack: false, position: 0, names: { portuguese: ["Dó"], cipher: ["C"] } },
    { id: "c-sharp4", pitch: "c-sharp", midi: 61, isBlack: true, position: 1, names: { portuguese: ["Dó#", "Ré♭"], cipher: ["C#", "D♭"] } },
    { id: "d4", pitch: "d", midi: 62, isBlack: false, position: 1, names: { portuguese: ["Ré"], cipher: ["D"] } },
    { id: "d-sharp4", pitch: "d-sharp", midi: 63, isBlack: true, position: 2, names: { portuguese: ["Ré#", "Mi♭"], cipher: ["D#", "E♭"] } },
    { id: "e4", pitch: "e", midi: 64, isBlack: false, position: 2, names: { portuguese: ["Mi"], cipher: ["E"] } },
    { id: "f4", pitch: "f", midi: 65, isBlack: false, position: 3, names: { portuguese: ["Fá"], cipher: ["F"] } },
    { id: "f-sharp4", pitch: "f-sharp", midi: 66, isBlack: true, position: 4, names: { portuguese: ["Fá#", "Sol♭"], cipher: ["F#", "G♭"] } },
    { id: "g4", pitch: "g", midi: 67, isBlack: false, position: 4, names: { portuguese: ["Sol"], cipher: ["G"] } },
    { id: "g-sharp4", pitch: "g-sharp", midi: 68, isBlack: true, position: 5, names: { portuguese: ["Sol#", "Lá♭"], cipher: ["G#", "A♭"] } },
    { id: "a4", pitch: "a", midi: 69, isBlack: false, position: 5, names: { portuguese: ["Lá"], cipher: ["A"] } },
    { id: "a-sharp4", pitch: "a-sharp", midi: 70, isBlack: true, position: 6, names: { portuguese: ["Lá#", "Si♭"], cipher: ["A#", "B♭"] } },
    { id: "b4", pitch: "b", midi: 71, isBlack: false, position: 6, names: { portuguese: ["Si"], cipher: ["B"] } }
  ];

  const notes = noteDefinitions.map(function (note) {
    return Object.assign({}, note, { frequency: 440 * Math.pow(2, (note.midi - 69) / 12) });
  });

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function createRandomRound(settings, availableNotes) {
    const pool = settings.level === "white"
      ? availableNotes.filter(function (note) { return !note.isBlack; })
      : availableNotes;
    const quantity = Number(settings.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > pool.length) {
      throw new RangeError("A quantidade de notas não é válida para este nível.");
    }
    const shuffledPool = shuffle(pool);
    return shuffledPool.slice(0, quantity).map(function (note) { return note.id; });
  }

  function getNotesForOctaves(octaves) {
    return octaves.reduce(function (allNotes, octave) {
      return allNotes.concat(notes.map(function (note) {
        const noteId = note.id.replace("4", String(octave));
        const midi = note.midi + (octave - 4) * 12;
        return Object.assign({}, note, {
          id: noteId,
          midi: midi,
          position: note.position + (octave - 4) * 7,
          frequency: 440 * Math.pow(2, (midi - 69) / 12)
        });
      }));
    }, []);
  }

  const sequenceBank = [
    ["c4", "e4"], ["g4", "d4"], ["a4", "c4"], ["f4", "d4"],
    ["c4", "d4", "e4"], ["e4", "g4", "c4"], ["a4", "f4", "g4"], ["d4", "f4", "a4"],
    ["c4", "e4", "g4", "c5"], ["g4", "e4", "d4", "c4"], ["f4", "a4", "c5", "g4"],
    ["d4", "g4", "b4", "e5", "c5"], ["c4", "g4", "e5", "d4", "a4"],
    ["a4", "c5", "e5", "g4", "d5"], ["f4", "a4", "g4", "c5", "e5"]
  ];

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.Config = Object.freeze({
    notes: notes,
    notationOptions: ["portuguese", "cipher"],
    levelOptions: ["white", "all"],
    quantityOptions: [5, 7, 12],
    timbres: Object.freeze([
      Object.freeze({ id: "soft-piano", name: "Piano Suave" }),
      Object.freeze({ id: "synth", name: "Sintetizador" }),
      Object.freeze({ id: "organ", name: "Órgão" }),
      Object.freeze({ id: "marimba", name: "Marimba / Sino" })
    ]),
    sequenceBank: Object.freeze(sequenceBank.map(function (sequence) {
      return Object.freeze(sequence.slice());
    })),
    getNotesForOctaves: getNotesForOctaves,
    shuffle: shuffle,
    getRoundNoteIds: function (mode, settings, availableNotes) {
      if (mode !== "random") {
        throw new Error("Modo de rodada desconhecido.");
      }
      return createRandomRound(settings, availableNotes);
    },
    scoring: Object.freeze({ pointsPerCorrect: 10, penaltyPerError: 2 }),
    animation: Object.freeze({ errorMs: 280, messageMs: 1400 })
  });
}());
