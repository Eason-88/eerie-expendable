import * as THREE from "three";

export function createCoverSpots(scene) {
  const covers = [];
  const layouts = [
    { x: -4, z: -2, w: 2.2, h: 1.35, d: 0.7 },
    { x: 3.5, z: -5, w: 2.4, h: 1.4, d: 0.75 },
    { x: -1, z: 4.5, w: 2.0, h: 1.3, d: 0.7 },
    { x: 6, z: 2, w: 1.8, h: 1.25, d: 0.65 },
    { x: -7, z: 1, w: 2.2, h: 1.35, d: 0.7 },
  ];

  for (const layout of layouts) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(layout.w, layout.h, layout.d),
      new THREE.MeshStandardMaterial({ color: 0x6b4e32, roughness: 0.85 })
    );
    mesh.position.set(layout.x, layout.h / 2, layout.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const interactPos = new THREE.Vector3(layout.x, 0, layout.z + layout.d * 0.5 + 0.85);
    const firePos = new THREE.Vector3(layout.x, layout.h + 0.15, layout.z);
    covers.push({
      mesh,
      interactPos,
      firePos,
      radius: 1.6,
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
    const d = position.distanceTo(cover.interactPos);
    if (d < bestDist) {
      best = cover;
      bestDist = d;
    }
  }
  return best;
}
