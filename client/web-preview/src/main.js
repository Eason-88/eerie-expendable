import * as THREE from "three";
import { Hud } from "./Hud.js";
import { LevelStateMachine, LevelPhase } from "./LevelState.js";
import { createCoverSpots } from "./Cover.js";
import { spawnBetrayerSquad } from "./Enemy.js";
import { CombatSystem } from "./Combat.js";
import { Player } from "./Player.js";
import { Radio } from "./Radio.js";
import { HorrorEvents, HORROR_CONFIG } from "./Horror.js";
import { SniperEncounter } from "./Sniper.js";
import { WorldCollision } from "./Collision.js";

const hud = new Hud();
const level = new LevelStateMachine((phase) => {
  hud.setPhase(phase);
  hud.showWin(phase === LevelPhase.Win);
});

const radio = new Radio({
  onSubtitle: (line) => hud.setRadio(line),
  onBlockedTransmit: (msg) => hud.message(msg),
});

fetch("http://127.0.0.1:8000/health")
  .then((r) => r.json())
  .then((data) => hud.setApi(`API: ${data.status} · ${data.app}`))
  .catch(() => hud.setApi("API: offline（可选）"));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x5a6b60);
scene.fog = new THREE.Fog(0x5a6b60, 12, 58);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  220
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xcfe0d4, 0x2a332c, 0.85));
const sun = new THREE.DirectionalLight(0xffe6c8, 0.7);
sun.position.set(16, 26, 8);
sun.castShadow = true;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(100, 120),
  new THREE.MeshStandardMaterial({ color: 0x3a5240, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

for (let i = 0; i < 55; i++) {
  const x = (Math.random() - 0.5) * 90;
  const z = -40 + Math.random() * 70;
  if (Math.abs(x) < 5 && z < 8 && z > -38) continue;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.25, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a3426 })
  );
  const crown = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 2.7, 7),
    new THREE.MeshStandardMaterial({ color: 0x2c4a34 })
  );
  trunk.position.set(x, 1.2, z);
  crown.position.set(x, 3.15, z);
  trunk.castShadow = crown.castShadow = true;
  scene.add(trunk, crown);
}

const baseCenter = new THREE.Vector3(0, 0, -40);
const worldCollision = new WorldCollision();
{
  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a4038 })
  );
  hut.position.set(baseCenter.x, 1.5, baseCenter.z);
  scene.add(hut);
  worldCollision.addMesh(hut, 0.08);
  for (let i = 0; i < 6; i++) {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.7, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0x3a2a2a })
    );
    body.rotation.z = Math.PI / 2;
    body.position.set(
      baseCenter.x + (Math.random() - 0.5) * 7,
      0.28,
      baseCenter.z + 4 + Math.random() * 3
    );
    scene.add(body);
  }
}

const coverLayouts = [
  { x: -5, z: 2, w: 2.1, h: 1.3, d: 0.7 },
  { x: 4, z: -2, w: 2.2, h: 1.35, d: 0.7 },
  { x: -10, z: -5, w: 2.0, h: 1.3, d: 0.7 },
  { x: 8, z: -10, w: 2.2, h: 1.35, d: 0.7 },
  { x: -3.5, z: -22, w: 2.4, h: 1.45, d: 0.85, interactZ: 1.3 },
  { x: 3.2, z: -26, w: 2.3, h: 1.4, d: 0.8, interactZ: 1.25 },
  { x: -2.8, z: -30, w: 2.5, h: 1.5, d: 0.85, interactZ: 1.3 },
  { x: 2.5, z: -33, w: 2.2, h: 1.35, d: 0.75, interactZ: 1.2 },
  { x: -4, z: -42, w: 2.3, h: 1.4, d: 0.8 },
  { x: 4.5, z: -44, w: 2.2, h: 1.35, d: 0.75 },
  { x: 0, z: -47, w: 2.4, h: 1.45, d: 0.8 },
];

const covers = createCoverSpots(scene, coverLayouts);
const coverMeshes = covers.map((c) => c.mesh);
for (const cover of covers) {
  worldCollision.addMesh(cover.mesh, 0.06);
}

const combat = new CombatSystem(scene);
const player = new Player(scene);
player.bindInput(renderer.domElement);

const horror = new HorrorEvents(scene);
// Train is a child Group — register an explicit world box (avoids wrong AABB at origin)
{
  const tp = HORROR_CONFIG.trainPos;
  worldCollision.addBox(tp.x, 1.8, tp.z, 10.4, 3.4, 3.5, 0.12);
}

const sniper = new SniperEncounter(
  scene,
  new THREE.Vector3(-1.5, 0, -37),
  worldCollision
);

let enemies = [];
let waveTotal = 0;
let betrayalStarted = false;
let flags = { guidedToHorror: false, guidedToSniper: false };
let betrayalDelayId = 0;
/** Where the player arrived at the nest — allies push from this southern approach. */
let playerEntryPos = new THREE.Vector3(0, 0, -30);

function clearEnemies() {
  for (const e of enemies) scene.remove(e.root);
  enemies = [];
  waveTotal = 0;
  hud.setEnemies(0, 0);
}

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

function spawnBetrayers() {
  clearEnemies();
  enemies = spawnBetrayerSquad(scene, () => player, playerEntryPos);
  waveTotal = enemies.length;
  hud.setEnemies(waveTotal, waveTotal);
}

function beginBetrayal() {
  if (betrayalStarted) return;
  betrayalStarted = true;
  level.set(LevelPhase.Betrayal);
  radio.stopNag();
  radio.push(
    "betrayal",
    "总部",
    "通告全频段：黑鹰7号已叛变。立即执行清理措施。",
    5
  );
  radio.push(
    "betrayal2",
    "支援小队",
    "收到。沿进入路线接敌，目标确认为黑鹰7号——推进并开火！",
    4
  );
  hud.setObjective("友军从南侧缓慢推进 · 存活并清剿");
  hud.message("支援小队正从你来时的方向压过来！");
  spawnBetrayers();
}

function startCampaign() {
  clearEnemies();
  window.clearTimeout(betrayalDelayId);
  level.resetToExplore();
  player.reset();
  player.root.position.set(0, 0, 10);
  player.aimYaw = Math.PI;
  betrayalStarted = false;
  flags = { guidedToHorror: false, guidedToSniper: false };
  horror.resetVisuals();
  sniper.active = false;
  sniper.cleared = false;
  sniper._clearWarning();
  sniper._cooldown = 2.5;
  radio._seen.clear();
  radio._queue.length = 0;
  radio._current = null;
  radio._enabledNag = true;
  radio._nagTimer = 12;
  radio.push(
    "intro",
    "总部",
    "黑鹰7号，车队失联。立刻报告！黑鹰7号，能听到吗？",
    4.5
  );
  hud.setObjective("调查并驱散林中异象（开枪 / 靠近）");
  hud.setEnemies(0, 0);
  hud.setRadio(null);
  hud.message("列车顶与稻草人会一直在 · 开枪或靠近才能驱散");
  hud.showWin(false);
}

startCampaign();

document.getElementById("restart").addEventListener("click", () => {
  startCampaign();
  renderer.domElement.requestPointerLock?.();
});

window.addEventListener("keydown", (e) => {
  if (e.code === "KeyT") radio.tryTransmit();
});

const camPos = new THREE.Vector3();
const look = new THREE.Vector3();
const clock = new THREE.Clock();

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
  radio.update(dt);

  if (level.phase !== LevelPhase.Win && player.hp > 0) {
    player.update(dt, covers, hud, combat, worldCollision);
    horror.update(dt, player.position, radio, hud);

    if (level.phase === LevelPhase.Explore) {
      if (!flags.guidedToHorror && player.position.z < 6) {
        flags.guidedToHorror = true;
        hud.setObjective("西侧列车开枪驱散猪头怪 · 东侧稻草人开枪或靠近");
      }
      if (horror.bothCleared && !flags.guidedToSniper) {
        flags.guidedToSniper = true;
        hud.setObjective("异象已散 · 向北深入接近据点");
        radio.push(
          "after_horror",
          "总部",
          "黑鹰7号？传感器尖峰消失了。继续前进，禁止擅自脱离。",
          4
        );
      }
      if (player.position.z < -18 && (horror.bothCleared || player.position.z < -24)) {
        level.set(LevelPhase.Sniper);
        sniper.start(radio, hud);
        hud.setObjective("利用掩体前进，抵达狙击位置");
      }
    }

    if (level.phase === LevelPhase.Sniper) {
      const reached = sniper.update(dt, player, combat, hud);
      if (reached === "reached") {
        playerEntryPos.copy(player.position);
        radio.push(
          "empty_nest",
          "黑鹰7号（自语）",
          "狙击手不在……据点里的人，死相都不对。",
          4
        );
        hud.setObjective("支援即将抵达……");
        betrayalDelayId = window.setTimeout(() => {
          if (level.phase === LevelPhase.Sniper) beginBetrayal();
        }, 3500);
      }
    }

    if (level.phase === LevelPhase.Betrayal) {
      for (const enemy of enemies) enemy.update(dt, enemyFire, worldCollision);
      const alive = enemies.filter((e) => e.alive).length;
      hud.setEnemies(alive, waveTotal);
      if (alive === 0 && waveTotal > 0) {
        level.notifyWaveCleared();
        radio.stopNag();
        radio.push(
          "win",
          "黑鹰7号（自语）",
          "……他们都倒下了。频道那头还在说清理。",
          4
        );
        hud.setObjective("第一关完成");
        hud.message("叛变清剿完成");
      }
    }

    combat.update(dt, enemies, player, coverMeshes, hud, horror, radio, [], worldCollision);
    hud.setHp(player.hp, player.maxHp);
    hud.setAmmo(player.ammo);
  } else if (player.hp <= 0 && level.phase !== LevelPhase.Win) {
    hud.message("你倒下了 · 点击「重新潜入」重试");
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

hud.setRadio(null);
hud.message("点击画面锁定鼠标 · 向北深入森林");
animate();
