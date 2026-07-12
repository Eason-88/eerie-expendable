import { _decorator, Component } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('Health')
export class Health extends Component {
  @property
  maxHp = 100;

  @property
  current = 100;

  @property
  coverDamageMul = 0.25;

  inCover = false;

  onLoad() {
    this.current = this.maxHp;
  }

  get alive() {
    return this.current > 0;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) {
      return false;
    }
    const finalAmount = this.inCover ? amount * this.coverDamageMul : amount;
    this.current = Math.max(0, this.current - finalAmount);
    this.node.emit('damaged', finalAmount, this.current);
    if (this.current <= 0) {
      this.node.emit('died');
      return true;
    }
    return false;
  }

  reset() {
    this.current = this.maxHp;
  }
}
