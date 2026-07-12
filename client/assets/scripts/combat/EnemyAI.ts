import { _decorator, Component, Node, Vec3 } from 'cc';
import { Health } from './Health';

const { ccclass, property } = _decorator;

enum AiState {
  Idle = 'Idle',
  Alert = 'Alert',
  Shoot = 'Shoot',
  Dead = 'Dead',
}

@ccclass('EnemyAI')
export class EnemyAI extends Component {
  @property(Node)
  target: Node | null = null;

  @property(Health)
  health: Health | null = null;

  @property
  alertRange = 18;

  @property
  shootRange = 16;

  @property
  fireInterval = 1.15;

  private _state = AiState.Idle;
  private _cooldown = 0;

  onLoad() {
    this.health = this.health ?? this.getComponent(Health);
    this.node.on('died', this.onDied, this);
  }

  onDestroy() {
    this.node.off('died', this.onDied, this);
  }

  private onDied() {
    this._state = AiState.Dead;
    this.node.emit('enemy-died');
  }

  get alive() {
    return this._state !== AiState.Dead && (this.health?.alive ?? false);
  }

  update(dt: number) {
    if (!this.alive || !this.target) {
      return;
    }

    const selfPos = this.node.worldPosition;
    const targetPos = this.target.worldPosition;
    const dx = targetPos.x - selfPos.x;
    const dz = targetPos.z - selfPos.z;
    const dist = Math.hypot(dx, dz);
    const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;
    this.node.setRotationFromEuler(0, yaw, 0);

    if (dist < this.alertRange) {
      this._state = dist < this.shootRange ? AiState.Shoot : AiState.Alert;
    } else {
      this._state = AiState.Idle;
    }

    this._cooldown = Math.max(0, this._cooldown - dt);
    if (this._state === AiState.Shoot && this._cooldown <= 0) {
      this._cooldown = this.fireInterval;
      const dir = new Vec3(dx, 0, dz).normalize();
      this.node.emit('enemy-fire', dir);
    }
  }
}
