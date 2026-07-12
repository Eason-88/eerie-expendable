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
import { SaveService } from "./SaveService.js";
import { audio } from "./AudioDirector.js";
import { preloadTacticalModels } from "./CharacterFactory.js";
import { buildReferenceForest } from "./ForestEnvironment.js";

await preloadTacticalModels();

const hud = new Hud();
const level = new LevelStateMachine((phase) => {
  hud.setPhase(phase);
  hud.showWin(phase === LevelPhase.Win);
});

const radio = new Radio({
  onSubtitle: (line) => hud.setRadio(line),
  onBlockedTransmit: (msg) => hud.message(msg, 2.4, { speak: false }),
  onSpeak: (speaker, text) => audio.radioVo(speaker, text),
});

const saveService = new SaveService("http://127.0.0.1:8000");

async function persistCheckpoint(checkpoint, dataPatch = {}) {
  if (!saveService.user && !saveService.status) {
    // still booting
  }
  try {
    if (!saveService.user) {
      saveService.patchLocal(checkpoint, dataPatch);
      hud.setSync(`本地 ${checkpoint} · 等待登录`);
      return;
    }
    saveService.patchLocal(checkpoint, dataPatch);
    hud.setSync(`本地 ${checkpoint} · 同步中…`);
    const result = await saveService.push();
    if (result.conflict) {
      hud.setSync(`冲突已采用云端 v${saveService.save.version}`);
      hud.message("检测到云端更新，已合并服务器存档");
    } else {
      hud.setSync(`已同步 v${saveService.save.version} · ${checkpoint}`);
    }
  } catch {
    hud.setSync(`本地已存 ${checkpoint} · 云端离线`);
  }
}

saveService
  .bootstrap()
  .then((save) => {
    hud.setApi(
      `API: online · ${saveService.user?.display_name ?? "玩家"} · CDN ${
        saveService.remoteConfig?.cdnBaseUrl ? "已配置" : "—"
      }`
    );
    hud.setSync(`云存档 v${save.version} · ${save.checkpoint}`);
    if (save.checkpoint === "win" || save.checkpoint === "cleared") {
      hud.message("检测到通关存档，可继续游玩或重新潜入");
    }
  })
  .catch(() => {
    hud.setApi("API: offline · 使用本地存档");
    hud.setSync("本地模式");
  });

const scene = new THREE.Scene();
buildReferenceForest(scene);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.1,
  160
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
document.body.appendChild(renderer.domElement);

const baseCenter = new THREE.Vector3(0, 0, -40);
const worldCollision = new WorldCollision();
{
  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(8, 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.92 })
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

function enemyFire(enemy) {
  // Prefer chest aim so shots aren't spawned inside cover AABBs near a bad muzzle
  const origin = new THREE.Vector3(
    enemy.position.x,
    enemy.position.y + 1.4,
    enemy.position.z
  );
  const target = new THREE.Vector3(
    player.position.x,
    player.position.y + 1.25,
    player.position.z
  );
  const dir = target.sub(origin);
  if (dir.lengthSq() < 1e-6) return;
  dir.normalize();
  const spread = (enemy.aimError ?? 0.2) * 0.045;
  dir.x += (Math.random() - 0.5) * spread;
  dir.y += (Math.random() - 0.5) * spread * 0.4;
  dir.z += (Math.random() - 0.5) * spread;
  dir.normalize();
  combat.spawnTracer(origin, dir, 82, 14, false);
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
  void persistCheckpoint("betrayal");
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
  hud.message("入场：对讲机只能接收 · 向北深入森林");
  hud.showWin(false);
  void persistCheckpoint("intro");
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
  // Over-the-shoulder (right) like view-pseudo-3d.png
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const desired = new THREE.Vector3(
    player.position.x - forward.x * 6.2 + right.x * 1.15,
    player.position.y + (player.inCover ? 2.45 : 2.85),
    player.position.z - forward.z * 6.2 + right.z * 1.15
  );
  camPos.lerp(desired, 1 - Math.exp(-8 * dt));
  const shake = player.cameraShake || 0;
  if (shake > 0) {
    camPos.x += (Math.random() - 0.5) * shake * 0.35;
    camPos.y += (Math.random() - 0.5) * shake * 0.25;
    camPos.z += (Math.random() - 0.5) * shake * 0.35;
  }
  camera.position.copy(camPos);
  look.set(
    player.position.x + forward.x * 5.5 + right.x * 0.35,
    player.position.y + 1.45 - player.aimPitch * 2.2,
    player.position.z + forward.z * 5.5 + right.z * 0.35
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
        void persistCheckpoint("explore_cleared", {
          pigCleared: true,
          ritualCleared: true,
        });
      }
      if (player.position.z < -18 && (horror.bothCleared || player.position.z < -24)) {
        level.set(LevelPhase.Sniper);
        sniper.start(radio, hud);
        hud.setObjective("利用掩体前进，抵达狙击位置");
        void persistCheckpoint("sniper");
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
        void persistCheckpoint("empty_nest");
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
        void persistCheckpoint("win", { cleared: true });
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
hud.message("点击画面锁定鼠标 · 向北深入森林", 3, { speak: false });
animate();
