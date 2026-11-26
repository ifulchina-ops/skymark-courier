// Skymark Courier — synthesised sound, no audio files.
// A low engine drone (two detuned oscillators through a low-pass filter), a
// bright chime for rings, a thud for impacts, a little fanfare on level-up.
// Everything is guarded: no AudioContext, no sound, no crash.
export function createAudio() {
  let ctx = null;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;
  let started = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineOsc1 = ctx.createOscillator();
      engineOsc1.type = 'sawtooth';
      engineOsc1.frequency.value = 68;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'square';
      engineOsc2.frequency.value = 34;
      const osc2Gain = ctx.createGain();
      osc2Gain.gain.value = 0.4;
      engineOsc1.connect(engineFilter);
      engineOsc2.connect(osc2Gain);
      osc2Gain.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc1.start();
      engineOsc2.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + when;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    } catch {
      // Sound is garnish; never let it break the game.
    }
  }

  return {
    unlock() {
      if (ensure() && ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    setEngine(throttle, speed) {
      if (!started || muted) {
        if (engineGain) engineGain.gain.value = 0;
        return;
      }
      try {
        const t = ctx.currentTime;
        engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05, t, 0.1);
        engineOsc1.frequency.setTargetAtTime(58 + throttle * 46 + speed * 0.12, t, 0.1);
        engineOsc2.frequency.setTargetAtTime(29 + throttle * 23 + speed * 0.06, t, 0.1);
        engineFilter.frequency.setTargetAtTime(320 + throttle * 500, t, 0.1);
      } catch {
        // Ignore audio errors mid-flight.
      }
    },
    ring() {
      tone(880, 0.35, 'sine', 0.22);
      tone(1318, 0.5, 'sine', 0.16, 0.07);
    },
    hit() {
      tone(90, 0.4, 'sawtooth', 0.3);
      tone(55, 0.5, 'square', 0.2, 0.02);
    },
    level() {
      tone(523, 0.22, 'triangle', 0.2);
      tone(659, 0.22, 'triangle', 0.2, 0.1);
      tone(784, 0.4, 'triangle', 0.22, 0.2);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
