import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { WorldCollision } from "../src/Collision.js";

describe("WorldCollision", () => {
  it("raycast hits a box and stops short of far side", () => {
    const world = new WorldCollision();
    world.addBox(0, 1, -5, 2, 2, 2);
    const hit = world.raycast(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, -1),
      20
    );
    assert.ok(hit);
    assert.ok(hit.distance < 5);
    assert.ok(Math.abs(hit.point.z - (-4)) < 0.05);
  });

  it("resolveCircleXZ prevents walking into a wall", () => {
    const world = new WorldCollision();
    world.addBox(0, 1, 0, 2, 2, 2);
    const inside = world.resolveCircleXZ(0, 0, 0.4);
    assert.ok(Math.hypot(inside.x, inside.z) >= 0.4);
    const beside = world.resolveCircleXZ(0, 2.5, 0.4);
    assert.ok(Math.abs(beside.z - 2.5) < 0.01);
  });

  it("train box at forest coords does not block center corridor", () => {
    const world = new WorldCollision();
    // Same placement as gameplay train
    world.addBox(-14, 1.8, -6, 10.4, 3.4, 3.5, 0.12);
    const corridor = world.resolveCircleXZ(0, 0, 0.42);
    assert.equal(corridor.x, 0);
    assert.equal(corridor.z, 0);
    const throughForest = world.resolveCircleXZ(0, -10, 0.42);
    assert.equal(throughForest.x, 0);
    assert.equal(throughForest.z, -10);

    const intoTrain = world.resolveCircleXZ(-14, -6, 0.42);
    assert.ok(
      Math.hypot(intoTrain.x + 14, intoTrain.z + 6) >= 0.4,
      "player should be pushed out of the train hull"
    );
  });

  it("addMesh respects parent Group world transform", () => {
    const scene = new THREE.Scene();
    const group = new THREE.Group();
    group.position.set(-14, 0, -6);
    const car = new THREE.Mesh(new THREE.BoxGeometry(10, 3.2, 3.2));
    car.position.y = 1.8;
    group.add(car);
    scene.add(group);

    const world = new WorldCollision();
    world.addMesh(car, 0);
    const box = world.boxes[0];
    const cx = (box.min.x + box.max.x) * 0.5;
    const cz = (box.min.z + box.max.z) * 0.5;
    assert.ok(Math.abs(cx - -14) < 0.2, `expected center x≈-14, got ${cx}`);
    assert.ok(Math.abs(cz - -6) < 0.2, `expected center z≈-6, got ${cz}`);
  });
});
