import * as THREE from "three";

/**
 * Axis-aligned world collision for bullets + character movement.
 */
export class WorldCollision {
  constructor() {
    /** @type {{min: THREE.Vector3, max: THREE.Vector3, mesh?: THREE.Object3D}[]} */
    this.boxes = [];
  }

  clear() {
    this.boxes.length = 0;
  }

  /** Register an existing mesh as a solid (uses world AABB). */
  addMesh(mesh, pad = 0.02) {
    // Parent Group transforms (e.g. train car) are lost if we only update the child.
    let root = mesh;
    while (root.parent) {
      root = root.parent;
    }
    root.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(mesh);
    if (!Number.isFinite(box.min.x) || box.isEmpty()) {
      return mesh;
    }
    if (pad) {
      box.min.x -= pad;
      box.min.z -= pad;
      box.max.x += pad;
      box.max.z += pad;
    }
    this.boxes.push({ min: box.min.clone(), max: box.max.clone(), mesh });
    return mesh;
  }

  /** Register a logical box (no mesh required). */
  addBox(cx, cy, cz, w, h, d, pad = 0) {
    const hw = w * 0.5 + pad;
    const hh = h * 0.5;
    const hd = d * 0.5 + pad;
    this.boxes.push({
      min: new THREE.Vector3(cx - hw, cy - hh, cz - hd),
      max: new THREE.Vector3(cx + hw, cy + hh, cz + hd),
    });
  }

  /** Collect Three meshes that were registered (for debug / legacy). */
  getMeshes() {
    return this.boxes.map((b) => b.mesh).filter(Boolean);
  }

  /**
   * Ray vs AABBs (slab method). Returns nearest hit or null.
   * @returns {{ distance: number, point: THREE.Vector3, normal: THREE.Vector3 } | null}
   */
  raycast(origin, dir, maxDist) {
    let best = null;
    const inv = new THREE.Vector3(
      dir.x !== 0 ? 1 / dir.x : Infinity,
      dir.y !== 0 ? 1 / dir.y : Infinity,
      dir.z !== 0 ? 1 / dir.z : Infinity
    );

    for (const b of this.boxes) {
      let tmin = 0;
      let tmax = maxDist;
      let hitAxis = "x";

      for (const axis of ["x", "y", "z"]) {
        let t0 = (b.min[axis] - origin[axis]) * inv[axis];
        let t1 = (b.max[axis] - origin[axis]) * inv[axis];
        if (t0 > t1) {
          const tmp = t0;
          t0 = t1;
          t1 = tmp;
        }
        if (t0 > tmin) {
          tmin = t0;
          hitAxis = axis;
        }
        tmax = Math.min(tmax, t1);
        if (tmax < tmin) {
          tmin = Infinity;
          break;
        }
      }

      if (tmin === Infinity || tmin < 0 || tmin > maxDist) continue;
      if (!best || tmin < best.distance) {
        const point = origin.clone().addScaledVector(dir, tmin);
        const normal = new THREE.Vector3();
        normal[hitAxis] = dir[hitAxis] > 0 ? -1 : 1;
        best = { distance: tmin, point, normal };
      }
    }
    return best;
  }

  /**
   * Push a circle on XZ out of all boxes (characters can't walk through walls).
   * @returns {{ x: number, z: number }}
   */
  resolveCircleXZ(x, z, radius) {
    let px = x;
    let pz = z;
    // Multiple iterations for corners
    for (let iter = 0; iter < 3; iter++) {
      for (const b of this.boxes) {
        // Skip elevated-only volumes (roofs) for walking — still used by bullet raycast
        if (b.min.y > 1.35) continue;
        if (b.max.y < 0.35) continue;

        const nearestX = THREE.MathUtils.clamp(px, b.min.x, b.max.x);
        const nearestZ = THREE.MathUtils.clamp(pz, b.min.z, b.max.z);
        let dx = px - nearestX;
        let dz = pz - nearestZ;
        const distSq = dx * dx + dz * dz;

        // Center inside box → push out via smallest axis
        if (distSq < 1e-8 && px >= b.min.x && px <= b.max.x && pz >= b.min.z && pz <= b.max.z) {
          const left = px - b.min.x;
          const right = b.max.x - px;
          const down = pz - b.min.z;
          const up = b.max.z - pz;
          const m = Math.min(left, right, down, up);
          if (m === left) px = b.min.x - radius;
          else if (m === right) px = b.max.x + radius;
          else if (m === down) pz = b.min.z - radius;
          else pz = b.max.z + radius;
          continue;
        }

        if (distSq > 0 && distSq < radius * radius) {
          const dist = Math.sqrt(distSq);
          const push = (radius - dist) / dist;
          px += dx * push;
          pz += dz * push;
        }
      }
    }
    return { x: px, z: pz };
  }
}
