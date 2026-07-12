import { _decorator, Component, Prefab, Node, Vec3, instantiate } from 'cc';
import { ObjectPool } from '../core/ObjectPool';

const { ccclass, property } = _decorator;

interface BulletActor {
  node: Node;
  velocity: Vec3;
  life: number;
  damage: number;
  fromPlayer: boolean;
}

@ccclass('BulletPool')
export class BulletPool extends Component {
  @property(Prefab)
  bulletPrefab: Prefab | null = null;

  @property
  poolSize = 40;

  private _pool: ObjectPool<BulletActor> | null = null;

  onLoad() {
    if (!this.bulletPrefab) {
      return;
    }
    const prefab = this.bulletPrefab;
    this._pool = new ObjectPool<BulletActor>(
      () => {
        const node = instantiate(prefab);
        node.active = false;
        this.node.addChild(node);
        return {
          node,
          velocity: new Vec3(),
          life: 0,
          damage: 0,
          fromPlayer: true,
        };
      },
      this.poolSize,
      (item) => {
        item.node.active = false;
      },
    );
  }

  spawn(origin: Vec3, direction: Vec3, speed: number, damage: number, fromPlayer: boolean) {
    if (!this._pool) {
      return;
    }
    const bullet = this._pool.acquire();
    bullet.node.active = true;
    bullet.node.setWorldPosition(origin);
    Vec3.multiplyScalar(bullet.velocity, direction, speed);
    bullet.life = 0.9;
    bullet.damage = damage;
    bullet.fromPlayer = fromPlayer;
  }

  update(dt: number) {
    this._pool?.forEachActive((bullet) => {
      bullet.life -= dt;
      if (bullet.life <= 0) {
        this._pool?.release(bullet);
        return;
      }
      const pos = bullet.node.worldPosition;
      bullet.node.setWorldPosition(
        pos.x + bullet.velocity.x * dt,
        pos.y + bullet.velocity.y * dt,
        pos.z + bullet.velocity.z * dt,
      );
      // Hit tests are wired by a CombatDirector in the scene (phase 1+).
    });
  }
}
