import { _decorator, Component, Node } from 'cc';
import { Health } from '../combat/Health';

const { ccclass, property } = _decorator;

/** Phase-1 combat HUD bindings — wire Label nodes in Cocos editor. */
@ccclass('CombatHud')
export class CombatHud extends Component {
  @property(Node)
  hpFill: Node | null = null;

  @property(Health)
  playerHealth: Health | null = null;

  @property
  ammo = 30;

  @property
  enemiesAlive = 0;

  @property
  enemiesTotal = 0;

  private _phase = 'Explore';

  setPhase(phase: string) {
    this._phase = phase;
    this.node.emit('hud-phase', phase);
  }

  setAmmo(mag: number) {
    this.ammo = mag;
    this.node.emit('hud-ammo', mag);
  }

  setEnemies(alive: number, total: number) {
    this.enemiesAlive = alive;
    this.enemiesTotal = total;
    this.node.emit('hud-enemies', alive, total);
  }

  flashHit() {
    this.node.emit('hud-hit');
  }

  update() {
    if (this.playerHealth && this.hpFill) {
      const pct = this.playerHealth.current / this.playerHealth.maxHp;
      const scale = this.hpFill.scale;
      this.hpFill.setScale(pct, scale.y, scale.z);
    }
  }
}
