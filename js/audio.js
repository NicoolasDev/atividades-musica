(function () {
  "use strict";

  let audioContext = null;
  let isMuted = false;

  const timbreSettings = {
    "soft-piano": { type: "triangle", gain: 0.18, duration: 0.52, harmonic: 1 },
    synth: { type: "sawtooth", gain: 0.11, duration: 0.42, harmonic: 1 },
    organ: { type: "sine", gain: 0.16, duration: 0.58, harmonic: 1.5 },
    marimba: { type: "sine", gain: 0.2, duration: 0.3, harmonic: 2 }
  };

  function createContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("Este navegador não oferece suporte à Web Audio API.");
    }
    return new AudioContextConstructor();
  }

  async function unlock() {
    if (!audioContext) {
      audioContext = createContext();
    }
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
  }

  async function playNote(frequency, timbreId) {
    await unlock();
    if (isMuted) {
      return;
    }

    const settings = timbreSettings[timbreId] || timbreSettings["soft-piano"];
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const overtone = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const overtoneGain = audioContext.createGain();
    oscillator.type = settings.type;
    oscillator.frequency.setValueAtTime(frequency, now);
    overtone.type = "sine";
    overtone.frequency.setValueAtTime(frequency * settings.harmonic, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(settings.gain, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration);
    overtoneGain.gain.setValueAtTime(settings.gain * 0.28, now);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + settings.duration * 0.65);
    oscillator.connect(gain);
    overtone.connect(overtoneGain);
    gain.connect(audioContext.destination);
    overtoneGain.connect(audioContext.destination);
    oscillator.onended = function () {
      oscillator.disconnect();
      overtone.disconnect();
      gain.disconnect();
      overtoneGain.disconnect();
    };
    oscillator.start(now);
    overtone.start(now);
    oscillator.stop(now + settings.duration + 0.01);
    overtone.stop(now + settings.duration * 0.65 + 0.01);
  }

  function toggleMute() {
    isMuted = !isMuted;
    return isMuted;
  }

  window.KeyMatch = window.KeyMatch || {};
  window.KeyMatch.Audio = Object.freeze({
    unlock: unlock,
    playNote: playNote,
    toggleMute: toggleMute,
    isMuted: function () { return isMuted; }
  });
}());
