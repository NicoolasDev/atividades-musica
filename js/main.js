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
  let matchErrors = 0;
  let matchStartedAt = 0;
  let sequenceNotes = [];
  let sequenceQuestions = [];
  let sequenceIndex = 0;
  let sequenceInputIndex = 0;
  let sequenceErrors = 0;
  let sequenceErrorsForQuestion = 0;
  let sequenceStartedAt = 0;
  let sequenceIsPlaying = false;
  let sequenceSessionId = 0;
  let sequenceTimbreMode = "vary";
  let fixedTimbreId = "soft-piano";
  let previousTimbreId = null;
  let currentSequenceTimbre = null;
  let summarySettingsAction = showSetup;

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
        window.setTimeout(function () {
          showSummary({
            correct: game.matchedIds.size,
            errors: game.errors,
            elapsedMs: elapsedMs
          }, createRound, showSetup);
        }, config.animation.messageMs);
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

  function showSummary(metrics, onNewRound, onSettings) {
    summarySettingsAction = onSettings;
    ui.showSummary(metrics, {
      onNewRound: onNewRound,
      onSettings: onSettings
    });
  }

  function goBackOneStep() {
    const activeScreen = document.querySelector(".screen:not([hidden])").id;
    if (activeScreen === "activity1-game-screen") {
      showActivity1Setup();
    } else if (activeScreen === "activity1-setup-screen" || activeScreen === "settings-screen" || activeScreen === "activity3-setup-screen") {
      showHome();
    } else if (activeScreen === "activity3-game-screen") {
      showActivity3Setup();
    } else if (activeScreen === "game-screen") {
      showSetup();
    } else if (activeScreen === "summary-screen") {
      summarySettingsAction();
    }
  }

  function renderMatchCards() {
    const naturalNotes = config.notes.filter(function (note) { return !note.isBlack; });
    matchPairs = matchLevel === "basic" ? naturalNotes : config.notes;
    matchQueue = shuffle(matchPairs);
    matchCurrent = null;
    matchCorrectIds = new Set();
    matchErrors = 0;
    matchStartedAt = Date.now();
    matchLocked = false;
    ui.getElements()["match-score"].textContent = "0";
    ui.getElements()["match-message"].textContent = "";
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
      showSummary({
        correct: matchCorrectIds.size,
        errors: matchErrors,
        elapsedMs: Math.max(0, Date.now() - matchStartedAt)
      }, renderMatchCards, showActivity1Setup);
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
      matchErrors += 1;
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
    while (history.childElementCount > config.SEQUENCE_HISTORY_LIMIT) {
      history.removeChild(history.firstElementChild);
    }
    history.scrollLeft = history.scrollWidth;
  }

  function chooseSequenceTimbre() {
    if (sequenceTimbreMode === "fixed") {
      currentSequenceTimbre = config.timbres.find(function (timbre) {
        return timbre.id === fixedTimbreId;
      });
    } else {
      const availableTimbres = config.timbres.filter(function (timbre) {
        return timbre.id !== previousTimbreId;
      });
      currentSequenceTimbre = availableTimbres[Math.floor(Math.random() * availableTimbres.length)];
      previousTimbreId = currentSequenceTimbre.id;
    }
    return currentSequenceTimbre;
  }

  function getSequenceTimbre() {
    return currentSequenceTimbre || chooseSequenceTimbre();
  }

  function createSequenceQuestions() {
    return [2, 3, 4, 5].reduce(function (questions, length) {
      const matchingSequences = config.sequenceBank.filter(function (sequence) {
        return sequence.length === length;
      });
      return questions.concat(shuffle(matchingSequences).slice(0, 3));
    }, []);
  }

  function setSequenceKeyboardDisabled(disabled) {
    ui.getElements()["sequence-keyboard"].querySelectorAll(".piano-key").forEach(function (key) {
      key.disabled = disabled;
    });
  }

  function sleep(milliseconds) {
    return new Promise(function (resolve) { window.setTimeout(resolve, milliseconds); });
  }

  async function playCurrentSequence(sessionId, calmReplay) {
    if (sequenceIsPlaying || sequenceIndex >= sequenceQuestions.length) {
      return;
    }
    sequenceIsPlaying = true;
    setSequenceKeyboardDisabled(true);
    const replayButton = ui.getElements()["replay-sequence-button"];
    replayButton.disabled = true;
    replayButton.querySelector(".replay-label").textContent = "Ouvindo…";
    const sequenceMessage = ui.getElements()["sequence-message"];
    ui.clearFeedback(sequenceMessage);
    sequenceMessage.classList.remove("is-error", "is-wrong");
    sequenceMessage.textContent = calmReplay ? "Ouça de novo com calma." : "Ouça com atenção…";
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
        replayButton.disabled = false;
        replayButton.querySelector(".replay-label").textContent = "Ouvir novamente";
      }
    }
  }

  function startSequenceSession() {
    sequenceSessionId += 1;
    sequenceIsPlaying = false;
    const sessionId = sequenceSessionId;
    sequenceNotes = config.getNotesForOctaves([4, 5]);
    sequenceQuestions = createSequenceQuestions();
    sequenceIndex = 0;
    sequenceInputIndex = 0;
    sequenceErrors = 0;
    sequenceErrorsForQuestion = 0;
    sequenceStartedAt = Date.now();
    const sequenceSettings = ui.getSettings();
    sequenceTimbreMode = sequenceSettings["timbre-mode"] || "vary";
    fixedTimbreId = sequenceSettings["fixed-timbre"] || "soft-piano";
    previousTimbreId = null;
    chooseSequenceTimbre();
    window.KeyMatch.Piano.renderKeyboard(ui.getElements()["sequence-keyboard"], sequenceNotes, { showLabels: true });
    ui.getElements()["sequence-history"].replaceChildren();
    ui.getElements()["replay-sequence-button"].innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h3l5 4V6l-5 4H4z"/><path d="M16 9a5 5 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg><span class="replay-label">Ouvir novamente</span>';
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
    const expectedNote = sequenceNotes.find(function (item) { return item.id === expectedId; });
    const isExpectedNote = config.MATCH_ANY_OCTAVE
      ? note && expectedNote && note.pitch === expectedNote.pitch
      : key.dataset.keyId === expectedId;
    if (isExpectedNote) {
      appendSequenceHistory(note, true);
      key.classList.add("is-correct");
      clearKeyFeedback(key);
      sequenceInputIndex += 1;
      ui.getElements()["sequence-remaining"].textContent = String(sequence.length - sequenceInputIndex);
      const matchedNote = sequenceNotes.find(function (item) { return item.id === expectedId; });
      ui.showFeedback("Correto: " + matchedNote.names.cipher[0] + ".", false, ui.getElements()["sequence-message"]);
      if (sequenceInputIndex === sequence.length) {
        sequenceIndex += 1;
        sequenceErrorsForQuestion = 0;
        if (sequenceIndex >= sequenceQuestions.length) {
          setSequenceKeyboardDisabled(true);
          showSummary({
            correct: sequenceQuestions.length,
            errors: sequenceErrors,
            elapsedMs: Math.max(0, Date.now() - sequenceStartedAt)
          }, startSequenceSession, showActivity3Setup);
          return;
        }
        sequenceInputIndex = 0;
        chooseSequenceTimbre();
        ui.getElements()["sequence-history"].replaceChildren();
        updateSequenceProgress();
        ui.getElements()["sequence-instruction"].textContent = "Próxima sequência…";
        setSequenceKeyboardDisabled(true);
        const sessionId = sequenceSessionId;
        window.setTimeout(function () { playCurrentSequence(sessionId); }, 900);
      }
      return;
    }

    key.classList.add("is-wrong");
    sequenceErrors += 1;
    sequenceErrorsForQuestion += 1;
    clearKeyFeedback(key);
    appendSequenceHistory(note, false);
    sequenceInputIndex = 0;
    ui.getElements()["sequence-remaining"].textContent = String(sequence.length);
    const shouldReplay = config.ERRORS_BEFORE_REPLAY > 0
      && sequenceErrorsForQuestion >= config.ERRORS_BEFORE_REPLAY;
    if (shouldReplay) {
      sequenceErrorsForQuestion = 0;
      ui.getElements()["sequence-instruction"].textContent = "Ouvindo de novo…";
      ui.getElements()["sequence-message"].textContent = "Ouça de novo com calma.";
      ui.getElements()["sequence-message"].style.color = "var(--muted)";
    } else {
      ui.getElements()["sequence-instruction"].textContent = "A sequência reinicia após um erro. Tente novamente.";
      ui.showFeedback("Não foi dessa vez. Ouça novamente para tentar de novo.", true, ui.getElements()["sequence-message"]);
    }
    if (shouldReplay) {
      playCurrentSequence(sequenceSessionId, true);
    }
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
    document.querySelectorAll(".mute-button").forEach(function (button) {
      button.addEventListener("click", function () {
        ui.setMuteButton(audio.toggleMute());
      });
    });

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
    ui.setSetting("timbre-mode", "vary");
    ui.setSetting("fixed-timbre", "soft-piano");
    ui.setMuteButton(audio.isMuted());
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    document.getElementById("ios-audio-hint").hidden = !isIOS;
    bindEvents();
    ui.showScreen("home-screen");
  }

  initialize();
}());
