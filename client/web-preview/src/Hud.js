import { audio } from "./AudioDirector.js";

export class Hud {
  constructor() {
    this.phaseEl = document.getElementById("phase");
    this.hpFill = document.getElementById("hp-fill");
    this.hpText = document.getElementById("hp-text");
    this.ammoEl = document.getElementById("ammo");
    this.enemiesEl = document.getElementById("enemies");
    this.objEl = document.getElementById("objective");
    this.msgEl = document.getElementById("msg");
    this.apiEl = document.getElementById("api");
    this.radioEl = document.getElementById("radio-line");
    this.radioBox = document.getElementById("radio");
    this.vignette = document.getElementById("hit-vignette");
    this.winOverlay = document.getElementById("win-overlay");
    this.enemiesRow = document.getElementById("enemies-row");
    this._msgTimer = 0;
  }

  setApi(text) {
    if (this.apiEl) this.apiEl.textContent = text;
  }

  setSync(text) {
    const el = document.getElementById("sync");
    if (el) el.textContent = text;
  }

  setPhase(phase) {
    if (this.phaseEl) this.phaseEl.textContent = phase;
  }

  setObjective(text) {
    if (this.objEl) this.objEl.textContent = text;
  }

  setHp(current, max) {
    const pct = Math.max(0, Math.min(1, current / max));
    this.hpFill.style.width = `${pct * 100}%`;
    this.hpText.textContent = String(Math.ceil(current));
    this.hpFill.style.background =
      pct > 0.35
        ? "linear-gradient(90deg, #7dcf8a, #d4ef7a)"
        : "linear-gradient(90deg, #d45a4a, #efb07a)";
  }

  setAmmo(mag, reserveLabel = "∞") {
    this.ammoEl.textContent = `${mag} / ${reserveLabel}`;
  }

  setEnemies(alive, total) {
    if (!this.enemiesEl) return;
    this.enemiesEl.textContent = `${alive} / ${total}`;
    if (this.enemiesRow) {
      this.enemiesRow.classList.toggle("hidden", total <= 0);
    }
  }

  setRadio(line) {
    if (!this.radioEl || !this.radioBox) return;
    if (!line) {
      this.radioBox.classList.add("idle");
      this.radioEl.textContent = "频道静默 · 只能接收";
      return;
    }
    this.radioBox.classList.remove("idle");
    this.radioEl.textContent = `[${line.speaker}] ${line.text}`;
  }

  flashHit() {
    this.vignette.classList.add("active");
    window.setTimeout(() => this.vignette.classList.remove("active"), 120);
  }

  /** Bottom-left progress toast (text only; VO gated by audio.progressVoEnabled). */
  message(text, duration = 2.4, { speak = false } = {}) {
    this.msgEl.textContent = text;
    this._msgTimer = duration;
    if (speak && text) audio.announce(text);
  }

  update(dt) {
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0) {
        this.msgEl.textContent = "";
      }
    }
  }

  showWin(show) {
    this.winOverlay.classList.toggle("hidden", !show);
  }
}
