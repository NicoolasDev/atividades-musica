(function () {
  "use strict";

  const config = window.KeyMatch.Config;
  const gameLogic = window.KeyMatch.Game;
  const ui = window.KeyMatch.UI;
  const audio = window.KeyMatch.Audio;
  let game = null;
  let selectedCardId = null;
  let selectedKeyId = null;
  let cardOrder = [];
  let clockInterval = null;
  let settings = null;
  let matchLevel = "basic";
  let matchLocked = false;
  let matchPairs = [];
  let matchQueue = [];
  let matchCurrent = null;
  let matchCorrectIds = new Set();
  let sequenceNotes = [];
  let sequenceQuestions = [];
  let sequenceIndex = 0;
  let sequenceInputIndex = 0;
  let sequenceIsPlaying = false;
  let sequenceSessionId = 0;
  let selectedTimbreIndex = 0;

  function shuffle(items) {
    return config.shuffle(items);
  }

  function startClock() {
    if (clockInterval !== null) {
      return;
    }
    gameLogic.startTimer(game, Date.now());
    clockInterval = window.setInterval(function () {
      ui.updateTimer(gameLogic.getElapsedMs(game, Date.now()));
    }, 250);
  }

  function stopClock() {
    if (clockInterval !== null) {
      window.clearInterval(clockInterval);
      clockInterval = null;
    }
  }

  function createRound() {
    stopClock();
    const noteIds = config.getRoundNoteIds("random", settings, config.notes);
    game = gameLogic.createGame(noteIds, config.notes, settings.notation);
    selectedCardId = null;
    selectedKeyId = null;
    cardOrder = shuffle(noteIds);
    ui.renderGame(game, cardOrder);
  }

  function getCard(cardId) {
    return document.querySelector('.note-card[data-card-id="' + cardId + '"]');
  }

  function getKey(keyId) {
    return document.querySelector('.piano-key[data-key-id="' + keyId + '"]');
  }

  function clearSelection() {
    if (selectedCardId !== null) {
      const card = getCard(selectedCardId);
      if (card) {
        ui.setSelected(card, false);
      }
    }
    if (selectedKeyId !== null) {
      const key = getKey(selectedKeyId);
      if (key) {
        ui.setSelected(key, false);
      }
    }
    selectedCardId = null;
    selectedKeyId = null;
  }

  function playNote(noteId) {
    const note = config.getNotesForOctaves([4, 5]).find(function (item) { return item.id === noteId; })
      || config.notes.find(function (item) { return item.id === noteId; });
    if (note) {
      audio.playNote(note.frequency).catch(ui.showAudioError);
    }
  }

  function attemptPair(cardId, keyId) {
    const result = gameLogic.attemptPair(game, cardId, keyId, Date.now());
    if (result.correct) {
      const card = getCard(cardId);
      const key = getKey(keyId);
      ui.markMatched(card, key, result.note.displayName);
      ui.updateScore(game);
      ui.showFeedback("Isso! " + result.note.displayName + " está no lugar.", false);
      clearSelection();
      if (game.completedAt !== null) {
        stopClock();
        const elapsedMs = gameLogic.getElapsedMs(game, Date.now());
        ui.updateTimer(elapsedMs);
        window.setTimeout(function () { ui.showSummary(game, elapsedMs); }, config.animation.messageMs);
      }
      return;
    }

    ui.showWrong(getCard(cardId), getKey(keyId));
    ui.updateScore(game);
    ui.showFeedback("Ainda não. Tente outra combinação.", true);
    clearSelection();
  }

  function onCardClick(card) {
    startClock();
    const cardId = card.dataset.cardId;
    if (selectedCardId === cardId) {
      ui.setSelected(card, false);
      selectedCardId = null;
    } else {
      if (selectedCardId !== null) {
        ui.setSelected(getCard(selectedCardId), false);
      }
      selectedCardId = cardId;
      ui.setSelected(card, true);
    }
    if (selectedCardId !== null && selectedKeyId !== null) {
      attemptPair(selectedCardId, selectedKeyId);
    }
  }

  function onKeyClick(key) {
    startClock();
    playNote(key.dataset.keyId);
    const keyId = key.dataset.keyId;
    if (selectedKeyId === keyId) {
      ui.setSelected(key, false);
      selectedKeyId = null;
    } else {
      if (selectedKeyId !== null) {
        ui.setSelected(getKey(selectedKeyId), false);
      }
      selectedKeyId = keyId;
      ui.setSelected(key, true);
    }
    if (selectedCardId !== null && selectedKeyId !== null) {
      attemptPair(selectedCardId, selectedKeyId);
    }
  }

  function showSetup() {
    stopClock();
    game = null;
    ui.showScreen("settings-screen");
  }

  function showHome() {
    stopClock();
    sequenceSessionId += 1;
    sequenceIsPlaying = false;
    game = null;
    ui.showScreen("home-screen");
  }

  function showActivity1Setup() {
    ui.showScreen("activity1-setup-screen");
  }

  function showActivity3Setup() {
    sequenceSessionId += 1;
    sequenceIsPlaying = false;
    ui.showScreen("activity3-setup-screen");
  }

  function goBackOneStep() {
    const activeScreen = document.querySelector(".screen:not([hidden])").id;
    if (activeScreen === "activity1-game-screen") {
      showActivity1Setup();
    } else if (activeScreen === "activity1-setup-screen" || activeScreen === "settings-screen" || activeScreen === "activity3-setup-screen") {
      showHome();
    } else if (activeScreen === "activity3-game-screen") {
      showActivity3Setup();
    } else if (activeScreen === "game-screen" || activeScreen === "summary-screen") {
      showSetup();
    }
  }

  function renderMatchCards() {
    const naturalNotes = config.notes.filter(function (note) { return !note.isBlack; });
    matchPairs = matchLevel === "basic" ? naturalNotes : config.notes;
    matchQueue = shuffle(matchPairs);
    matchCurrent = null;
    matchCorrectIds = new Set();
    matchLocked = false;
    ui.getElements()["match-score"].textContent = "0";
    ui.getElements()["match-message"].textContent = "";
    ui.getElements()["match-again-button"].hidden = true;
    ui.showScreen("activity1-game-screen");
    updateMatchProgress();
    advanceMatchQuestion();
  }

  function renderCipherOptions() {
    const container = ui.getElements()["cipher-options"];
    container.replaceChildren();
    shuffle(matchPairs).forEach(function (note) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-card cipher-option";
      button.dataset.noteId = note.id;
      button.textContent = note.names.cipher[0];
      container.appendChild(button);
    });
  }

  function updateMatchProgress() {
    ui.getElements()["match-progress"].textContent = matchCorrectIds.size + "/" + matchPairs.length;
    ui.getElements()["match-score"].textContent = String(matchCorrectIds.size);
  }

  function advanceMatchQuestion() {
    if (matchQueue.length === 0) {
      matchCurrent = null;
      ui.getElements()["match-note"].textContent = "Concluído!";
      ui.getElements()["cipher-options"].replaceChildren();
      ui.getElements()["match-message"].textContent = "Muito bem! Você identificou todas as notas.";
      ui.getElements()["match-again-button"].hidden = false;
      return;
    }
    matchCurrent = matchQueue.shift();
    ui.getElements()["match-note"].textContent = matchCurrent.names.portuguese[0];
    renderCipherOptions();
    matchLocked = false;
  }

  function onCipherOptionClick(button) {
    if (matchLocked || matchCurrent === null || button.disabled) {
      return;
    }
    matchLocked = true;
    const isCorrect = button.dataset.noteId === matchCurrent.id;
    button.classList.add(isCorrect ? "is-matched" : "is-wrong");
    if (!isCorrect) {
      button.classList.add("is-shaking");
      matchQueue.push(matchCurrent);
      ui.showFeedback("Essa cifra não corresponde. A nota voltará para a rodada.", true, ui.getElements()["match-message"]);
    } else {
      matchCorrectIds.add(matchCurrent.id);
      audio.playNote(matchCurrent.frequency).catch(ui.showAudioError);
      ui.showFeedback("Correto: " + matchCurrent.names.cipher[0] + ".", false, ui.getElements()["match-message"]);
      updateMatchProgress();
    }
    matchCurrent = null;
    window.setTimeout(function () {
      advanceMatchQuestion();
    }, isCorrect ? 420 : 520);
  }

  function appendSequenceHistory(note, isCorrect) {
    const history = ui.getElements()["sequence-history"];
    const badge = document.createElement("span");
    badge.className = "sequence-history-badge " + (isCorrect ? "is-correct" : "is-wrong");
    badge.textContent = note.names.cipher[0];
    badge.setAttribute("aria-label", note.names.cipher[0] + (isCorrect ? ", correta" : ", incorreta"));
    history.appendChild(badge);
    history.scrollLeft = history.scrollWidth;
  }

  function getSequenceTimbre() {
    return config.timbres[(selectedTimbreIndex + sequenceIndex) % config.timbres.length];
  }

  function setSequenceKeyboardDisabled(disabled) {
    ui.getElements()["sequence-keyboard"].querySelectorAll(".piano-key").forEach(function (key) {
      key.disabled = disabled;
    });
  }

  function sleep(milliseconds) {
    return new Promise(function (resolve) { window.setTimeout(resolve, milliseconds); });
  }

  async function playCurrentSequence(sessionId) {
    if (sequenceIsPlaying || sequenceIndex >= sequenceQuestions.length) {
      return;
    }
    sequenceIsPlaying = true;
    setSequenceKeyboardDisabled(true);
    ui.getElements()["replay-sequence-button"].disabled = true;
    ui.getElements()["sequence-message"].textContent = "Ouça com atenção…";
    const timbre = getSequenceTimbre();
    ui.getElements()["sequence-timbre"].textContent = timbre.name;
    const sequence = sequenceQuestions[sequenceIndex];
    try {
      for (let index = 0; index < sequence.length; index += 1) {
        if (sessionId !== sequenceSessionId) {
          return;
        }
        const note = sequenceNotes.find(function (item) { return item.id === sequence[index]; });
        await audio.playNote(note.frequency, timbre.id);
        await sleep(600);
      }
      if (sessionId !== sequenceSessionId) {
        return;
      }
      sequenceInputIndex = 0;
      ui.getElements()["sequence-remaining"].textContent = String(sequence.length);
      ui.getElements()["sequence-instruction"].textContent = "Agora reproduza as notas na mesma ordem.";
      ui.getElements()["sequence-message"].textContent = "Sua vez!";
      setSequenceKeyboardDisabled(false);
    } catch (error) {
      ui.showAudioError(error);
      setSequenceKeyboardDisabled(false);
    } finally {
      if (sessionId === sequenceSessionId) {
        sequenceIsPlaying = false;
        ui.getElements()["replay-sequence-button"].disabled = false;
      }
    }
  }

  function startSequenceSession() {
    sequenceSessionId += 1;
    sequenceIsPlaying = false;
    const sessionId = sequenceSessionId;
    sequenceNotes = config.getNotesForOctaves([4, 5]);
    sequenceQuestions = shuffle(config.sequenceBank).slice(0, 12);
    sequenceIndex = 0;
    sequenceInputIndex = 0;
    selectedTimbreIndex = Math.max(0, config.timbres.findIndex(function (timbre) {
      return timbre.id === ui.getElements()["timbre-select"].value;
    }));
    window.KeyMatch.Piano.renderKeyboard(ui.getElements()["sequence-keyboard"], sequenceNotes, { showLabels: true });
    ui.getElements()["sequence-history"].replaceChildren();
    ui.getElements()["replay-sequence-button"].textContent = "🔊 Ouvir novamente";
    updateSequenceProgress();
    ui.showScreen("activity3-game-screen");
    playCurrentSequence(sessionId);
  }

  function updateSequenceProgress() {
    ui.getElements()["sequence-question"].textContent = (sequenceIndex + 1) + " de " + sequenceQuestions.length;
    const sequence = sequenceQuestions[sequenceIndex] || [];
    ui.getElements()["sequence-remaining"].textContent = String(Math.max(0, sequence.length - sequenceInputIndex));
    const timbre = getSequenceTimbre();
    ui.getElements()["sequence-timbre"].textContent = timbre.name;
  }

  function clearKeyFeedback(key) {
    window.setTimeout(function () { key.classList.remove("is-correct", "is-wrong"); }, 350);
  }

  function onSequenceKeyClick(key) {
    if (sequenceIsPlaying || sequenceIndex >= sequenceQuestions.length) {
      return;
    }
    const sequence = sequenceQuestions[sequenceIndex];
    const expectedId = sequence[sequenceInputIndex];
    const note = sequenceNotes.find(function (item) { return item.id === key.dataset.keyId; });
    if (note) {
      audio.playNote(note.frequency, getSequenceTimbre().id).catch(ui.showAudioError);
    }
    if (key.dataset.keyId === expectedId) {
      appendSequenceHistory(note, true);
      key.classList.add("is-correct");
      clearKeyFeedback(key);
      sequenceInputIndex += 1;
      ui.getElements()["sequence-remaining"].textContent = String(sequence.length - sequenceInputIndex);
      const matchedNote = sequenceNotes.find(function (item) { return item.id === expectedId; });
      ui.showFeedback("Correto: " + matchedNote.names.cipher[0] + ".", false, ui.getElements()["sequence-message"]);
      if (sequenceInputIndex === sequence.length) {
        sequenceIndex += 1;
        if (sequenceIndex >= sequenceQuestions.length) {
          setSequenceKeyboardDisabled(true);
          ui.getElements()["sequence-question"].textContent = sequenceQuestions.length + " de " + sequenceQuestions.length;
          ui.getElements()["sequence-remaining"].textContent = "0";
          ui.getElements()["sequence-instruction"].textContent = "Desafio concluído!";
          ui.getElements()["sequence-message"].textContent = "Parabéns! Você completou as 12 questões.";
          ui.getElements()["replay-sequence-button"].textContent = "Jogar novamente";
          return;
        }
        sequenceInputIndex = 0;
        ui.getElements()["sequence-history"].replaceChildren();
        updateSequenceProgress();
        ui.getElements()["sequence-instruction"].textContent = "Próxima sequência…";
        const sessionId = sequenceSessionId;
        window.setTimeout(function () { playCurrentSequence(sessionId); }, 900);
      }
      return;
    }

    key.classList.add("is-wrong");
    clearKeyFeedback(key);
    appendSequenceHistory(note, false);
    sequenceInputIndex = 0;
    ui.getElements()["sequence-remaining"].textContent = String(sequence.length);
    ui.getElements()["sequence-instruction"].textContent = "A sequência reinicia após um erro. Tente novamente.";
    ui.showFeedback("Não foi dessa vez. Ouça novamente para tentar de novo.", true, ui.getElements()["sequence-message"]);
  }

  function bindEvents() {
    function unlockAudio() {
      document.removeEventListener("pointerdown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
      document.removeEventListener("click", unlockAudio);
      audio.unlock().catch(ui.showAudioError);
    }

    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    document.addEventListener("click", unlockAudio, { once: true });

    document.querySelectorAll(".setting-group").forEach(function (group) {
      group.addEventListener("click", function (event) {
        const button = event.target.closest(".segment");
        if (button && !button.disabled) {
          if (group.dataset.setting === "match-level") {
            matchLevel = button.dataset.value;
          }
          ui.setSetting(group.dataset.setting, button.dataset.value);
        }
      });
    });

    document.querySelectorAll(".activity-card").forEach(function (card) {
      card.addEventListener("click", function () {
        if (card.dataset.activity === "1") {
          showActivity1Setup();
        } else if (card.dataset.activity === "2") {
          ui.showScreen("settings-screen");
        } else {
          ui.showScreen("activity3-setup-screen");
        }
      });
    });

    ui.getElements()["home-button"].addEventListener("click", showHome);
    ui.getElements()["back-button"].addEventListener("click", goBackOneStep);
    document.querySelectorAll(".restart-button").forEach(function (button) {
      button.addEventListener("click", function () {
        const screen = button.closest(".screen").id;
        if (screen === "activity1-game-screen") {
          showActivity1Setup();
        } else if (screen === "activity3-game-screen") {
          showActivity3Setup();
        } else {
          showSetup();
        }
      });
    });

    ui.getElements()["activity1-start-button"].addEventListener("click", renderMatchCards);
    ui.getElements()["activity3-start-button"].addEventListener("click", startSequenceSession);
    ui.getElements()["match-again-button"].addEventListener("click", renderMatchCards);
    ui.getElements()["cipher-options"].addEventListener("click", function (event) {
      const button = event.target.closest(".cipher-option");
      if (button) {
        onCipherOptionClick(button);
      }
    });

    ui.getElements()["start-button"].addEventListener("click", function () {
      settings = ui.getSettings();
      settings.quantity = Number(settings.quantity);
      createRound();
    });
    ui.getElements()["cards-area"].addEventListener("click", function (event) {
      const card = event.target.closest(".note-card");
      if (card && !card.disabled) {
        onCardClick(card);
      }
    });
    ui.getElements().keyboard.addEventListener("click", function (event) {
      const key = event.target.closest(".piano-key");
      if (key && !key.disabled) {
        onKeyClick(key);
      }
    });
    ui.getElements()["mute-button"].addEventListener("click", function () {
      ui.setMuteButton(audio.toggleMute());
    });
    ui.getElements()["new-round-button"].addEventListener("click", createRound);
    ui.getElements()["settings-button"].addEventListener("click", showSetup);

    ui.getElements()["replay-sequence-button"].addEventListener("click", function () {
      if (sequenceIndex >= sequenceQuestions.length) {
        startSequenceSession();
      } else {
        playCurrentSequence(sequenceSessionId);
      }
    });
    ui.getElements()["sequence-keyboard"].addEventListener("click", function (event) {
      const key = event.target.closest(".piano-key");
      if (key && !key.disabled) {
        onSequenceKeyClick(key);
      }
    });
  }

  function initialize() {
    ui.getElements();
    ui.setSetting("notation", "cipher");
    ui.setSetting("level", "white");
    ui.setSetting("match-level", "basic");
    bindEvents();
    ui.showScreen("home-screen");
  }

  initialize();
}());
