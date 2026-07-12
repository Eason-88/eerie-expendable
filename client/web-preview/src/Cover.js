import * as THREE from "three";
import { createWoodCrate } from "./CharacterFactory.js";

export function createCoverSpots(scene, layouts) {
  const covers = [];
  const defaultLayouts = [
    { x: -4, z: -2, w: 2.2, h: 1.35, d: 0.7 },
    { x: 3.5, z: -5, w: 2.4, h: 1.4, d: 0.75 },
    { x: -1, z: 4.5, w: 2.0, h: 1.3, d: 0.7 },
    { x: 6, z: 2, w: 1.8, h: 1.25, d: 0.65 },
    { x: -7, z: 1, w: 2.2, h: 1.35, d: 0.7 },
  ];

  for (const layout of layouts ?? defaultLayouts) {
    const crate = createWoodCrate(layout.w, layout.h, layout.d);
    crate.position.set(layout.x, layout.h / 2, layout.z);
    scene.add(crate);
    const mesh = crate.userData.solidMesh;
    mesh.position.copy(crate.position);

    // Keep a world-aligned invisible collider proxy at crate position for raycasts
    // (solidMesh is child of group; use group for visuals, mesh for collision list)
    const collider = new THREE.Mesh(
      new THREE.BoxGeometry(layout.w, layout.h, layout.d),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.set(layout.x, layout.h / 2, layout.z);
    scene.add(collider);

    const interactPos = new THREE.Vector3(
      layout.x,
      0,
      layout.z + (layout.interactZ ?? layout.d * 0.5 + 0.85)
    );
    const firePos = new THREE.Vector3(layout.x, layout.h + 0.15, layout.z);
    covers.push({
      mesh: collider,
      visual: crate,
      interactPos,
      firePos,
      radius: layout.radius ?? 1.6,
      occupied: false,
    });
  }

  return covers;
}

export function findNearestCover(covers, position, maxDist = 1.8) {
  let best = null;
  let bestDist = maxDist;
  for (const cover of covers) {
    if (cover.occupied) continue;
    const limit = cover.radius ?? maxDist;
    const d = position.distanceTo(cover.interactPos);
    if (d < limit && d < bestDist) {
      best = cover;
      bestDist = d;
    }
  }
  return best;
}
