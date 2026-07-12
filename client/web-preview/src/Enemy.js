import * as THREE from "three";

const STATE = Object.freeze({
  Idle: "Idle",
  Alert: "Alert",
  Shoot: "Shoot",
  Dead: "Dead",
});

export class Enemy {
  constructor(scene, position, playerRef) {
    this.scene = scene;
    this.playerRef = playerRef;
    this.maxHp = 40;
    this.hp = this.maxHp;
    this.state = STATE.Idle;
    this.alertRange = 18;
    this.shootRange = 16;
    this.shootCooldown = 0;
    this.fireInterval = 1.15;
    this.aimError = 0.55;
    this.flashT = 0;

    this.root = new THREE.Group();
    this.root.position.copy(position);

    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.85, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a2e2e })
    );
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.root.add(this.body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2222 })
    );
    head.position.y = 1.85;
    this.root.add(head);

    scene.add(this.root);
  }

  get alive() {
    return this.state !== STATE.Dead;
  }

  get position() {
    return this.root.position;
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flashT = 0.12;
    this.body.material.color.setHex(0xff8866);
    this.state = STATE.Alert;
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.state = STATE.Dead;
    this.root.rotation.z = Math.PI / 2;
    this.root.position.y = 0.35;
    this.body.material.color.setHex(0x2a1818);
    this.body.material.transparent = true;
    this.body.material.opacity = 0.55;
  }

  update(dt, onShootPlayer) {
    if (!this.alive) return;

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.body.material.color.setHex(0x5a2e2e);
      }
    }

    const player = this.playerRef();
    if (!player || player.hp <= 0) return;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    if (toPlayer.lengthSq() > 0) {
      toPlayer.normalize();
      const yaw = Math.atan2(toPlayer.x, toPlayer.z);
      this.root.rotation.y = yaw;
    }

    if (dist < this.alertRange) {
      this.state = dist < this.shootRange ? STATE.Shoot : STATE.Alert;
    } else if (this.state !== STATE.Idle) {
      this.state = STATE.Idle;
    }

    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    if (this.state === STATE.Shoot && this.shootCooldown <= 0) {
      this.shootCooldown = this.fireInterval;
      onShootPlayer?.(this, toPlayer);
    }
  }
}

export function spawnEnemyWave(scene, playerRef, count = 5) {
  const enemies = [];
  const spots = [
    [8, -8],
    [-9, -6],
    [10, 3],
    [-8, 7],
    [2, -11],
    [-3, 10],
  ];
  for (let i = 0; i < count; i++) {
    const [x, z] = spots[i % spots.length];
    const jitter = (Math.random() - 0.5) * 1.5;
    enemies.push(new Enemy(scene, new THREE.Vector3(x + jitter, 0, z + jitter), playerRef));
  }
  return enemies;
}
