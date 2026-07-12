import * as THREE from "three";
import { createWoodCrate } from "./CharacterFactory.js";

/** Canvas dirt / moss / bark textures for reference-like forest. */
function makeTerrainTex(seed, mode = "dirt") {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  const img = ctx.createImageData(size, size);
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    const n = rnd();
    let r, g, b;
    if (mode === "moss") {
      r = 45 + n * 25;
      g = 70 + n * 40 + ((x * 3 + y) % 7 === 0 ? 15 : 0);
      b = 40 + n * 20;
    } else if (mode === "path") {
      r = 95 + n * 35 + Math.sin(x * 0.2) * 8;
      g = 85 + n * 28;
      b = 70 + n * 22;
    } else if (mode === "bark") {
      r = 55 + n * 30;
      g = 42 + n * 22;
      b = 30 + n * 15;
      if (x % 9 < 2) {
        r *= 0.7;
        g *= 0.7;
        b *= 0.7;
      }
    } else {
      // forest floor
      r = 55 + n * 28;
      g = 62 + n * 30;
      b = 45 + n * 18;
      if ((x + y * 3) % 17 === 0) {
        g += 18;
      }
    }
    const o = i * 4;
    img.data[o] = r;
    img.data[o + 1] = g;
    img.data[o + 2] = b;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function pineTree(barkMat, needleMat, h) {
  const g = new THREE.Group();
  const trunkH = h * 0.42;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08 + h * 0.01, 0.16 + h * 0.015, trunkH, 7),
    barkMat
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  g.add(trunk);

  // Layered fir cones (reference silhouette)
  const layers = 3 + Math.floor(Math.random() * 2);
  let y = trunkH * 0.55;
  for (let i = 0; i < layers; i++) {
    const t = i / layers;
    const radius = (1.1 - t * 0.55) * (0.85 + h * 0.08);
    const coneH = h * (0.28 - t * 0.03);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(radius, coneH, 8), needleMat);
    cone.position.y = y + coneH * 0.35;
    cone.castShadow = true;
    g.add(cone);
    y += coneH * 0.42;
  }
  return g;
}

function fernClump(mat) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35 + Math.random() * 0.2, 4), mat);
    blade.position.set((Math.random() - 0.5) * 0.25, 0.15, (Math.random() - 0.5) * 0.25);
    blade.rotation.z = (Math.random() - 0.5) * 0.6;
    blade.rotation.x = (Math.random() - 0.5) * 0.4;
    g.add(blade);
  }
  return g;
}

function rock(mat, s) {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat);
  m.scale.set(1 + Math.random() * 0.4, 0.45 + Math.random() * 0.35, 1 + Math.random() * 0.3);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * Misty conifer forest matching assets/view-pseudo-3d.png:
 * thick fog, dirt path, stacked crates, overcast light.
 */
export function buildReferenceForest(scene) {
  // Cold grey-green mist like the reference plate
  const fogColor = 0x8a958c;
  scene.background = new THREE.Color(fogColor);
  scene.fog = new THREE.FogExp2(fogColor, 0.038);

  scene.add(new THREE.HemisphereLight(0xb0b8b2, 0x2a302c, 0.48));
  const sun = new THREE.DirectionalLight(0xd0ccc4, 0.28);
  sun.position.set(6, 40, -4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x6a736c, 0.22));

  const floorMap = makeTerrainTex(91, "dirt");
  floorMap.repeat.set(18, 22);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 130),
    new THREE.MeshStandardMaterial({
      color: 0x4a5548,
      map: floorMap,
      roughness: 0.96,
      metalness: 0.02,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pathMap = makeTerrainTex(44, "path");
  pathMap.repeat.set(2, 14);
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 72),
    new THREE.MeshStandardMaterial({
      color: 0x6a6256,
      map: pathMap,
      roughness: 0.98,
      metalness: 0,
    })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0.2, 0.03, -14);
  path.receiveShadow = true;
  scene.add(path);

  const barkMap = makeTerrainTex(12, "bark");
  barkMap.repeat.set(1, 3);
  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x3a3028,
    map: barkMap,
    roughness: 0.95,
  });
  const needleMat = new THREE.MeshStandardMaterial({
    color: 0x1e3226,
    roughness: 0.92,
  });
  const fernMat = new THREE.MeshStandardMaterial({ color: 0x2a4030, roughness: 0.9 });
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5a52, roughness: 0.88 });

  // Dense pines framing the path (leave corridor clear)
  for (let i = 0; i < 95; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const along = -52 + (i / 95) * 78 + (Math.random() - 0.5) * 2.5;
    const lateral = side * (3.2 + Math.random() * 18 + (Math.random() < 0.35 ? 8 : 0));
    const x = lateral + (Math.random() - 0.5) * 1.2;
    const z = along;
    if (Math.abs(x) < 2.6 && z > -48 && z < 12) continue;
    const h = 5.5 + Math.random() * 5.5;
    const tree = pineTree(barkMat, needleMat, h);
    tree.position.set(x, 0, z);
    tree.rotation.y = Math.random() * Math.PI;
    scene.add(tree);
  }
  // Extra background fill (vanish into fog)
  for (let i = 0; i < 40; i++) {
    const x = (Math.random() - 0.5) * 100;
    const z = -55 + Math.random() * 20;
    if (Math.abs(x) < 5) continue;
    const tree = pineTree(barkMat, needleMat, 7 + Math.random() * 6);
    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  // Ferns & rocks along path edges
  for (let i = 0; i < 55; i++) {
    const z = -45 + Math.random() * 55;
    const x = (Math.random() < 0.5 ? -1 : 1) * (2.1 + Math.random() * 2.5);
    const f = fernClump(fernMat);
    f.position.set(x, 0, z);
    scene.add(f);
  }
  for (let i = 0; i < 28; i++) {
    const z = -40 + Math.random() * 50;
    const x = (Math.random() - 0.5) * 4.2;
    const r = rock(rockMat, 0.12 + Math.random() * 0.18);
    r.position.set(x, 0.06, z);
    scene.add(r);
  }

  // Weathered crates like reference — stacked clusters near path
  const crateSpots = [
    { x: -2.6, z: 3.5, stack: 2 },
    { x: 2.4, z: 1.2, stack: 1 },
    { x: -2.8, z: -4, stack: 2 },
    { x: 2.9, z: -8, stack: 1 },
    { x: -2.5, z: -15, stack: 2 },
    { x: 3.1, z: -20, stack: 1 },
    { x: -2.7, z: -27, stack: 2 },
    { x: 2.6, z: -32, stack: 1 },
  ];
  for (const spot of crateSpots) {
    let y = 0;
    for (let s = 0; s < spot.stack; s++) {
      const w = 1.15 + Math.random() * 0.25;
      const h = 0.95 + Math.random() * 0.15;
      const d = 1.05 + Math.random() * 0.2;
      const crate = createWoodCrate(w, h, d);
      crate.position.set(spot.x + (Math.random() - 0.5) * 0.15, y + h / 2, spot.z);
      crate.rotation.y = (Math.random() - 0.5) * 0.35;
      scene.add(crate);
      y += h;
    }
  }

  return { fogColor };
}
