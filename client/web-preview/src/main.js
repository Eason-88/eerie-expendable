import * as THREE from "three";
import { Hud } from "./Hud.js";
import { LevelStateMachine, LevelPhase } from "./LevelState.js";
import { createCoverSpots } from "./Cover.js";
import { spawnEnemyWave } from "./Enemy.js";
import { CombatSystem } from "./Combat.js";
import { Player } from "./Player.js";

const hud = new Hud();
const level = new LevelStateMachine((phase) => {
  hud.setPhase(phase);
  hud.showWin(phase === LevelPhase.Win);
});

fetch("http://127.0.0.1:8000/health")
  .then((r) => r.json())
  .then((data) => {
    hud.setApi(`API: ${data.status} · ${data.app}`);
  })
  .catch(() => {
    hud.setApi("API: offline（可选）");
  });

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6f8478);
scene.fog = new THREE.Fog(0x6f8478, 10, 55);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xcfe0d4, 0x3a4a3c, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 0.8);
sun.position.set(14, 24, 10);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(70, 70),
  new THREE.MeshStandardMaterial({ color: 0x3f5a42, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

for (let i = 0; i < 36; i++) {
  const x = (Math.random() - 0.5) * 64;
  const z = (Math.random() - 0.5) * 64;
  if (Math.hypot(x, z) < 10) continue;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3426 })
  );
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.2, 2.8, 7),
    new THREE.MeshStandardMaterial({ color: 0x2f5238 })
  );
  trunk.position.set(x, 1.2, z);
  crown.position.set(x, 3.2, z);
  trunk.castShadow = crown.castShadow = true;
  scene.add(trunk, crown);
}

const covers = createCoverSpots(scene);
const coverMeshes = covers.map((c) => c.mesh);
const combat = new CombatSystem(scene);
const player = new Player(scene);
player.bindInput(renderer.domElement);
player.reset();

let enemies = [];
let waveTotal = 0;

function clearEnemies() {
  for (const e of enemies) {
    scene.remove(e.root);
  }
  enemies = [];
}

function startWave() {
  clearEnemies();
  level.resetToExplore();
  player.reset();
  enemies = spawnEnemyWave(scene, () => player, 5);
  waveTotal = enemies.length;
  hud.message("肃清测试区敌人");
  hud.setEnemies(enemies.filter((e) => e.alive).length, waveTotal);
}

startWave();
document.getElementById("restart").addEventListener("click", () => {
  startWave();
  renderer.domElement.requestPointerLock?.();
});

const camPos = new THREE.Vector3();
const look = new THREE.Vector3();
const clock = new THREE.Clock();

function enemyFire(enemy, dirToPlayer) {
  const origin = enemy.position.clone();
  origin.y += 1.4;
  const dir = dirToPlayer.clone();
  dir.y = 0.02;
  dir.x += (Math.random() - 0.5) * enemy.aimError * 0.08;
  dir.z += (Math.random() - 0.5) * enemy.aimError * 0.08;
  dir.normalize();
  combat.spawnTracer(origin, dir, 70, 8, false);
}

function updateCamera(dt) {
  const forward = player.getAimForward();
  forward.y = 0;
  if (forward.lengthSq() > 0) forward.normalize();
  const desired = new THREE.Vector3(
    player.position.x - forward.x * 7.5,
    player.position.y + (player.inCover ? 2.6 : 3.1),
    player.position.z - forward.z * 7.5
  );
  camPos.lerp(desired, 1 - Math.exp(-8 * dt));
  camera.position.copy(camPos);
  look.set(
    player.position.x + forward.x * 4,
    player.position.y + 1.35 - player.aimPitch * 2.5,
    player.position.z + forward.z * 4
  );
  camera.lookAt(look);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  hud.update(dt);

  if (level.phase !== LevelPhase.Win && player.hp > 0) {
    player.update(dt, covers, hud, combat);
    for (const enemy of enemies) {
      enemy.update(dt, enemyFire);
    }
    combat.update(dt, enemies, player, coverMeshes, hud);

    const alive = enemies.filter((e) => e.alive).length;
    hud.setEnemies(alive, waveTotal);
    hud.setHp(player.hp, player.maxHp);
    hud.setAmmo(player.ammo);

    if (alive === 0 && waveTotal > 0) {
      level.notifyWaveCleared();
      hud.message("全部击倒");
    }
  } else if (player.hp <= 0 && level.phase !== LevelPhase.Win) {
    hud.message("你倒下了 · 按「再来一波」重试");
    hud.setHp(0, player.maxHp);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

hud.message("点击画面锁定鼠标后开始");
animate();
