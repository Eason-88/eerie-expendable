import { _decorator, Component, Vec3, input, Input, EventKeyboard, KeyCode } from 'cc';

const { ccclass, property } = _decorator;

/** Cover spot the player can snap into (E). */
@ccclass('CoverSpot')
export class CoverSpot extends Component {
  @property
  interactRadius = 1.6;

  occupied = false;

  getInteractPosition(out: Vec3): Vec3 {
    this.node.getWorldPosition(out);
    out.y = 0;
    return out;
  }
}

@ccclass('CoverUser')
export class CoverUser extends Component {
  @property([CoverSpot])
  covers: CoverSpot[] = [];

  inCover = false;
  current: CoverSpot | null = null;

  private _eDown = false;

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  private onKeyDown(e: EventKeyboard) {
    if (e.keyCode === KeyCode.KEY_E && !this._eDown) {
      this._eDown = true;
      this.toggleCover();
    }
  }

  private onKeyUp(e: EventKeyboard) {
    if (e.keyCode === KeyCode.KEY_E) {
      this._eDown = false;
    }
  }

  private toggleCover() {
    if (this.inCover && this.current) {
      this.current.occupied = false;
      this.current = null;
      this.inCover = false;
      this.node.emit('cover-changed', false);
      return;
    }

    const pos = this.node.worldPosition;
    let best: CoverSpot | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const cover of this.covers) {
      if (!cover || cover.occupied) continue;
      const cp = new Vec3();
      cover.getInteractPosition(cp);
      const d = Vec3.distance(pos, cp);
      if (d < cover.interactRadius && d < bestDist) {
        best = cover;
        bestDist = d;
      }
    }
    if (!best) {
      return;
    }
    this.current = best;
    best.occupied = true;
    this.inCover = true;
    const snap = new Vec3();
    best.getInteractPosition(snap);
    this.node.setWorldPosition(snap);
    this.node.emit('cover-changed', true);
  }
}
