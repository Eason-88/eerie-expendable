import * as THREE from "three";

const STATE = Object.freeze({
  Idle: "Idle",
  Advance: "Advance",
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
    this.moveSpeed = 0;
    this.advanceEnabled = false;
    this.holdDistance = 7;
    this.baseColor = 0x5a2e2e;
    this._spawnDelay = 0;

    this.root = new THREE.Group();
    this.root.position.copy(position);

    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.85, 4, 8),
      new THREE.MeshStandardMaterial({ color: this.baseColor })
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

  setTeamLook(colorHex) {
    this.baseColor = colorHex;
    this.body.material.color.setHex(colorHex);
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

  update(dt, onShootPlayer, worldCollision = null) {
    if (!this.alive) return;

    if (this._spawnDelay > 0) {
      this._spawnDelay -= dt;
      // Still visible while waiting — they just hold, then start walking
      if (this._spawnDelay > 0) {
        const player = this.playerRef();
        if (player) {
          const face = new THREE.Vector3().subVectors(player.position, this.position);
          face.y = 0;
          if (face.lengthSq() > 0) {
            this.root.rotation.y = Math.atan2(face.x, face.z);
          }
        }
        return;
      }
    }

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.body.material.color.setHex(this.baseColor);
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

    // Slow advance toward player (no teleport)
    if (this.advanceEnabled && this.moveSpeed > 0 && dist > this.holdDistance) {
      this.state = STATE.Advance;
      const step = Math.min(this.moveSpeed * dt, dist - this.holdDistance);
      const nextX = this.root.position.x + toPlayer.x * step;
      const nextZ = this.root.position.z + toPlayer.z * step;
      const resolved = worldCollision
        ? worldCollision.resolveCircleXZ(nextX, nextZ, 0.4)
        : { x: nextX, z: nextZ };
      this.root.position.x = resolved.x;
      this.root.position.z = resolved.z;
    } else if (dist < this.shootRange) {
      this.state = STATE.Shoot;
    } else if (dist < this.alertRange) {
      this.state = STATE.Alert;
    } else if (!this.advanceEnabled) {
      this.state = STATE.Idle;
    }

    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const canShoot =
      this.state === STATE.Shoot ||
      (this.advanceEnabled && dist <= this.shootRange);
    if (canShoot && this.shootCooldown <= 0 && dist <= this.shootRange) {
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

/**
 * Spawn former allies south of the base (player entry direction)
 * and let them walk in slowly.
 */
export function spawnBetrayerSquad(scene, playerRef, entryHintPos) {
  const enemies = [];
  // Entry corridor is from the south (larger Z → smaller Z).
  const baseZ = Math.min(entryHintPos?.z ?? -30, -28) + 8;
  const lanes = [-5.5, -3, -0.5, 2, 4.5, 7];
  for (let i = 0; i < lanes.length; i++) {
    const x = lanes[i] + (Math.random() - 0.5) * 0.8;
    const z = baseZ + i * 1.4 + Math.random() * 1.2;
    const e = new Enemy(scene, new THREE.Vector3(x, 0, z), playerRef);
    e.setTeamLook(0x2f4a3a);
    e.maxHp = 45;
    e.hp = 45;
    e.alertRange = 32;
    e.shootRange = 18;
    e.fireInterval = 1.05;
    e.moveSpeed = 1.55 + Math.random() * 0.35;
    e.advanceEnabled = true;
    e.holdDistance = 6.5 + Math.random() * 1.5;
    // Stagger start so the line walks in as a squad, not a teleport dump
    e._spawnDelay = i * 0.45;
    enemies.push(e);
  }
  return enemies;
}
