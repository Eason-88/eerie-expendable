import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

export interface RadioLine {
  id?: string;
  speaker: string;
  text: string;
  duration: number;
}

/** Receive-only radio. Phase-2 rule: canTransmit stays false in level 1. */
@ccclass('RadioReceiver')
export class RadioReceiver extends Component {
  @property
  canTransmit = false;

  @property
  nagInterval = 22;

  private _queue: RadioLine[] = [];
  private _current: RadioLine | null = null;
  private _timer = 0;
  private _nagTimer = 12;
  private _nagEnabled = true;
  private readonly _seen = new Set<string>();

  push(line: RadioLine) {
    if (line.id && this._seen.has(line.id)) {
      return;
    }
    if (line.id) {
      this._seen.add(line.id);
    }
    this._queue.push(line);
  }

  tryTransmit(): boolean {
    if (!this.canTransmit) {
      this.node.emit('radio-blocked', '对讲机损坏 · 只能接收，无法回话');
      return false;
    }
    return true;
  }

  stopNag() {
    this._nagEnabled = false;
  }

  update(dt: number) {
    if (this._current) {
      this._timer -= dt;
      if (this._timer <= 0) {
        this._current = null;
        this.node.emit('radio-subtitle', null);
        this._playNext();
      }
    } else {
      this._playNext();
    }

    if (this._nagEnabled) {
      this._nagTimer -= dt;
      if (this._nagTimer <= 0) {
        this._nagTimer = this.nagInterval;
        this.push({
          speaker: '总部',
          text: '黑鹰7号，请立即报告状况。重复，黑鹰7号请回话。',
          duration: 3.5,
        });
      }
    }
  }

  private _playNext() {
    if (this._current || this._queue.length === 0) {
      return;
    }
    this._current = this._queue.shift() ?? null;
    if (!this._current) {
      return;
    }
    this._timer = this._current.duration;
    this.node.emit('radio-subtitle', this._current);
  }
}
