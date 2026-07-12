import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/** Sniper telegraph + damage if player not in cover. */
@ccclass('SniperDirector')
export class SniperDirector extends Component {
  @property(Node)
  nest: Node | null = null;

  @property
  windup = 0.85;

  @property
  damage = 28;

  private _active = false;
  private _cleared = false;
  private _cooldown = 2.5;
  private _windupLeft = 0;

  startEncounter() {
    this._active = true;
    this._cleared = false;
    this.node.emit('sniper-started');
  }

  get cleared() {
    return this._cleared;
  }

  update(dt: number) {
    if (!this._active || this._cleared) {
      return;
    }
    // Nest reach + warning timing are driven by LevelRunner in the scene.
    this._cooldown = Math.max(0, this._cooldown - dt);
    if (this._windupLeft > 0) {
      this._windupLeft -= dt;
      if (this._windupLeft <= 0) {
        this.node.emit('sniper-fire');
        this._cooldown = 2.2;
      }
    } else if (this._cooldown <= 0) {
      this._windupLeft = this.windup;
      this.node.emit('sniper-warning');
    }
  }

  markCleared() {
    this._cleared = true;
    this._active = false;
    this.node.emit('sniper-cleared');
  }

  getNestPosition(out: Vec3): Vec3 {
    if (this.nest) {
      this.nest.getWorldPosition(out);
    } else {
      out.set(0, 0, 0);
    }
    return out;
  }
}
