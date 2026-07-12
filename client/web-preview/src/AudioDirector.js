/**
 * CS-like sample SFX + Edge neural TTS (fallback: speechSynthesis).
 * Radio lines go through a band-pass "walkie" filter.
 */
export class AudioDirector {
  constructor() {
    this.enabled = true;
    this.voEnabled = true;
    /** Radio / walkie VO on; progress toast VO off. */
    this.radioVoEnabled = true;
    this.progressVoEnabled = false;
    this.apiBase = "http://127.0.0.1:8000";
    this._ctx = null;
    this._footTimer = 0;
    this._speaking = false;
    this._voQueue = [];
    this._buffers = {};
    this._gunIdx = 0;
    this._ready = false;
    this._loadPromise = null;
  }

  unlock() {
    const ctx = this._ensureCtx();
    if (ctx.state === "suspended") ctx.resume();
    void this.preload();
  }

  _ensureCtx() {
    if (!this._ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AC();
    }
    return this._ctx;
  }

  async preload() {
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = this._loadAll();
    return this._loadPromise;
  }

  async _loadAll() {
    const ctx = this._ensureCtx();
    const files = {
      gunA: "audio/gunshot_a.wav",
      gunB: "audio/gunshot_b.wav",
      gunC: "audio/gunshot_c.wav",
      foot: "audio/footstep.wav",
      hit: "audio/hit.wav",
      reload: "audio/reload.wav",
    };
    await Promise.all(
      Object.entries(files).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          const arr = await res.arrayBuffer();
          this._buffers[key] = await ctx.decodeAudioData(arr.slice(0));
        } catch {
          /* procedural fallback later */
        }
      })
    );
    this._ready = true;
  }

  _playBuffer(key, { gain = 0.9, rate = 1, pan = 0 } = {}) {
    if (!this.enabled) return false;
    const ctx = this._ensureCtx();
    const buf = this._buffers[key];
    if (!buf) return false;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    const panner = ctx.createStereoPanner?.() ?? null;
    src.connect(g);
    if (panner) {
      panner.pan.value = pan;
      g.connect(panner);
      panner.connect(ctx.destination);
    } else {
      g.connect(ctx.destination);
    }
    src.start();
    return true;
  }

  /** Layered CS-like procedural fallback if WAV missing. */
  _procGunshot() {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const t0 = ctx.currentTime;
    const dur = 0.35;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      let s = 0;
      const crack = Math.exp(-t / 0.003);
      s += (Math.random() * 2 - 1) * 0.9 * crack;
      s += Math.sin(2 * Math.PI * 90 * t) * 0.7 * Math.exp(-t / 0.04);
      s += Math.sin(2 * Math.PI * 2100 * t) * 0.2 * Math.exp(-t / 0.05);
      if (t > 0.03) s += (Math.random() * 2 - 1) * 0.12 * Math.exp(-(t - 0.03) / 0.08);
      data[i] = Math.max(-1, Math.min(1, s));
    }
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    bp.type = "highshelf";
    bp.frequency.value = 2500;
    bp.gain.value = 4;
    src.buffer = buffer;
    g.gain.value = 0.85;
    src.connect(bp);
    bp.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
  }

  playGunshot() {
    void this.preload();
    const keys = ["gunA", "gunB", "gunC"];
    const key = keys[this._gunIdx % keys.length];
    this._gunIdx += 1;
    // Slight rate jitter so rapid M4A1 fire doesn't sound identical every shot
    const rate = 0.96 + Math.random() * 0.08;
    if (!this._playBuffer(key, { gain: 1.0, rate, pan: (Math.random() - 0.5) * 0.12 })) {
      this._procGunshot();
    }
  }

  playHit() {
    void this.preload();
    if (!this._playBuffer("hit", { gain: 0.75, rate: 0.95 + Math.random() * 0.1 })) {
      this._tone(90, 0.08, "square", 0.1);
    }
  }

  playFootstep() {
    void this.preload();
    if (
      !this._playBuffer("foot", {
        gain: 0.35,
        rate: 0.9 + Math.random() * 0.25,
        pan: (Math.random() - 0.5) * 0.3,
      })
    ) {
      this._noise(0.04, 0.05);
    }
  }

  playReload() {
    void this.preload();
    if (!this._playBuffer("reload", { gain: 0.55 })) {
      this._tone(400, 0.05, "square", 0.05);
    }
  }

  playUi() {
    this._tone(660, 0.05, "sine", 0.04);
  }

  _tone(freq, duration, type = "square", gain = 0.08) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  _noise(duration, gain = 0.12) {
    if (!this.enabled) return;
    const ctx = this._ensureCtx();
    const len = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    src.buffer = buffer;
    g.gain.value = gain;
    src.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  updateFootsteps(dt, moving) {
    if (!moving) {
      this._footTimer = 0;
      return;
    }
    this._footTimer -= dt;
    if (this._footTimer <= 0) {
      this.playFootstep();
      this._footTimer = 0.38;
    }
  }

  speak(speaker, text, { interrupt = false, radio = false } = {}) {
    if (!this.voEnabled) return;
    const line = { speaker, text, radio };
    if (interrupt) {
      window.speechSynthesis?.cancel();
      this._voQueue.length = 0;
      this._speaking = false;
    }
    this._voQueue.push(line);
    this._pumpVo();
  }

  announce(text) {
    if (!this.progressVoEnabled) return;
    this.speak("播报", text, { radio: false });
  }

  radioVo(speaker, text) {
    if (!this.radioVoEnabled) return;
    this.speak(speaker, text, { radio: true });
  }

  async _pumpVo() {
    if (this._speaking || this._voQueue.length === 0) return;
    const line = this._voQueue.shift();
    this._speaking = true;
    try {
      const ok = await this._playNeural(line);
      if (!ok) await this._playBrowserTts(line);
    } finally {
      this._speaking = false;
      this._pumpVo();
    }
  }

  async _playNeural(line) {
    try {
      const q = new URLSearchParams({
        text: line.text,
        speaker: line.speaker || "",
      });
      const res = await fetch(`${this.apiBase}/api/v1/tts/speak?${q}`);
      if (!res.ok) return false;
      const arr = await res.arrayBuffer();
      const ctx = this._ensureCtx();
      if (ctx.state === "suspended") await ctx.resume();
      const buf = await ctx.decodeAudioData(arr.slice(0));
      await this._playDecoded(buf, { radio: line.radio });
      return true;
    } catch {
      return false;
    }
  }

  _playDecoded(buffer, { radio = false } = {}) {
    return new Promise((resolve) => {
      const ctx = this._ensureCtx();
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = radio ? 0.85 : 0.95;
      if (radio) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 1800;
        bp.Q.value = 0.85;
        const hs = ctx.createBiquadFilter();
        hs.type = "highshelf";
        hs.frequency.value = 3200;
        hs.gain.value = 3;
        const dist = ctx.createWaveShaper();
        dist.curve = this._makeRadioCurve();
        src.connect(bp);
        bp.connect(hs);
        hs.connect(dist);
        dist.connect(g);
      } else {
        src.connect(g);
      }
      g.connect(ctx.destination);
      src.onended = () => resolve();
      src.start();
    });
  }

  _makeRadioCurve() {
    const n = 256;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * 1.8) * 0.95;
    }
    return curve;
  }

  _playBrowserTts(line) {
    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }
      const utter = new SpeechSynthesisUtterance(`${line.speaker}。${line.text}`);
      utter.lang = "zh-CN";
      utter.rate = 1.02;
      utter.pitch = line.speaker?.includes("总部") ? 0.92 : 1.0;
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => /xiaoxiao|yunxi|huihui|yaoyao|neural|中文|chinese/i.test(v.name)) ||
        voices.find((v) => v.lang?.startsWith("zh"));
      if (preferred) utter.voice = preferred;
      utter.onend = () => resolve();
      utter.onerror = () => resolve();
      window.speechSynthesis.speak(utter);
    });
  }
}

export const audio = new AudioDirector();
