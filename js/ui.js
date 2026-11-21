(function () {
  "use strict";

  const config = window.KeyMatch.Config;
  const screenIds = [
    "home-screen", "activity1-setup-screen", "activity1-game-screen",
    "settings-screen", "game-screen", "activity3-setup-screen",
    "activity3-game-screen", "summary-screen"
  ];
  const elements = {};

  function getElements() {
    [
      "home-button", "back-button", "activity-navigation", "settings-hint", "start-button", "cards-area", "keyboard",
      "round-label", "progress-value", "score-value", "errors-value", "timer-value",
      "game-instruction", "live-message", "mute-button", "summary-correct",
      "summary-errors", "summary-accuracy", "summary-time", "new-round-button",
      "settings-button", "match-note", "cipher-options", "match-progress",
      "match-score", "match-message", "sequence-keyboard", "sequence-history",
      "sequence-question", "sequence-remaining", "sequence-timbre",
      "sequence-instruction", "sequence-message", "replay-sequence-button",
      "activity1-start-button", "activity3-start-button", "fixed-timbre-settings"
    ].forEach(function (id) { elements[id] = document.getElementById(id); });
    screenIds.forEach(function (id) { elements[id] = document.getElementById(id); });
    return elements;
  }

  function showScreen(screenName) {
    screenIds.forEach(function (id) {
      elements[id].hidden = id !== screenName;
    });
    elements["activity-navigation"].hidden = screenName === "home-screen";
  }

  function getSettings() {
    const settings = {};
    document.querySelectorAll(".setting-group").forEach(function (group) {
      const selected = group.querySelector(".segment.is-active");
      settings[group.dataset.setting] = selected ? selected.dataset.value : null;
    });
    return settings;
  }

  function setSetting(groupName, value) {
    const group = document.querySelector('.setting-group[data-setting="' + groupName + '"]');
    group.querySelectorAll(".segment").forEach(function (button) {
      const active = button.dataset.value === value;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    if (groupName === "level") {
      const twelve = document.querySelector('.setting-group[data-setting="quantity"] [data-value="12"]');
      twelve.hidden = value !== "all";
      twelve.disabled = value !== "all";
      if (value === "white" && getSettings().quantity === "12") {
        setSetting("quantity", "7");
      }
      elements["settings-hint"].textContent = value === "white"
        ? "Com teclas brancas, o limite é 7 notas."
        : "12 notas inclui todas as teclas da oitava.";
    } else if (groupName === "timbre-mode") {
      elements["fixed-timbre-settings"].hidden = value !== "fixed";
    }
  }

  function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
  }

  function renderCards(game, order) {
    elements["cards-area"].replaceChildren();
    order.forEach(function (noteId) {
      const note = game.notes.find(function (item) { return item.id === noteId; });
      const card = document.createElement("button");
      card.type = "button";
      card.className = "note-card";
      card.dataset.cardId = noteId;
      card.textContent = note.displayName;
      card.setAttribute("aria-pressed", "false");
      elements["cards-area"].appendChild(card);
    });
  }

  function renderGame(game, cardOrder) {
    renderCards(game, cardOrder);
    window.KeyMatch.Piano.renderKeyboard(elements.keyboard, config.notes);
    elements["round-label"].textContent = game.noteIds.length + " NOTAS · OITAVA 4";
    elements["progress-value"].textContent = "0/" + game.noteIds.length;
    elements["score-value"].textContent = "0";
    elements["errors-value"].textContent = "0";
    elements["timer-value"].textContent = "00:00";
    elements["live-message"].textContent = "";
    elements["game-instruction"].textContent = "Escolha uma cifra e depois a tecla, ou o contrário.";
    showScreen("game-screen");
  }

  function setSelected(element, selected) {
    element.classList.toggle("is-selected", selected);
    element.setAttribute("aria-pressed", String(selected));
  }

  function showWrong(card, key) {
    [card, key].forEach(function (element) {
      element.classList.add("is-wrong", "is-shaking");
      window.setTimeout(function () { element.classList.remove("is-wrong", "is-shaking"); }, config.animation.errorMs);
    });
  }

  function markMatched(card, key, noteName) {
    card.classList.remove("is-selected");
    card.classList.add("is-matched");
    card.disabled = true;
    card.setAttribute("aria-pressed", "false");
    key.classList.remove("is-selected");
    key.classList.add("is-matched");
    key.disabled = true;
    key.textContent = noteName;
    key.setAttribute("aria-label", noteName);
    key.setAttribute("aria-pressed", "false");
  }

  function updateScore(game) {
    elements["score-value"].textContent = String(game.score);
    elements["errors-value"].textContent = String(game.errors);
    elements["progress-value"].textContent = game.matchedIds.size + "/" + game.noteIds.length;
  }

  function updateTimer(milliseconds) {
    elements["timer-value"].textContent = formatTime(milliseconds);
  }

  function showFeedback(message, isError, target) {
    const messageElement = target || elements["live-message"];
    messageElement.textContent = message;
    messageElement.style.color = isError ? "var(--error)" : "var(--success)";
    window.setTimeout(function () {
      if (messageElement.textContent === message) {
        messageElement.textContent = "";
        messageElement.style.color = "";
      }
    }, config.animation.messageMs);
  }

  function showSummary(metrics, actions) {
    const attempts = metrics.correct + metrics.errors;
    const accuracy = attempts ? Math.round((metrics.correct / attempts) * 100) : 0;
    elements["summary-correct"].textContent = String(metrics.correct);
    elements["summary-errors"].textContent = String(metrics.errors);
    elements["summary-accuracy"].textContent = accuracy + "%";
    elements["summary-time"].textContent = formatTime(metrics.elapsedMs);
    elements["new-round-button"].onclick = actions.onNewRound;
    elements["settings-button"].onclick = actions.onSettings;
    showScreen("summary-screen");
  }

  function setMuteButton(isMuted) {
    document.querySelectorAll(".mute-button").forEach(function (button) {
      button.setAttribute("aria-pressed", String(isMuted));
      button.innerHTML = isMuted
        ? '<span aria-hidden="true">♪</span> Som desligado'
        : '<span aria-hidden="true">♪</span> Som ligado';
    });
  }

  function showAudioError(error) {
    showFeedback(error.message, true);
  }

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.UI = Object.freeze({
    getElements: getElements,
    getSettings: getSettings,
    setSetting: setSetting,
    setSelected: setSelected,
    renderGame: renderGame,
    showWrong: showWrong,
    markMatched: markMatched,
    updateScore: updateScore,
    updateTimer: updateTimer,
    showFeedback: showFeedback,
    showSummary: showSummary,
    showScreen: showScreen,
    setMuteButton: setMuteButton,
    showAudioError: showAudioError,
    formatTime: formatTime
  });
}());
