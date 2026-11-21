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
    ["c4", "f4"], ["d4", "a4"], ["e4", "b4"], ["g4", "c5"], ["a4", "d5"], ["f4", "b4"],
    ["c4", "g4", "d4"], ["d4", "b4", "e4"], ["e4", "a4", "f4"],
    ["g4", "d4", "a4"], ["b4", "f4", "c5"], ["a4", "e4", "g4"],
    ["c4", "a4", "e4", "b4"], ["d4", "g4", "c5", "e4"],
    ["f4", "b4", "d5", "a4"], ["g4", "c5", "f4", "a4"],
    ["a4", "d5", "g4", "c5"], ["e4", "b4", "f4", "d5"],
    ["c4", "e4", "a4", "d5", "g4"], ["d4", "a4", "f4", "c5", "e4"],
    ["e4", "b4", "g4", "d5", "a4"], ["f4", "c5", "g4", "b4", "d5"],
    ["g4", "d5", "a4", "e5", "c5"], ["b4", "e5", "a4", "f4", "c5"]
  ];

  const timbreDefinitions = [
    {
      id: "soft-piano",
      name: "Piano Suave",
      level: 0.2,
      partials: [{ ratio: 1, amplitude: 1 }, { ratio: 2, amplitude: 0.34 }, { ratio: 3, amplitude: 0.13 }],
      envelope: { attack: 0.005, decay: 0.9, sustain: 0.002, release: 0.18, duration: 1.1 }
    },
    {
      id: "synth",
      name: "Sintetizador",
      level: 0.19,
      partials: [{ ratio: 1, amplitude: 1, type: "sawtooth" }],
      envelope: { attack: 0.015, decay: 0.4, sustain: 0.38, release: 0.16, duration: 0.78 },
      filter: { start: 5200, end: 750 }
    },
    {
      id: "organ",
      name: "Órgão",
      level: 0.2,
      partials: [{ ratio: 1, amplitude: 1 }, { ratio: 2, amplitude: 1 }, { ratio: 3, amplitude: 1 }, { ratio: 4, amplitude: 1 }],
      envelope: { attack: 0.02, decay: 0.18, sustain: 0.82, release: 0.1, duration: 0.72 }
    },
    {
      id: "flute",
      name: "Flauta",
      level: 0.22,
      partials: [{ ratio: 1, amplitude: 1 }, { ratio: 2, amplitude: 0.1 }],
      envelope: { attack: 0.06, decay: 0.28, sustain: 0.74, release: 0.16, duration: 0.9 },
      vibrato: { rate: 5.2, depth: 0.003 }
    },
    {
      id: "marimba",
      name: "Marimba / Sino",
      level: 0.21,
      partials: [{ ratio: 1, amplitude: 1 }, { ratio: 3.9, amplitude: 0.42 }, { ratio: 9.2, amplitude: 0.16 }],
      envelope: { attack: 0.004, decay: 0.24, sustain: 0.002, release: 0.1, duration: 0.48 }
    }
  ];
  const timbres = timbreDefinitions.map(function (timbre) {
    return Object.freeze(Object.assign({}, timbre, {
      partials: Object.freeze(timbre.partials.map(function (partial) { return Object.freeze(partial); })),
      envelope: Object.freeze(timbre.envelope),
      filter: timbre.filter ? Object.freeze(timbre.filter) : null,
      vibrato: timbre.vibrato ? Object.freeze(timbre.vibrato) : null
    }));
  });

  const SEQUENCE_HISTORY_LIMIT = 20;
  const ERRORS_BEFORE_REPLAY = 5;

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.Config = Object.freeze({
    notes: notes,
    MATCH_ANY_OCTAVE: true,
    SEQUENCE_HISTORY_LIMIT: SEQUENCE_HISTORY_LIMIT,
    ERRORS_BEFORE_REPLAY: ERRORS_BEFORE_REPLAY,
    notationOptions: ["portuguese", "cipher"],
    levelOptions: ["white", "all"],
    quantityOptions: [5, 7, 12],
    timbres: Object.freeze(timbres),
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
