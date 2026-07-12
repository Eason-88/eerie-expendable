import * as THREE from "three";
import { createTacticalSoldier, applyAttackRiflePose } from "./CharacterFactory.js";
import { audio } from "./AudioDirector.js";

const STATE = Object.freeze({
  Idle: "Idle",
  Advance: "Advance",
  Alert: "Alert",
  Shoot: "Shoot",
  Dead: "Dead",
});

export class Enemy {
  constructor(scene, position, playerRef, kind = "enemy") {
    this.scene = scene;
    this.playerRef = playerRef;
    this.maxHp = 40;
    this.hp = this.maxHp;
    this.state = STATE.Idle;
    this.alertRange = 18;
    this.shootRange = 16;
    this.shootCooldown = 0;
    this.fireInterval = 1.15;
    this.aimError = 0.22;
    this.flashT = 0;
    this.moveSpeed = 0;
    this.advanceEnabled = false;
    this.holdDistance = 7;
    this._spawnDelay = 0;
    this.kind = kind;

    const built = createTacticalSoldier(kind);
    this.root = built.root;
    this.root.position.copy(position);
    this.body = built.body;
    this.muzzleObj = built.muzzle;
    this.rifle = built.rifle;
    this.anim = built.anim ?? null;
    this.model = built.model ?? null;
    this.weaponMount = built.weaponMount ?? null;
    this.fromGltf = Boolean(built.fromGltf);
    this._baseMats = [];
    this.root.traverse((o) => {
      if (o.isMesh && o.material?.color && o.name !== "hitProxy") {
        this._baseMats.push({ mesh: o, color: o.material.color.clone() });
      }
    });

    scene.add(this.root);
  }

  get alive() {
    return this.state !== STATE.Dead;
  }

  get position() {
    return this.root.position;
  }

  setTeamLook() {
    // visual already set by kind; kept for API compat
  }

  takeDamage(amount) {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flashT = 0.12;
    for (const entry of this._baseMats) {
      entry.mesh.material.color.setHex(0xff8866);
    }
    this.state = STATE.Alert;
    audio.playHit();
    if (this.hp <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  die() {
    this.state = STATE.Dead;
    this.anim?.set("Idle");
    this.root.rotation.z = Math.PI / 2;
    this.root.position.y = 0.2;
    for (const entry of this._baseMats) {
      if (entry.mesh.name === "hitProxy") continue;
      entry.mesh.material.transparent = true;
      entry.mesh.material.opacity = 0.55;
      entry.mesh.material.color.setHex(0x2a1818);
    }
  }

  update(dt, onShootPlayer, worldCollision = null) {
    if (!this.alive) return;

    if (this._spawnDelay > 0) {
      this._spawnDelay -= dt;
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
        for (const entry of this._baseMats) {
          entry.mesh.material.color.copy(entry.color);
        }
      }
    }

    const player = this.playerRef();
    if (!player || player.hp <= 0) return;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position);
    const dist = toPlayer.length();
    toPlayer.y = 0;
    if (toPlayer.lengthSq() > 0) {
      toPlayer.normalize();
      this.root.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    // Hip-fire pitch toward player's chest
    if (this.weaponMount && player) {
      const dx = player.position.x - this.position.x;
      const dy = player.position.y + 1.15 - (this.position.y + 1.12);
      const dz = player.position.z - this.position.z;
      const horiz = Math.hypot(dx, dz) || 1;
      this.weaponMount.rotation.x = -Math.atan2(dy, horiz);
    }

    let advancing = false;
    if (this.advanceEnabled && this.moveSpeed > 0 && dist > this.holdDistance) {
      advancing = true;
      this.state = STATE.Advance;
      const step = Math.min(this.moveSpeed * dt, dist - this.holdDistance);
      const nextX = this.root.position.x + toPlayer.x * step;
      const nextZ = this.root.position.z + toPlayer.z * step;
      const resolved = worldCollision
        ? worldCollision.resolveCircleXZ(nextX, nextZ, 0.4)
        : { x: nextX, z: nextZ };
      this.root.position.x = resolved.x;
      this.root.position.z = resolved.z;
      this.anim?.set("Walk");
    } else if (dist < this.shootRange) {
      this.state = STATE.Shoot;
      this.anim?.set("Idle");
    } else if (dist < this.alertRange) {
      this.state = STATE.Alert;
      this.anim?.set("Idle");
    } else if (!this.advanceEnabled) {
      this.state = STATE.Idle;
      this.anim?.set("Idle");
    }

    this.anim?.update(dt);
    if (this.fromGltf) applyAttackRiflePose(this.model);

    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    const canShoot =
      this.state === STATE.Shoot ||
      (this.advanceEnabled && dist <= this.shootRange) ||
      advancing;
    if (canShoot && this.shootCooldown <= 0 && dist <= this.shootRange) {
      this.shootCooldown = this.fireInterval;
      onShootPlayer?.(this);
      audio.playGunshot();
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
    enemies.push(
      new Enemy(scene, new THREE.Vector3(x + jitter, 0, z + jitter), playerRef, "enemy")
    );
  }
  return enemies;
}

export function spawnBetrayerSquad(scene, playerRef, entryHintPos) {
  const enemies = [];
  const baseZ = Math.min(entryHintPos?.z ?? -30, -28) + 8;
  const lanes = [-5.5, -3, -0.5, 2, 4.5, 7];
  for (let i = 0; i < lanes.length; i++) {
    const x = lanes[i] + (Math.random() - 0.5) * 0.8;
    const z = baseZ + i * 1.4 + Math.random() * 1.2;
    const e = new Enemy(scene, new THREE.Vector3(x, 0, z), playerRef, "allyHostile");
    e.maxHp = 45;
    e.hp = 45;
    e.alertRange = 32;
    e.shootRange = 18;
    e.fireInterval = 1.05;
    e.moveSpeed = 1.55 + Math.random() * 0.35;
    e.advanceEnabled = true;
    e.holdDistance = 6.5 + Math.random() * 1.5;
    e._spawnDelay = i * 0.45;
    enemies.push(e);
  }
  return enemies;
}
