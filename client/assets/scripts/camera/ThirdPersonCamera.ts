import { _decorator, Component, Node, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * Pseudo-3D third-person follow camera.
 * Visual target: repo `assets/view-pseudo-3d.png`.
 */
@ccclass('ThirdPersonCamera')
export class ThirdPersonCamera extends Component {
  @property(Node)
  target: Node | null = null;

  @property
  followDistance = 8;

  @property
  height = 3.2;

  @property
  lookAtHeight = 1.4;

  @property
  followLerp = 8;

  private readonly _desired = new Vec3();
  private readonly _lookAt = new Vec3();
  private readonly _pos = new Vec3();

  lateUpdate(dt: number) {
    if (!this.target) {
      return;
    }

    const targetPos = this.target.worldPosition;
    const forward = this.target.forward;

    this._desired.set(
      targetPos.x - forward.x * this.followDistance,
      targetPos.y + this.height,
      targetPos.z - forward.z * this.followDistance,
    );

    this.node.getWorldPosition(this._pos);
    const t = 1 - Math.exp(-this.followLerp * dt);
    Vec3.lerp(this._pos, this._pos, this._desired, t);
    this.node.setWorldPosition(this._pos);

    this._lookAt.set(targetPos.x, targetPos.y + this.lookAtHeight, targetPos.z);
    this.node.lookAt(this._lookAt);
  }
}
