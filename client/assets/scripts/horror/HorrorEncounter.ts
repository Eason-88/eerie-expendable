import { _decorator, Component, Node } from 'cc';

const { ccclass, property } = _decorator;

/** Trigger volumes for train pig / scarecrow ritual (wire colliders in editor). */
@ccclass('HorrorEncounter')
export class HorrorEncounter extends Component {
  @property
  encounterId = 'pig';

  @property
  visibleDuration = 4;

  @property(Node)
  visualRoot: Node | null = null;

  private _triggered = false;
  private _timer = 0;

  trigger() {
    if (this._triggered) {
      return;
    }
    this._triggered = true;
    if (this.visualRoot) {
      this.visualRoot.active = true;
    }
    this._timer = this.visibleDuration;
    this.node.emit('horror-triggered', this.encounterId);
  }

  update(dt: number) {
    if (!this._triggered || this._timer <= 0) {
      return;
    }
    this._timer -= dt;
    if (this._timer <= 0 && this.visualRoot) {
      this.visualRoot.active = false;
      this.node.emit('horror-ended', this.encounterId);
    }
  }

  resetEncounter() {
    this._triggered = false;
    this._timer = 0;
    if (this.visualRoot) {
      this.visualRoot.active = false;
    }
  }
}
