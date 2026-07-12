import * as THREE from "three";

/** Act B sniper: bunker + telegraph warning then hit if player exposed. */
export class SniperEncounter {
  constructor(scene, nestPos, worldCollision) {
    this.scene = scene;
    this.worldCollision = worldCollision;
    this.nestPos = nestPos.clone();
    this.active = false;
    this.cleared = false;
    this._cooldown = 2.5;
    this._windup = 0;
    this._warning = null;
    this._solids = [];
    this._buildNest();
  }

  _addSolidBox(cx, cy, cz, w, h, d, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
    );
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this._solids.push(mesh);
    this.worldCollision?.addMesh(mesh, 0.05);
    return mesh;
  }

  _buildNest() {
    const x = this.nestPos.x;
    const z = this.nestPos.z;

    // Sandbag / concrete bunker open to the south (player approach)
    this._addSolidBox(x, 1.1, z - 1.35, 4.2, 2.2, 0.55, 0x5a5348); // back wall
    this._addSolidBox(x - 2.0, 1.0, z - 0.2, 0.55, 2.0, 2.6, 0x4f4840); // left
    this._addSolidBox(x + 2.0, 1.0, z - 0.2, 0.55, 2.0, 2.6, 0x4f4840); // right
    this._addSolidBox(x, 2.25, z - 0.5, 4.2, 0.3, 2.8, 0x3d3830); // roof slab
    this._addSolidBox(x - 1.1, 0.55, z + 0.9, 1.4, 1.1, 0.7, 0x6b5a42); // front sandbag L
    this._addSolidBox(x + 1.1, 0.55, z + 0.9, 1.4, 1.1, 0.7, 0x6b5a42); // front sandbag R

    const tripod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 1.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    // Tripod in the open bay (not a solid — avoid blocking reach trigger awkwardly)
    tripod.position.set(x, 1.15, z + 0.15);
    this.scene.add(tripod);
    this._nestMarker = tripod;

    // Reach point slightly in front of bunker mouth so player needn't clip walls
    this.reachPos = new THREE.Vector3(x, 0, z + 1.6);
  }

  getSolidMeshes() {
    return this._solids.slice();
  }

  start(radio, hud) {
    this.active = true;
    hud.message("有狙击火力！进掩体！");
    radio.push(
      "sniper_start",
      "总部",
      "黑鹰7号，前方有火力压制报告。保持隐蔽并推进。",
      4
    );
  }

  update(dt, player, combat, hud) {
    if (!this.active || this.cleared) return;

    const distToNest = player.position.distanceTo(this.reachPos);
    if (distToNest < 2.4) {
      this.cleared = true;
      this.active = false;
      this._clearWarning();
      hud.message("狙击位空无一人……枪还是热的");
      return "reached";
    }

    if (this._windup > 0) {
      this._windup -= dt;
      this._updateWarning(player);
      if (this._windup <= 0) {
        this._clearWarning();
        const origin = this.nestPos.clone();
        origin.y = 1.5;
        origin.z += 0.3;
        const dir = new THREE.Vector3()
          .subVectors(player.position, origin)
          .normalize();
        dir.y = 0.05;
        if (!player.inCover) {
          player.takeDamage(28, hud);
          combat.spawnTracer(origin, dir, 120, 0, false);
          hud.message("被狙击命中！");
        } else {
          combat.spawnTracer(origin, dir, 120, 0, false);
          hud.message("子弹擦过掩体");
        }
        this._cooldown = 2.2 + Math.random() * 1.2;
      }
      return;
    }

    this._cooldown -= dt;
    if (this._cooldown <= 0) {
      this._windup = 0.85;
      this._spawnWarning(player);
      hud.message("狙击预警！找掩体！");
    }
  }

  _spawnWarning(player) {
    this._clearWarning();
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(this.nestPos.x, 1.5, this.nestPos.z + 0.3),
      new THREE.Vector3(player.position.x, 1.2, player.position.z),
    ]);
    const line = new THREE.Line(
      geo,
      new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.85 })
    );
    this.scene.add(line);
    this._warning = line;
  }

  _updateWarning(player) {
    if (!this._warning) return;
    const positions = this._warning.geometry.attributes.position;
    positions.setXYZ(1, player.position.x, 1.2, player.position.z);
    positions.needsUpdate = true;
  }

  _clearWarning() {
    if (this._warning) {
      this.scene.remove(this._warning);
      this._warning = null;
    }
  }
}
