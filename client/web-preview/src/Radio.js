/** Receive-only radio: can show HQ lines, cannot transmit. */
export class Radio {
  constructor({ onSubtitle, onBlockedTransmit, onSpeak }) {
    this.canTransmit = false;
    this._queue = [];
    this._current = null;
    this._timer = 0;
    this._nagTimer = 18;
    this._nagInterval = 22;
    this._enabledNag = true;
    this._onSubtitle = onSubtitle;
    this._onBlockedTransmit = onBlockedTransmit;
    this._onSpeak = onSpeak;
    this._seen = new Set();
  }

  push(id, speaker, text, duration = 4) {
    if (id && this._seen.has(id)) return;
    if (id) this._seen.add(id);
    this._queue.push({ id, speaker, text, duration });
  }

  tryTransmit() {
    if (!this.canTransmit) {
      this._onBlockedTransmit?.("对讲机损坏 · 只能接收，无法回话");
      return false;
    }
    return true;
  }

  update(dt) {
    if (this._current) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._current = null;
        this._onSubtitle?.(null);
        this._playNext();
      }
    } else {
      this._playNext();
    }

    if (this._enabledNag) {
      this._nagTimer -= dt;
      if (this._nagTimer <= 0) {
        this._nagTimer = this._nagInterval;
        this.push(
          null,
          "总部",
          "黑鹰7号，请立即报告状况。重复，黑鹰7号请回话。",
          3.5
        );
      }
    }
  }

  stopNag() {
    this._enabledNag = false;
  }

  _playNext() {
    if (this._current || this._queue.length === 0) return;
    this._current = this._queue.shift();
    this._timer = this._current.duration;
    this._onSubtitle?.(this._current);
    this._onSpeak?.(this._current.speaker, this._current.text);
  }
}
