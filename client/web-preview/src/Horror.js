import * as THREE from "three";

/** Tunables exported for unit tests. */
export const HORROR_CONFIG = Object.freeze({
  trainPos: Object.freeze({ x: -14, y: 0, z: -6 }),
  ritualCenter: Object.freeze({ x: 10, y: 0, z: -14 }),
  /** Approach this close to scarecrows to make them vanish. */
  scarecrowApproachRadius: 3.4,
  /** Pig stands on the train roof (story: 列车上). */
  pigOnTrainOffset: Object.freeze({ x: 0, y: 3.7, z: 0.2 }),
});

export function distanceXZ(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.hypot(dx, dz);
}

export function shouldDismissScarecrowsByApproach(playerX, playerZ, cfg = HORROR_CONFIG) {
  return (
    distanceXZ(playerX, playerZ, cfg.ritualCenter.x, cfg.ritualCenter.z) <
    cfg.scarecrowApproachRadius
  );
}

function makeHumanoid(colors, scale = 1) {
  const root = new THREE.Group();
  root.scale.setScalar(scale);
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.32, 0.8, 4, 8),
    new THREE.MeshStandardMaterial({
      color: colors.body,
      emissive: colors.emissive ?? 0x000000,
      emissiveIntensity: 0.35,
    })
  );
  body.position.y = 1.0;
  body.castShadow = true;
  root.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshStandardMaterial({
      color: colors.head,
      emissive: colors.headEmissive ?? 0x000000,
      emissiveIntensity: 0.45,
    })
  );
  head.position.y = 1.85;
  root.add(head);
  return { root, body, head };
}

function makeBeacon(color) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.15, 24),
    new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  group.add(ring);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6),
    new THREE.MeshBasicMaterial({ color })
  );
  pole.position.y = 1.1;
  group.add(pole);
  return group;
}

/**
 * Act A horror props:
 * - Pig stays on the train until shot.
 * - Scarecrows stay until shot or the player walks too close.
 */
export class HorrorEvents {
  constructor(scene, cfg = HORROR_CONFIG) {
    this.scene = scene;
    this.cfg = cfg;
    this.pigCleared = false;
    this.ritualCleared = false;
    this.pigNoticed = false;
    this.ritualNoticed = false;
    this._pig = null;
    this._pigHitMeshes = [];
    this._scarecrows = [];
    this._scarecrowHitMeshes = [];
    this._train = this._buildTrain(
      new THREE.Vector3(cfg.trainPos.x, cfg.trainPos.y, cfg.trainPos.z)
    );
    this._ritualCenter = new THREE.Vector3(
      cfg.ritualCenter.x,
      cfg.ritualCenter.y,
      cfg.ritualCenter.z
    );
    this._buildScarecrows();
    this._spawnPig();
    this._buildBeacons();
  }

  /** @deprecated use bothCleared — kept for call sites during transition */
  get pigSeen() {
    return this.pigNoticed || this.pigCleared || this.pigVisible;
  }

  /** @deprecated use bothCleared */
  get ritualSeen() {
    return this.ritualNoticed || this.ritualCleared || this.ritualVisible;
  }

  get pigVisible() {
    return Boolean(this._pig && this._pig.visible && !this.pigCleared);
  }

  get ritualVisible() {
    return !this.ritualCleared && this._scarecrows.some((s) => s.visible);
  }

  get bothCleared() {
    return this.pigCleared && this.ritualCleared;
  }

  /** Story gate: both anomalies resolved. */
  get bothDone() {
    return this.bothCleared;
  }

  getSolidMeshes() {
    const meshes = [];
    this._train?.traverse((obj) => {
      if (obj.isMesh) meshes.push(obj);
    });
    return meshes;
  }

  _buildBeacons() {
    const trainBeacon = makeBeacon(0xff6688);
    trainBeacon.position.set(this.cfg.trainPos.x, 0, this.cfg.trainPos.z + 4);
    this.scene.add(trainBeacon);
    this._trainBeacon = trainBeacon;

    const ritualBeacon = makeBeacon(0xffdd66);
    ritualBeacon.position.copy(this._ritualCenter);
    this.scene.add(ritualBeacon);
    this._ritualBeacon = ritualBeacon;
  }

  _buildTrain(pos) {
    const group = new THREE.Group();
    group.position.copy(pos);
    const rust = new THREE.MeshStandardMaterial({
      color: 0x5a4a40,
      roughness: 0.92,
      metalness: 0.35,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x2a2826,
      roughness: 0.88,
      metalness: 0.25,
    });
    // Abandoned freight car silhouette (reference mid-ground wreck)
    const car = new THREE.Mesh(new THREE.BoxGeometry(10.2, 3.0, 3.0), rust);
    car.position.y = 1.7;
    car.castShadow = true;
    car.receiveShadow = true;
    group.add(car);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.22, 3.3), dark);
    roof.position.y = 3.3;
    group.add(roof);
    // Weathered panels / ribs
    for (let i = 0; i < 5; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 3.05), dark);
      rib.position.set(-4 + i * 2, 1.7, 0);
      group.add(rib);
    }
    // Bogie hint
    for (const x of [-3.2, 3.2]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10),
        dark
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, 0.9);
      group.add(wheel);
      const wheel2 = wheel.clone();
      wheel2.position.z = -0.9;
      group.add(wheel2);
    }
    // Slight list into the fog
    group.rotation.y = 0.12;
    group.rotation.z = -0.03;
    this.scene.add(group);
    return group;
  }

  _buildScarecrows() {
    const offsets = [
      [0, 0],
      [1.6, 0.8],
      [-1.4, 0.9],
      [0.2, 1.8],
    ];
    for (const [ox, oz] of offsets) {
      const { root, body, head } = makeHumanoid(
        {
          body: 0xb89a4a,
          head: 0xe8c56a,
          emissive: 0x443300,
          headEmissive: 0x664400,
        },
        1.25
      );
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.14, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0x6b5a32,
          emissive: 0x332200,
          emissiveIntensity: 0.3,
        })
      );
      arm.position.y = 1.35;
      root.add(arm);
      root.position.set(this._ritualCenter.x + ox, 0, this._ritualCenter.z + oz);
      root.visible = true;
      body.userData.horror = "ritual";
      head.userData.horror = "ritual";
      this.scene.add(root);
      this._scarecrows.push(root);
      this._scarecrowHitMeshes.push(body, head);
    }
  }

  _spawnPig() {
    const { root, body, head } = makeHumanoid(
      {
        body: 0x6a2020,
        head: 0xd07070,
        emissive: 0x330000,
        headEmissive: 0x550000,
      },
      1.35
    );
    const snout = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.2, 0.36),
      new THREE.MeshStandardMaterial({
        color: 0xffaaaa,
        emissive: 0x441111,
        emissiveIntensity: 0.4,
      })
    );
    snout.position.set(0, 0, 0.32);
    head.add(snout);
    for (const x of [-0.12, 0.12]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff1010 })
      );
      eye.position.set(x, 0.08, 0.24);
      head.add(eye);
    }

    const off = this.cfg.pigOnTrainOffset;
    root.position.set(
      this.cfg.trainPos.x + off.x,
      off.y,
      this.cfg.trainPos.z + off.z
    );
    root.rotation.y = Math.PI * 0.15;
    root.visible = true;
    body.userData.horror = "pig";
    head.userData.horror = "pig";
    this.scene.add(root);
    this._pig = root;
    this._pigHitMeshes = [body, head];
  }

  /** Soft notice when player first gets near (does not dismiss). */
  noticeNearby(playerPos, radio, hud) {
    const x = playerPos.x;
    const z = playerPos.z;
    if (
      !this.pigNoticed &&
      !this.pigCleared &&
      distanceXZ(x, z, this.cfg.trainPos.x, this.cfg.trainPos.z) < 14
    ) {
      this.pigNoticed = true;
      hud?.message("列车顶上站着什么……一直没动");
      radio?.push(
        "pig_notice",
        "黑鹰7号（自语）",
        "猪头人身，红眼睛……它就站在那儿，像在看我。",
        4
      );
    }
    if (
      !this.ritualNoticed &&
      !this.ritualCleared &&
      distanceXZ(x, z, this.cfg.ritualCenter.x, this.cfg.ritualCenter.z) < 14
    ) {
      this.ritualNoticed = true;
      hud?.message("稻草人围成一圈，仪式还没散");
      radio?.push(
        "ritual_notice",
        "黑鹰7号（自语）",
        "它们一直在那儿转……别靠太近，或者……开枪？",
        4
      );
    }
  }

  dismissPig(radio, hud) {
    if (this.pigCleared || !this._pig) return false;
    this.pigCleared = true;
    this.scene.remove(this._pig);
    this._pig = null;
    this._pigHitMeshes = [];
    if (this._trainBeacon) this._trainBeacon.visible = false;
    hud?.message("子弹打中的瞬间，它像烟雾一样没了");
    radio?.push(
      "pig_gone",
      "黑鹰7号（自语）",
      "一枪打上去——它直接散了。不是血肉。",
      3.5
    );
    return true;
  }

  dismissRitual(radio, hud, reason = "shot") {
    if (this.ritualCleared) return false;
    this.ritualCleared = true;
    for (const s of this._scarecrows) {
      s.visible = false;
    }
    this._scarecrowHitMeshes = [];
    if (this._ritualBeacon) this._ritualBeacon.visible = false;
    if (reason === "approach") {
      hud?.message("你一靠近，稻草人同时消失了");
      radio?.push(
        "ritual_gone_near",
        "黑鹰7号（自语）",
        "刚踏进圈里，它们就没了……像从来没存在过。",
        3.5
      );
    } else {
      hud?.message("子弹擦过草人，整圈仪式一起散了");
      radio?.push(
        "ritual_gone_shot",
        "黑鹰7号（自语）",
        "一开枪，它们全散了。这哪是稻草人……",
        3.5
      );
    }
    return true;
  }

  /**
   * Player bullet hit test. Returns true if the bullet should be consumed.
   */
  tryHitFromRaycaster(raycaster, radio, hud) {
    if (!this.pigCleared && this._pigHitMeshes.length) {
      this._pig?.updateMatrixWorld(true);
      const hits = raycaster.intersectObjects(this._pigHitMeshes, false);
      if (hits.length) {
        this.dismissPig(radio, hud);
        return true;
      }
    }
    if (!this.ritualCleared && this._scarecrowHitMeshes.length) {
      for (const s of this._scarecrows) s.updateMatrixWorld(true);
      const hits = raycaster.intersectObjects(this._scarecrowHitMeshes, false);
      if (hits.length) {
        this.dismissRitual(radio, hud, "shot");
        return true;
      }
    }
    return false;
  }

  update(dt, playerPos, radio, hud) {
    if (this._pig && !this.pigCleared) {
      const baseY = this.cfg.pigOnTrainOffset.y;
      this._pig.position.y = baseY + Math.sin(performance.now() * 0.008) * 0.08;
    }

    if (!this.ritualCleared) {
      for (const s of this._scarecrows) {
        if (s.visible) s.rotation.y += dt * 0.35;
      }
      if (
        playerPos &&
        shouldDismissScarecrowsByApproach(playerPos.x, playerPos.z, this.cfg)
      ) {
        this.dismissRitual(radio, hud, "approach");
      }
    }

    if (playerPos) {
      this.noticeNearby(playerPos, radio, hud);
    }
  }

  resetVisuals() {
    this.pigCleared = false;
    this.ritualCleared = false;
    this.pigNoticed = false;
    this.ritualNoticed = false;
    if (this._pig) {
      this.scene.remove(this._pig);
      this._pig = null;
    }
    this._pigHitMeshes = [];
    for (const s of this._scarecrows) {
      this.scene.remove(s);
    }
    this._scarecrows = [];
    this._scarecrowHitMeshes = [];
    this._buildScarecrows();
    this._spawnPig();
    if (this._trainBeacon) this._trainBeacon.visible = true;
    if (this._ritualBeacon) this._ritualBeacon.visible = true;
  }

  /** Test helper */
  tick(seconds, playerPos = null, radio = null, hud = null, step = 0.05) {
    let left = seconds;
    while (left > 0) {
      const dt = Math.min(step, left);
      this.update(dt, playerPos, radio, hud);
      left -= dt;
    }
  }
}
