export class Hud {
  constructor() {
    this.phaseEl = document.getElementById("phase");
    this.hpFill = document.getElementById("hp-fill");
    this.hpText = document.getElementById("hp-text");
    this.ammoEl = document.getElementById("ammo");
    this.enemiesEl = document.getElementById("enemies");
    this.msgEl = document.getElementById("msg");
    this.apiEl = document.getElementById("api");
    this.vignette = document.getElementById("hit-vignette");
    this.winOverlay = document.getElementById("win-overlay");
    this._msgTimer = 0;
  }

  setApi(text) {
    this.apiEl.textContent = text;
  }

  setPhase(phase) {
    this.phaseEl.textContent = phase;
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
    this.enemiesEl.textContent = `${alive} / ${total}`;
  }

  flashHit() {
    this.vignette.classList.add("active");
    window.setTimeout(() => this.vignette.classList.remove("active"), 120);
  }

  message(text, duration = 2.2) {
    this.msgEl.textContent = text;
    this._msgTimer = duration;
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
