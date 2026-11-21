(function () {
  "use strict";

  const config = window.KeyMatch.Config;

  function createGame(noteIds, allNotes, notation) {
    const notesById = new Map(allNotes.map(function (note) { return [note.id, note]; }));
    const selectedNotes = noteIds.map(function (noteId) {
      const note = notesById.get(noteId);
      if (!note) {
        throw new Error("A rodada contém um ID de nota desconhecido.");
      }
      const names = note.names[notation];
      return {
        id: note.id,
        frequency: note.frequency,
        displayName: names.length > 1 ? names[Math.floor(Math.random() * names.length)] : names[0]
      };
    });

    if (new Set(noteIds).size !== noteIds.length) {
      throw new Error("Uma rodada não pode repetir notas.");
    }

    return {
      noteIds: noteIds.slice(),
      notes: selectedNotes,
      matchedIds: new Set(),
      score: 0,
      errors: 0,
      startedAt: null,
      completedAt: null
    };
  }

  function startTimer(game, now) {
    if (game.startedAt === null) {
      game.startedAt = now;
    }
  }

  function attemptPair(game, cardId, keyId, now) {
    startTimer(game, now);
    if (!game.noteIds.includes(cardId) || !game.noteIds.includes(keyId)) {
      throw new Error("O par contém uma nota que não pertence à rodada.");
    }

    if (cardId === keyId) {
      game.matchedIds.add(cardId);
      game.score += config.scoring.pointsPerCorrect;
      if (game.matchedIds.size === game.noteIds.length) {
        game.completedAt = now;
      }
      return { correct: true, note: game.notes.find(function (note) { return note.id === keyId; }) };
    }

    game.errors += 1;
    game.score = Math.max(0, game.score - config.scoring.penaltyPerError);
    return { correct: false };
  }

  function getElapsedMs(game, now) {
    if (game.startedAt === null) {
      return 0;
    }
    return Math.max(0, (game.completedAt === null ? now : game.completedAt) - game.startedAt);
  }

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.Game = Object.freeze({
    createGame: createGame,
    startTimer: startTimer,
    attemptPair: attemptPair,
    getElapsedMs: getElapsedMs
  });
}());
