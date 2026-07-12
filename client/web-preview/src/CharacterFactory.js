import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

/** Shared GLTF template (three.js Soldier) — more realistic than box stack. */
let _soldierTemplate = null;
let _soldierClips = [];
let _soldierLoadError = false;

const TINT = {
  player: 0x2a3340,
  allyHostile: 0x2a4034,
  enemy: 0x4a3030,
};

const PALETTE = {
  player: {
    suit: 0x1c2430,
    vest: 0x121820,
    helmet: 0x0e141c,
    strap: 0x2a3340,
    skin: 0x8a6b56,
    rifle: 0x1e221f,
    accent: 0x343c48,
    boot: 0x0c0e12,
  },
  allyHostile: {
    suit: 0x24352c,
    vest: 0x1a2820,
    helmet: 0x152018,
    strap: 0x355040,
    skin: 0x8a6b56,
    rifle: 0x1e221f,
    accent: 0x3a4c40,
    boot: 0x0c100e,
  },
  enemy: {
    suit: 0x3a2422,
    vest: 0x2a1a18,
    helmet: 0x221410,
    strap: 0x4a3430,
    skin: 0x8a6b56,
    rifle: 0x1e221f,
    accent: 0x5a4038,
    boot: 0x120c0c,
  },
};

const _texCache = new Map();

function noiseTex(seed, size = 128, opts = {}) {
  const key = `${seed}|${size}|${opts.mode || "fabric"}`;
  if (_texCache.has(key)) return _texCache.get(key);
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
    const n = rnd();
    let v;
    if (opts.mode === "metal") {
      v = 90 + n * 50 + ((i % size) % 7 === 0 ? 25 : 0);
    } else if (opts.mode === "wood") {
      const x = i % size;
      const grain = Math.sin(x * 0.35 + n * 2) * 18;
      v = 110 + grain + n * 30;
    } else {
      // fabric weave
      const x = i % size;
      const y = (i / size) | 0;
      const weave = ((x + y) % 3 === 0 ? 12 : 0) + ((x * 3 + y) % 5 === 0 ? 8 : 0);
      v = 70 + n * 55 + weave;
    }
    const o = i * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = v;
    img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(opts.repeat ?? 2, opts.repeat ?? 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  _texCache.set(key, tex);
  return tex;
}

function mat(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.78,
    metalness: opts.metalness ?? 0.06,
    map: opts.map ?? null,
    bumpMap: opts.bumpMap ?? null,
    bumpScale: opts.bumpScale ?? 0.4,
    flatShading: false,
  });
  return m;
}

function fabricMat(color, seed) {
  const map = noiseTex(seed, 128, { mode: "fabric", repeat: 3 });
  return mat(color, { roughness: 0.88, metalness: 0.04, map, bumpMap: map, bumpScale: 0.55 });
}

function metalMat(color, seed) {
  const map = noiseTex(seed, 64, { mode: "metal", repeat: 2 });
  return mat(color, { roughness: 0.42, metalness: 0.55, map, bumpMap: map, bumpScale: 0.25 });
}

function add(mesh, parent, x, y, z, rx = 0, ry = 0, rz = 0) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

function capsule(r, len, material, seg = 10) {
  // Three CapsuleGeometry: radius, length (cylindrical part)
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), material);
}

function cyl(rt, rb, h, material, seg = 10) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
}

function box(w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
}

function sphere(r, material, seg = 12) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), material);
}

/** Detailed carbine closer to FPS third-person scale. */
export function createRifle(palette = PALETTE.player) {
  const rifle = new THREE.Group();
  rifle.name = "rifle";
  const dark = metalMat(palette.rifle, 11);
  const black = metalMat(0x111111, 12);
  const poly = fabricMat(0x1a1c18, 13);

  const receiver = box(0.055, 0.095, 0.42, dark);
  add(receiver, rifle, 0, 0.02, 0.05);

  const handguard = box(0.05, 0.07, 0.28, poly);
  add(handguard, rifle, 0, 0.015, 0.38);

  const barrel = cyl(0.015, 0.015, 0.34, black, 8);
  barrel.rotation.x = Math.PI / 2;
  add(barrel, rifle, 0, 0.025, 0.62);

  const muzzleBrake = cyl(0.02, 0.018, 0.05, black, 8);
  muzzleBrake.rotation.x = Math.PI / 2;
  add(muzzleBrake, rifle, 0, 0.025, 0.8);

  const stock = box(0.045, 0.085, 0.2, poly);
  add(stock, rifle, 0, 0.0, -0.28);
  const stockPad = box(0.05, 0.1, 0.03, fabricMat(0x222222, 14));
  add(stockPad, rifle, 0, 0.0, -0.39);

  const mag = box(0.04, 0.15, 0.07, black);
  add(mag, rifle, 0, -0.1, 0.08);

  const pistolGrip = box(0.035, 0.11, 0.055, poly);
  add(pistolGrip, rifle, 0, -0.09, -0.06);
  pistolGrip.rotation.x = 0.25;

  const opticRail = box(0.03, 0.02, 0.22, black);
  add(opticRail, rifle, 0, 0.075, 0.08);
  const optic = box(0.035, 0.04, 0.12, metalMat(0x0a0a0a, 15));
  add(optic, rifle, 0, 0.11, 0.1);

  const foregrip = box(0.03, 0.07, 0.04, poly);
  add(foregrip, rifle, 0, -0.05, 0.35);

  const muzzle = new THREE.Object3D();
  muzzle.name = "muzzle";
  muzzle.position.set(0, 0.025, 0.86);
  rifle.add(muzzle);

  return { rifle, muzzle };
}

/**
 * Load skinned Soldier.glb once. Call before spawning actors.
 * Falls back silently to procedural mesh on failure.
 */
export async function preloadTacticalModels() {
  if (_soldierTemplate || _soldierLoadError) return Boolean(_soldierTemplate);
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync("./models/Soldier.glb");
    _soldierTemplate = gltf.scene;
    _soldierClips = gltf.animations ?? [];
    _soldierTemplate.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material) {
          o.material = o.material.clone();
          o.material.roughness = Math.min(0.95, (o.material.roughness ?? 0.7) + 0.15);
        }
      }
    });
    return true;
  } catch (err) {
    console.warn("[CharacterFactory] Soldier.glb load failed, using procedural", err);
    _soldierLoadError = true;
    return false;
  }
}

function findBone(root, names) {
  let found = null;
  root.traverse((o) => {
    if (found) return;
    if (names.includes(o.name)) found = o;
  });
  return found;
}

/**
 * CS/CF-style hip-fire mount on character root.
 * Barrel follows root +Z (= aim yaw); pitch applied each frame on the mount.
 */
function attachHipFireRifle(root, palette) {
  const { rifle, muzzle } = createRifle(palette);
  const mount = new THREE.Group();
  mount.name = "hipFireMount";
  // Right-hip / mid-chest, barrel along local +Z (aim forward)
  mount.position.set(0.22, 1.12, 0.38);
  root.add(mount);
  rifle.position.set(0, 0, 0);
  rifle.rotation.set(0, 0, 0);
  mount.add(rifle);
  return { rifle, muzzle, mount };
}

/**
 * Upper-body pose for two-hand hip-fire (after Walk/Idle mixer update).
 */
export function applyAttackRiflePose(model) {
  if (!model) return;
  const pose = {
    "mixamorig:Spine2": [0.1, 0, 0],
    "mixamorig:RightShoulder": [0.15, 0, -0.25],
    "mixamorig:RightArm": [0.95, 0.25, -0.35],
    "mixamorig:RightForeArm": [0.45, 0.05, 0.1],
    "mixamorig:RightHand": [0.2, 0.1, 0.05],
    "mixamorig:LeftShoulder": [0.2, 0, 0.3],
    "mixamorig:LeftArm": [0.9, -0.35, 0.45],
    "mixamorig:LeftForeArm": [0.6, -0.05, 0.1],
    "mixamorig:LeftHand": [0.15, -0.1, 0.05],
  };
  for (const [name, rot] of Object.entries(pose)) {
    const bone = findBone(model, [name]);
    if (!bone) continue;
    bone.rotation.x = rot[0];
    bone.rotation.y = rot[1];
    bone.rotation.z = rot[2];
  }
}

function createAnimController(model) {
  if (!_soldierClips.length) return null;
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of _soldierClips) {
    actions[clip.name] = mixer.clipAction(clip);
  }
  const idle = actions.Idle;
  if (idle) {
    idle.play();
  }
  return {
    mixer,
    actions,
    current: idle ? "Idle" : null,
    set(name) {
      if (!actions[name] || this.current === name) return;
      const prev = this.current ? actions[this.current] : null;
      const next = actions[name];
      prev?.fadeOut(0.18);
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.18).play();
      this.current = name;
    },
    update(dt) {
      mixer.update(dt);
    },
  };
}

function createFromGltf(kind = "player") {
  const palette = PALETTE[kind] ?? PALETTE.player;
  const root = new THREE.Group();
  root.name = `soldier_gltf_${kind}`;

  const model = cloneSkinned(_soldierTemplate);
  model.scale.setScalar(1.05);
  // Facing +Z in three.js soldier; our game aims with yaw around Y
  model.rotation.y = Math.PI;
  model.traverse((o) => {
    if (o.isMesh && o.material?.color) {
      o.material = o.material.clone();
      const tint = new THREE.Color(TINT[kind] ?? TINT.player);
      o.material.color.lerp(tint, kind === "player" ? 0.55 : 0.45);
      if (kind === "player") {
        o.material.color.multiplyScalar(0.55);
      }
    }
  });
  root.add(model);

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.05, 4, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  body.position.y = 1.05;
  body.name = "hitProxy";
  root.add(body);

  const { rifle, muzzle, mount } = attachHipFireRifle(root, palette);
  const anim = createAnimController(model);

  return {
    root,
    body,
    rifle,
    muzzle,
    weaponMount: mount,
    palette,
    fromGltf: true,
    anim,
    model,
  };
}

/**
 * Prefer GLTF Soldier when preloaded; else capsule/fabric procedural.
 */
export function createTacticalSoldier(kind = "player") {
  if (_soldierTemplate) return createFromGltf(kind);
  return createProceduralSoldier(kind);
}

/**
 * Higher-fidelity procedural tactical operator (fallback).
 */
export function createProceduralSoldier(kind = "player") {
  const palette = PALETTE[kind] ?? PALETTE.player;
  const root = new THREE.Group();
  root.name = `soldier_${kind}`;

  const suit = fabricMat(palette.suit, 20 + kind.length);
  const vestM = fabricMat(palette.vest, 30);
  const strapM = fabricMat(palette.strap, 31);
  const accentM = fabricMat(palette.accent, 32);
  const helmM = metalMat(palette.helmet, 40);
  const skinM = mat(palette.skin, { roughness: 0.65, metalness: 0.02 });
  const bootM = fabricMat(palette.boot, 41);

  // Hit proxy
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.48, 1.05, 4, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  body.position.y = 1.05;
  body.name = "hitProxy";
  root.add(body);

  // Slight ready crouch like reference
  const figure = new THREE.Group();
  figure.position.y = 0;
  figure.rotation.x = 0.06;
  root.add(figure);

  // Boots
  add(box(0.13, 0.12, 0.24, bootM), figure, -0.12, 0.08, 0.02);
  add(box(0.13, 0.12, 0.24, bootM), figure, 0.12, 0.08, 0.02);

  // Legs (capsule)
  add(capsule(0.085, 0.38, suit, 12), figure, -0.12, 0.42, 0);
  add(capsule(0.085, 0.38, suit, 12), figure, 0.12, 0.42, 0);
  // Knees / cargo pockets
  add(box(0.14, 0.1, 0.12, accentM), figure, -0.12, 0.42, 0.04);
  add(box(0.14, 0.1, 0.12, accentM), figure, 0.12, 0.42, 0.04);

  // Hips / belt
  add(cyl(0.2, 0.22, 0.16, suit, 14), figure, 0, 0.72, 0);
  const belt = cyl(0.21, 0.21, 0.05, strapM, 14);
  add(belt, figure, 0, 0.78, 0);

  // Thigh panels + holster (right) — readable from behind
  add(box(0.1, 0.2, 0.08, accentM), figure, 0.22, 0.55, 0.02);
  add(box(0.08, 0.16, 0.06, strapM), figure, 0.24, 0.52, 0.06);
  add(box(0.1, 0.14, 0.07, accentM), figure, -0.22, 0.55, 0.02);

  // Torso
  add(capsule(0.2, 0.28, suit, 14), figure, 0, 1.05, 0);

  // Plate carrier
  const vest = box(0.42, 0.38, 0.26, vestM);
  add(vest, figure, 0, 1.12, 0.02);
  // MOLLE rows (front + back)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const strip = box(0.055, 0.022, 0.018, strapM);
      add(strip, figure, -0.16 + col * 0.08, 1.28 - row * 0.08, 0.16);
      const back = box(0.055, 0.022, 0.018, strapM);
      add(back, figure, -0.16 + col * 0.08, 1.26 - row * 0.08, -0.12);
    }
  }
  // Mag pouches front
  for (let i = 0; i < 3; i++) {
    add(box(0.09, 0.14, 0.08, accentM), figure, -0.14 + i * 0.14, 1.0, 0.18);
  }
  // Rear radio / utility pouches (key in third-person)
  add(box(0.14, 0.18, 0.1, accentM), figure, -0.14, 1.12, -0.18);
  add(box(0.14, 0.18, 0.1, accentM), figure, 0.14, 1.12, -0.18);
  add(box(0.18, 0.14, 0.1, strapM), figure, 0, 1.02, -0.2);
  // Shoulder straps
  add(box(0.08, 0.06, 0.28, strapM), figure, -0.16, 1.34, 0, 0.15, 0, 0.1);
  add(box(0.08, 0.06, 0.28, strapM), figure, 0.16, 1.34, 0, 0.15, 0, -0.1);

  // Arms — slightly forward ready pose
  const armL = capsule(0.065, 0.32, suit, 12);
  add(armL, figure, -0.3, 1.12, 0.06, 0.35, 0, 0.25);
  const armR = capsule(0.065, 0.32, suit, 12);
  add(armR, figure, 0.28, 1.08, 0.12, 0.55, 0, -0.35);

  // Gloves
  add(sphere(0.055, fabricMat(0x1a1a1a, 50), 10), figure, -0.34, 0.88, 0.22);
  add(sphere(0.055, fabricMat(0x1a1a1a, 51), 10), figure, 0.22, 0.9, 0.32);

  // Neck + lower face shadow under helmet
  add(cyl(0.07, 0.08, 0.08, skinM, 10), figure, 0, 1.42, 0.01);

  // Ballistic helmet (dome)
  const helm = sphere(0.17, helmM, 16);
  helm.scale.set(1.05, 0.85, 1.15);
  add(helm, figure, 0, 1.62, 0.02);
  // Helmet rim / NVG mount
  add(box(0.12, 0.04, 0.08, metalMat(0x1a1a1a, 52)), figure, 0, 1.7, 0.12);
  add(box(0.22, 0.05, 0.08, helmM), figure, 0, 1.55, 0.14);
  // Headset cups
  add(box(0.06, 0.09, 0.07, strapM), figure, -0.2, 1.6, 0.02);
  add(box(0.06, 0.09, 0.07, strapM), figure, 0.2, 1.6, 0.02);
  // Boom mic
  add(box(0.02, 0.02, 0.12, metalMat(0x222222, 53)), figure, 0.16, 1.52, 0.12);

  const { rifle, muzzle } = createRifle(palette);
  // Hip-fire mount on figure (same convention as GLTF)
  const mount = new THREE.Group();
  mount.name = "hipFireMount";
  mount.position.set(0.22, 1.12, 0.38);
  figure.add(mount);
  mount.add(rifle);

  return {
    root,
    body,
    rifle,
    muzzle,
    weaponMount: mount,
    palette,
    fromGltf: false,
    anim: null,
    model: figure,
  };
}

/** Weathered wooden crate with X bracing like the reference. */
export function createWoodCrate(w, h, d) {
  const group = new THREE.Group();
  const woodMap = noiseTex(77, 128, { mode: "wood", repeat: 1.5 });
  const wood = mat(0x6a5a48, {
    roughness: 0.94,
    map: woodMap,
    bumpMap: woodMap,
    bumpScale: 0.9,
  });
  const plank = mat(0x4a3c2e, { roughness: 0.96, map: woodMap });
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);
  const band1 = new THREE.Mesh(new THREE.BoxGeometry(w + 0.02, 0.05, d + 0.02), plank);
  band1.position.y = h * 0.32;
  group.add(band1);
  const band2 = band1.clone();
  band2.position.y = -h * 0.32;
  group.add(band2);
  for (const [sx, sz] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, h + 0.02, 0.05), plank);
    post.position.set((sx * w) / 2, 0, (sz * d) / 2);
    group.add(post);
  }
  // Front / side X braces
  for (const face of [
    { z: d / 2 + 0.01, ry: 0 },
    { z: -d / 2 - 0.01, ry: 0 },
    { x: w / 2 + 0.01, ry: Math.PI / 2 },
    { x: -w / 2 - 0.01, ry: Math.PI / 2 },
  ]) {
    const braceA = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.04, 0.03), plank);
    braceA.rotation.z = 0.55;
    braceA.position.set(face.x ?? 0, 0, face.z ?? 0);
    if (face.ry) braceA.rotation.y = face.ry;
    group.add(braceA);
    const braceB = braceA.clone();
    braceB.rotation.z = -0.55;
    group.add(braceB);
  }
  group.userData.solidMesh = core;
  return group;
}
