import * as THREE from "three";
import { ObjectPool } from "./ObjectPool.js";

function closestPointOnSegment(a, b, p) {
  const ab = new THREE.Vector3().subVectors(b, a);
  const lenSq = ab.lengthSq();
  if (lenSq < 1e-8) return a.clone();
  const t = THREE.MathUtils.clamp(
    new THREE.Vector3().subVectors(p, a).dot(ab) / lenSq,
    0,
    1
  );
  return a.clone().addScaledVector(ab, t);
}

export class CombatSystem {
  constructor(scene) {
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this._hitPoint = new THREE.Vector3();

    this.bulletPool = new ObjectPool(() => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe08a })
      );
      mesh.visible = false;
      scene.add(mesh);
      return {
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        damage: 0,
        fromPlayer: true,
      };
    }, 40);

    this.decalPool = new ObjectPool(() => {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.08, 8),
        new THREE.MeshBasicMaterial({ color: 0x1a120e, side: THREE.DoubleSide })
      );
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, life: 0 };
    }, 48);

    this.sparkPool = new ObjectPool(() => {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffaa66 })
      );
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, life: 0, vel: new THREE.Vector3() };
    }, 32);
  }

  spawnTracer(origin, direction, speed, damage, fromPlayer) {
    const bullet = this.bulletPool.acquire();
    bullet.mesh.visible = true;
    bullet.mesh.position.copy(origin);
    bullet.vel.copy(direction).multiplyScalar(speed);
    bullet.life = 0.9;
    bullet.damage = damage;
    bullet.fromPlayer = fromPlayer;
  }

  spawnDecal(point, normal) {
    const decal = this.decalPool.acquire();
    decal.mesh.visible = true;
    decal.mesh.position.copy(point).addScaledVector(normal, 0.02);
    decal.mesh.lookAt(point.clone().add(normal));
    decal.life = 6;
  }

  spawnSparks(point) {
    for (let i = 0; i < 5; i++) {
      const spark = this.sparkPool.acquire();
      spark.mesh.visible = true;
      spark.mesh.position.copy(point);
      spark.vel.set(
        (Math.random() - 0.5) * 4,
        Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      spark.life = 0.25 + Math.random() * 0.2;
    }
  }

  /**
   * @param {import('./Collision.js').WorldCollision | null} worldCollision
   */
  update(
    dt,
    enemies,
    player,
    coverMeshes,
    hud,
    horror = null,
    radio = null,
    solidMeshes = [],
    worldCollision = null
  ) {
    this.bulletPool.forEachActive((bullet) => {
      bullet.life -= dt;
      if (bullet.life <= 0) {
        bullet.mesh.visible = false;
        this.bulletPool.release(bullet);
        return;
      }

      const prev = bullet.mesh.position.clone();
      bullet.mesh.position.addScaledVector(bullet.vel, dt);
      const dir = new THREE.Vector3().subVectors(bullet.mesh.position, prev);
      const dist = dir.length();
      if (dist < 1e-5) return;
      dir.normalize();

      this.raycaster.set(prev, dir);
      this.raycaster.far = dist + 0.05;

      // Anomalies first (pig on roof / scarecrows)
      if (bullet.fromPlayer && horror?.tryHitFromRaycaster(this.raycaster, radio, hud)) {
        this.spawnSparks(prev.clone().addScaledVector(dir, dist * 0.5));
        bullet.mesh.visible = false;
        this.bulletPool.release(bullet);
        return;
      }

      // Resolve nearest blocker among world / cover / characters
      let blockDist = Infinity;
      let blockPoint = null;
      let blockNormal = new THREE.Vector3(0, 1, 0);

      const aabbHit = worldCollision?.raycast(prev, dir, dist + 0.05);
      if (aabbHit && aabbHit.distance < blockDist) {
        blockDist = aabbHit.distance;
        blockPoint = aabbHit.point;
        blockNormal = aabbHit.normal;
      }

      if (coverMeshes.length) {
        for (const m of coverMeshes) m.updateMatrixWorld?.(true);
        const coverHits = this.raycaster.intersectObjects(coverMeshes, false);
        if (
          coverHits.length &&
          coverHits[0].distance <= dist + 0.05 &&
          coverHits[0].distance < blockDist
        ) {
          blockDist = coverHits[0].distance;
          blockPoint = coverHits[0].point;
          blockNormal = coverHits[0].face?.normal ?? blockNormal;
        }
      }

      if (bullet.fromPlayer) {
        for (const enemy of enemies) {
          if (!enemy.alive) continue;
          enemy.body.updateMatrixWorld(true);
          const hits = this.raycaster.intersectObject(enemy.body, false);
          if (
            hits.length &&
            hits[0].distance <= dist + 0.05 &&
            hits[0].distance <= blockDist + 0.02
          ) {
            enemy.takeDamage(bullet.damage);
            this.spawnSparks(hits[0].point);
            this.spawnDecal(
              hits[0].point,
              hits[0].face?.normal ?? new THREE.Vector3(0, 1, 0)
            );
            bullet.mesh.visible = false;
            this.bulletPool.release(bullet);
            return;
          }
        }
      } else if (player.hp > 0) {
        player.body.updateMatrixWorld(true);
        let hitPlayer = false;
        let hitPt = null;
        const hits = this.raycaster.intersectObject(player.body, false);
        if (
          hits.length &&
          hits[0].distance <= dist + 0.05 &&
          hits[0].distance <= blockDist + 0.05
        ) {
          hitPlayer = true;
          hitPt = hits[0].point;
        } else {
          const torso = player.position.clone();
          torso.y += 1.05;
          const closest = closestPointOnSegment(prev, bullet.mesh.position, torso);
          const dx = closest.x - torso.x;
          const dz = closest.z - torso.z;
          const dy = closest.y - torso.y;
          const along = prev.distanceTo(closest);
          if (
            dx * dx + dz * dz < 0.6 * 0.6 &&
            Math.abs(dy) < 1.15 &&
            along <= blockDist + 0.05
          ) {
            hitPlayer = true;
            hitPt = closest;
          }
        }
        if (hitPlayer) {
          player.takeDamage(bullet.damage, hud);
          this.spawnSparks(hitPt);
          bullet.mesh.visible = false;
          this.bulletPool.release(bullet);
          return;
        }
      }

      if (blockDist < Infinity && blockPoint) {
        this.spawnDecal(blockPoint, blockNormal);
        this.spawnSparks(blockPoint);
        bullet.mesh.visible = false;
        this.bulletPool.release(bullet);
      }
    });

    this.decalPool.forEachActive((decal) => {
      decal.life -= dt;
      if (decal.life <= 0) {
        decal.mesh.visible = false;
        this.decalPool.release(decal);
      }
    });

    this.sparkPool.forEachActive((spark) => {
      spark.life -= dt;
      spark.mesh.position.addScaledVector(spark.vel, dt);
      spark.vel.y -= 9 * dt;
      if (spark.life <= 0) {
        spark.mesh.visible = false;
        this.sparkPool.release(spark);
      }
    });
  }
}
