import { _decorator, Component, input, Input, EventMouse, EventKeyboard, KeyCode, Vec3 } from 'cc';
import { Health } from './Health';
import { CoverUser } from './CoverSystem';
import { BulletPool } from './BulletPool';

const { ccclass, property } = _decorator;

/** Phase-1 shooter: fire on LMB / Space, reload on R. */
@ccclass('WeaponController')
export class WeaponController extends Component {
  @property(BulletPool)
  bulletPool: BulletPool | null = null;

  @property(Health)
  health: Health | null = null;

  @property(CoverUser)
  coverUser: CoverUser | null = null;

  @property
  magSize = 30;

  @property
  damage = 14;

  @property
  fireInterval = 0.12;

  @property
  muzzleHeight = 1.35;

  @property
  muzzleForward = 0.55;

  private _ammo = 30;
  private _cooldown = 0;
  private _reload = 0;
  private _mouseDown = false;

  onLoad() {
    this._ammo = this.magSize;
    this.health = this.health ?? this.getComponent(Health);
    this.coverUser = this.coverUser ?? this.getComponent(CoverUser);
  }

  onEnable() {
    input.on(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.on(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  onDisable() {
    input.off(Input.EventType.MOUSE_DOWN, this.onMouseDown, this);
    input.off(Input.EventType.MOUSE_UP, this.onMouseUp, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private onMouseDown(e: EventMouse) {
    if (e.getButton() === 0) {
      this._mouseDown = true;
    }
  }

  private onMouseUp(e: EventMouse) {
    if (e.getButton() === 0) {
      this._mouseDown = false;
    }
  }

  private onKeyDown(e: EventKeyboard) {
    if (e.keyCode === KeyCode.KEY_R) {
      this.reload();
    }
  }

  update(dt: number) {
    this._cooldown = Math.max(0, this._cooldown - dt);
    if (this._reload > 0) {
      this._reload -= dt;
      if (this._reload <= 0) {
        this._ammo = this.magSize;
        this.node.emit('ammo-changed', this._ammo);
      }
    }

    if (this.health) {
      this.health.inCover = this.coverUser?.inCover ?? false;
    }

    const wantFire = this._mouseDown || input.getKey(KeyCode.SPACE);
    if (
      wantFire &&
      this._cooldown <= 0 &&
      this._reload <= 0 &&
      this._ammo > 0 &&
      (this.health?.alive ?? true)
    ) {
      this.fire();
    }
  }

  private fire() {
    this._cooldown = this.fireInterval;
    this._ammo -= 1;
    this.node.emit('ammo-changed', this._ammo);

    const origin = this.node.worldPosition.clone();
    origin.y += this.muzzleHeight;
    const forward = this.node.forward.clone().multiplyScalar(-1);
    origin.add(forward.clone().multiplyScalar(this.muzzleForward));
    this.bulletPool?.spawn(origin, forward, 85, this.damage, true);

    if (this._ammo <= 0) {
      this.reload();
    }
  }

  private reload() {
    if (this._reload > 0 || this._ammo === this.magSize) {
      return;
    }
    this._reload = 1.35;
  }

  get ammo() {
    return this._ammo;
  }
}
