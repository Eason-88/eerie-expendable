import * as THREE from "three";
import { findNearestCover } from "./Cover.js";

export class Player {
  constructor(scene) {
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.moveSpeed = 4.8;
    this.aimYaw = 0;
    this.aimPitch = 0.12;
    this.magSize = 30;
    this.ammo = this.magSize;
    this.fireCooldown = 0;
    this.fireInterval = 0.12;
    this.reloadTime = 0;
    this.inCover = false;
    this.cover = null;
    this.damageFlash = 0;

    this.root = new THREE.Group();
    this.body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.9, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x1c2420 })
    );
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.root.add(this.body);
    scene.add(this.root);

    this.keys = new Set();
    this.mouseDown = false;
    this._wish = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
  }

  get position() {
    return this.root.position;
  }

  get muzzleWorld() {
    const origin = this.root.position.clone();
    origin.y += this.inCover ? 1.55 : 1.35;
    const forward = this.getAimForward();
    origin.addScaledVector(forward, 0.55);
    return origin;
  }

  getAimForward() {
    const cy = Math.cos(this.aimYaw);
    const sy = Math.sin(this.aimYaw);
    const cp = Math.cos(this.aimPitch);
    const sp = Math.sin(this.aimPitch);
    return new THREE.Vector3(sy * cp, -sp, cy * cp).normalize();
  }

  bindInput(dom) {
    window.addEventListener("keydown", (e) => {
      this.keys.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.mouseDown = true;
      if (document.pointerLockElement !== dom) {
        dom.requestPointerLock?.();
      }
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    window.addEventListener("mousemove", (e) => {
      if (document.pointerLockElement !== dom) return;
      this.aimYaw -= e.movementX * 0.0022;
      this.aimPitch = THREE.MathUtils.clamp(
        this.aimPitch + e.movementY * 0.0016,
        -0.45,
        0.55
      );
    });
  }

  takeDamage(amount, hud) {
    if (this.hp <= 0) return;
    if (this.inCover) {
      amount *= 0.25;
    }
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlash = 0.12;
    this.body.material.color.setHex(0x803030);
    hud?.flashHit();
  }

  tryToggleCover(covers, hud) {
    if (this.inCover) {
      this.cover.occupied = false;
      this.cover = null;
      this.inCover = false;
      hud.message("离开掩体");
      return;
    }
    const near = findNearestCover(covers, this.position);
    if (!near) {
      hud.message("附近没有掩体");
      return;
    }
    this.cover = near;
    near.occupied = true;
    this.inCover = true;
    this.root.position.copy(near.interactPos);
    hud.message("进入掩体 · 可露头射击");
  }

  tryReload(hud) {
    if (this.reloadTime > 0 || this.ammo === this.magSize) return;
    this.reloadTime = 1.35;
    hud.message("换弹…");
  }

  update(dt, covers, hud, combat, worldCollision = null) {
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.reloadTime > 0) {
      this.reloadTime -= dt;
      if (this.reloadTime <= 0) {
        this.ammo = this.magSize;
        hud.message("换弹完成");
      }
    }

    if (this.keys.has("KeyE")) {
      // edge-trigger via latch
      if (!this._eLatch) {
        this.tryToggleCover(covers, hud);
        this._eLatch = true;
      }
    } else {
      this._eLatch = false;
    }

    if (this.keys.has("KeyR")) {
      if (!this._rLatch) {
        this.tryReload(hud);
        this._rLatch = true;
      }
    } else {
      this._rLatch = false;
    }

    const forward = this.getAimForward();
    forward.y = 0;
    if (forward.lengthSq() > 0) forward.normalize();
    // Y-up right-handed: right = forward × up
    this._right.set(-forward.z, 0, forward.x);

    this._wish.set(0, 0, 0);
    if (!this.inCover) {
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this._wish.add(forward);
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this._wish.sub(forward);
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this._wish.sub(this._right);
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this._wish.add(this._right);
      if (this._wish.lengthSq() > 0) {
        this._wish.normalize().multiplyScalar(this.moveSpeed * dt);
        const nextX = this.root.position.x + this._wish.x;
        const nextZ = this.root.position.z + this._wish.z;
        const resolved = worldCollision
          ? worldCollision.resolveCircleXZ(nextX, nextZ, 0.42)
          : { x: nextX, z: nextZ };
        this.root.position.x = THREE.MathUtils.clamp(resolved.x, -40, 40);
        this.root.position.z = THREE.MathUtils.clamp(resolved.z, -55, 18);
      }
    } else if (this.cover) {
      // slight peek offset with A/D while in cover
      let peek = 0;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) peek = -0.45;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) peek = 0.45;
      const base = this.cover.interactPos;
      this.root.position.lerp(
        new THREE.Vector3(base.x + this._right.x * peek, 0, base.z + this._right.z * peek),
        1 - Math.exp(-10 * dt)
      );
    }

    this.root.rotation.y = this.aimYaw;

    const wantFire =
      this.mouseDown || this.keys.has("Space");
    if (
      wantFire &&
      this.fireCooldown <= 0 &&
      this.reloadTime <= 0 &&
      this.ammo > 0 &&
      this.hp > 0
    ) {
      this.fireCooldown = this.fireInterval;
      this.ammo -= 1;
      const dir = this.getAimForward();
      // tiny spread
      dir.x += (Math.random() - 0.5) * 0.03;
      dir.y += (Math.random() - 0.5) * 0.02;
      dir.z += (Math.random() - 0.5) * 0.03;
      dir.normalize();
      combat.spawnTracer(this.muzzleWorld, dir, 85, 14, true);
      if (this.ammo === 0) {
        this.tryReload(hud);
      }
    }

    if (this.damageFlash > 0) {
      this.damageFlash -= dt;
      if (this.damageFlash <= 0) {
        this.body.material.color.setHex(0x1c2420);
      }
    }
  }

  reset() {
    this.hp = this.maxHp;
    this.ammo = this.magSize;
    this.reloadTime = 0;
    this.root.position.set(0, 0, 6);
    this.aimYaw = Math.PI;
    this.aimPitch = 0.1;
    if (this.cover) {
      this.cover.occupied = false;
      this.cover = null;
    }
    this.inCover = false;
    this.body.material.color.setHex(0x1c2420);
  }
}
