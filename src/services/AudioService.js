export class AudioService {
  #audioCtx;
  #muted;

  constructor() {
    this.#audioCtx = null;
    this.#muted = localStorage.getItem('sound_muted') === 'true';
  }

  #initContext() {
    if (!this.#audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.#audioCtx = new AudioContextClass();
      }
    }
    if (this.#audioCtx && this.#audioCtx.state === 'suspended') {
      this.#audioCtx.resume();
    }
  }

  isMuted() {
    return this.#muted;
  }

  toggleMute() {
    this.#muted = !this.#muted;
    localStorage.setItem('sound_muted', this.#muted.toString());
    return this.#muted;
  }

  playClick() {
    if (this.#muted) return;
    this.#initContext();
    if (!this.#audioCtx) return;

    const osc = this.#audioCtx.createOscillator();
    const gain = this.#audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.#audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.#audioCtx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.15, this.#audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.#audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.#audioCtx.destination);

    osc.start();
    osc.stop(this.#audioCtx.currentTime + 0.05);
  }

  playSuccess() {
    if (this.#muted) return;
    this.#initContext();
    if (!this.#audioCtx) return;

    const now = this.#audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, index) => {
      const osc = this.#audioCtx.createOscillator();
      const gain = this.#audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const startTime = now + index * 0.08;
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.#audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  playCombo(multiplier = 2) {
    if (this.#muted) return;
    this.#initContext();
    if (!this.#audioCtx) return;

    const now = this.#audioCtx.currentTime;
    const baseNotes = multiplier >= 3 ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];

    baseNotes.forEach((freq, index) => {
      const osc = this.#audioCtx.createOscillator();
      const gain = this.#audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq * 1.2;

      const startTime = now + index * 0.06;
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(this.#audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  playError() {
    if (this.#muted) return;
    this.#initContext();
    if (!this.#audioCtx) return;

    const osc = this.#audioCtx.createOscillator();
    const gain = this.#audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.#audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, this.#audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, this.#audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.#audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.#audioCtx.destination);

    osc.start();
    osc.stop(this.#audioCtx.currentTime + 0.2);
  }

  playFanfare() {
    if (this.#muted) return;
    this.#initContext();
    if (!this.#audioCtx) return;

    const now = this.#audioCtx.currentTime;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50];

    arpeggio.forEach((freq, idx) => {
      const osc = this.#audioCtx.createOscillator();
      const gain = this.#audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + idx * 0.12;
      const duration = idx === arpeggio.length - 1 ? 0.6 : 0.2;

      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.#audioCtx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }
}
