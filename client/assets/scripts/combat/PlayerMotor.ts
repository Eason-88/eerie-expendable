import { _decorator, Component, input, Input, EventKeyboard, KeyCode, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * Phase-0 capsule controller (WASD / arrows). Replace with combat locomotion later.
 */
@ccclass('PlayerMotor')
export class PlayerMotor extends Component {
  @property
  moveSpeed = 4.5;

  @property
  turnSpeed = 10;

  private readonly _input = new Vec3();
  private readonly _velocity = new Vec3();
  private readonly _keys = new Set<KeyCode>();

  onEnable() {
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  onDisable() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    this._keys.clear();
  }

  private onKeyDown(event: EventKeyboard) {
    this._keys.add(event.keyCode);
  }

  private onKeyUp(event: EventKeyboard) {
    this._keys.delete(event.keyCode);
  }

  update(dt: number) {
    this._input.set(0, 0, 0);

    if (this._keys.has(KeyCode.KEY_W) || this._keys.has(KeyCode.ARROW_UP)) {
      this._input.z -= 1;
    }
    if (this._keys.has(KeyCode.KEY_S) || this._keys.has(KeyCode.ARROW_DOWN)) {
      this._input.z += 1;
    }
    if (this._keys.has(KeyCode.KEY_A) || this._keys.has(KeyCode.ARROW_LEFT)) {
      this._input.x -= 1;
    }
    if (this._keys.has(KeyCode.KEY_D) || this._keys.has(KeyCode.ARROW_RIGHT)) {
      this._input.x += 1;
    }

    if (this._input.lengthSqr() > 0) {
      this._input.normalize();
      Vec3.multiplyScalar(this._velocity, this._input, this.moveSpeed * dt);
      const pos = this.node.worldPosition;
      this.node.setWorldPosition(pos.x + this._velocity.x, pos.y, pos.z + this._velocity.z);

      const yaw = Math.atan2(this._input.x, this._input.z);
      const current = this.node.eulerAngles;
      const lerpedY = this.lerpAngle(current.y, (yaw * 180) / Math.PI, 1 - Math.exp(-this.turnSpeed * dt));
      this.node.setRotationFromEuler(0, lerpedY, 0);
    }
  }

  private lerpAngle(from: number, to: number, t: number): number {
    let delta = ((to - from + 540) % 360) - 180;
    return from + delta * t;
  }
}
