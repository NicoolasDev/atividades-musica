(function () {
  "use strict";

  let audioContext = null;
  let masterGain = null;
  let isMuted = false;

  function createContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      throw new Error("Este navegador não oferece suporte à Web Audio API.");
    }

    audioContext = new AudioContextConstructor();
    masterGain = audioContext.createGain();
    const compressor = audioContext.createDynamicsCompressor();
    masterGain.gain.value = 0.8;
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    masterGain.connect(compressor);
    compressor.connect(audioContext.destination);
    return audioContext;
  }

  async function unlock() {
    if (!audioContext) {
      createContext();
    }
    if ("audioSession" in navigator) {
      try {
        navigator.audioSession.type = "playback";
      } catch (error) {
        // Some browser implementations expose audioSession without allowing its type to be changed.
      }
    }
    if (audioContext.state !== "running") {
      await audioContext.resume();
    }
  }

  async function playNote(frequency, timbreId) {
    await unlock();
    if (isMuted) {
      return;
    }

    const timbres = window.KeyMatch.Config.timbres;
    const settings = timbres.find(function (timbre) { return timbre.id === timbreId; })
      || timbres.find(function (timbre) { return timbre.id === "soft-piano"; });
    const now = audioContext.currentTime;
    const envelope = settings.envelope;
    const duration = envelope.duration;
    const noteEnd = now + duration;
    const releaseStart = Math.max(now + envelope.attack + envelope.decay, noteEnd - envelope.release);
    const partialTotal = settings.partials.reduce(function (total, partial) {
      return total + partial.amplitude;
    }, 0);
    const oscillators = [];
    const nodes = [];
    const voiceGain = audioContext.createGain();
    nodes.push(voiceGain);

    voiceGain.gain.setValueAtTime(0.0001, now);
    voiceGain.gain.exponentialRampToValueAtTime(settings.level, now + envelope.attack);
    const sustainLevel = Math.max(settings.level * envelope.sustain, 0.0001);
    voiceGain.gain.exponentialRampToValueAtTime(sustainLevel, now + envelope.attack + envelope.decay);
    voiceGain.gain.setValueAtTime(sustainLevel, releaseStart);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);

    let output = voiceGain;
    if (settings.filter) {
      const filter = audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.Q.value = 0.7;
      filter.frequency.setValueAtTime(settings.filter.start, now);
      filter.frequency.exponentialRampToValueAtTime(settings.filter.end, noteEnd);
      voiceGain.connect(filter);
      output = filter;
      nodes.push(filter);
    }
    output.connect(masterGain);

    let vibratoOscillator = null;
    if (settings.vibrato) {
      vibratoOscillator = audioContext.createOscillator();
      vibratoOscillator.type = "sine";
      vibratoOscillator.frequency.setValueAtTime(settings.vibrato.rate, now);
      vibratoOscillator.start(now);
      oscillators.push(vibratoOscillator);
    }

    settings.partials.forEach(function (partial) {
      const oscillator = audioContext.createOscillator();
      const partialGain = audioContext.createGain();
      oscillator.type = partial.type || "sine";
      oscillator.frequency.setValueAtTime(frequency * partial.ratio, now);
      partialGain.gain.value = partial.amplitude / partialTotal;
      oscillator.connect(partialGain);
      partialGain.connect(voiceGain);
      oscillator.start(now);
      oscillators.push(oscillator);
      nodes.push(oscillator, partialGain);

      if (settings.vibrato) {
        const vibratoGain = audioContext.createGain();
        vibratoGain.gain.setValueAtTime(0, now);
        vibratoGain.gain.linearRampToValueAtTime(
          frequency * partial.ratio * settings.vibrato.depth,
          now + envelope.attack
        );
        vibratoOscillator.connect(vibratoGain);
        vibratoGain.connect(oscillator.frequency);
        nodes.push(vibratoGain);
      }
    });

    if (vibratoOscillator) {
      nodes.push(vibratoOscillator);
    }
    oscillators.forEach(function (oscillator) {
      oscillator.stop(noteEnd + 0.01);
    });
    oscillators[oscillators.length - 1].onended = function () {
      nodes.forEach(function (node) { node.disconnect(); });
    };
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
