import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import * as THREE from "three";
import {
  HORROR_CONFIG,
  HorrorEvents,
  distanceXZ,
  shouldDismissScarecrowsByApproach,
} from "../src/Horror.js";

function mockHud() {
  const messages = [];
  return {
    messages,
    message(text) {
      messages.push(text);
    },
  };
}

function mockRadio() {
  const lines = [];
  return {
    lines,
    push(id, speaker, text, duration) {
      lines.push({ id, speaker, text, duration });
    },
  };
}

describe("Horror persistence rules", () => {
  /** @type {HorrorEvents} */
  let horror;
  let hud;
  let radio;

  beforeEach(() => {
    horror = new HorrorEvents(new THREE.Scene());
    hud = mockHud();
    radio = mockRadio();
  });

  it("pig and scarecrows are visible from the start", () => {
    assert.equal(horror.pigVisible, true);
    assert.equal(horror.ritualVisible, true);
    assert.equal(horror.pigCleared, false);
    assert.equal(horror.ritualCleared, false);
  });

  it("pig stays after long wait (no auto despawn)", () => {
    horror.tick(30, new THREE.Vector3(0, 0, 10), radio, hud);
    assert.equal(horror.pigVisible, true);
    assert.equal(horror.pigCleared, false);
  });

  it("scarecrows stay if player does not approach or shoot", () => {
    horror.tick(30, new THREE.Vector3(0, 0, 10), radio, hud);
    assert.equal(horror.ritualVisible, true);
    assert.equal(horror.ritualCleared, false);
  });

  it("shooting pig dismisses it", () => {
    horror._pig.updateMatrixWorld(true);
    const body = horror._pigHitMeshes[0];
    const target = new THREE.Vector3();
    body.getWorldPosition(target);
    const origin = target.clone().add(new THREE.Vector3(0, 0, 5));
    const dir = target.clone().sub(origin).normalize();
    const raycaster = new THREE.Raycaster(origin, dir);
    const hit = horror.tryHitFromRaycaster(raycaster, radio, hud);
    assert.equal(hit, true);
    assert.equal(horror.pigCleared, true);
    assert.equal(horror.pigVisible, false);
    assert.ok(radio.lines.some((l) => l.id === "pig_gone"));
  });

  it("shooting scarecrow dismisses the ritual", () => {
    const crow = horror._scarecrows[0];
    crow.updateMatrixWorld(true);
    const body = horror._scarecrowHitMeshes[0];
    const target = new THREE.Vector3();
    body.getWorldPosition(target);
    const origin = target.clone().add(new THREE.Vector3(0, 0, 5));
    const dir = target.clone().sub(origin).normalize();
    const raycaster = new THREE.Raycaster(origin, dir);
    const hit = horror.tryHitFromRaycaster(raycaster, radio, hud);
    assert.equal(hit, true);
    assert.equal(horror.ritualCleared, true);
    assert.equal(horror.ritualVisible, false);
    assert.ok(radio.lines.some((l) => l.id === "ritual_gone_shot"));
  });

  it("approaching scarecrows dismisses them", () => {
    assert.equal(
      shouldDismissScarecrowsByApproach(
        HORROR_CONFIG.ritualCenter.x,
        HORROR_CONFIG.ritualCenter.z
      ),
      true
    );
    horror.update(
      0.016,
      new THREE.Vector3(
        HORROR_CONFIG.ritualCenter.x,
        0,
        HORROR_CONFIG.ritualCenter.z
      ),
      radio,
      hud
    );
    assert.equal(horror.ritualCleared, true);
    assert.equal(horror.ritualVisible, false);
    assert.ok(radio.lines.some((l) => l.id === "ritual_gone_near"));
  });

  it("far approach does not dismiss scarecrows", () => {
    assert.equal(shouldDismissScarecrowsByApproach(0, 10), false);
    horror.update(0.016, new THREE.Vector3(0, 0, 10), radio, hud);
    assert.equal(horror.ritualCleared, false);
  });

  it("bothCleared requires pig shot and ritual resolved", () => {
    assert.equal(horror.bothCleared, false);
    horror.dismissPig(radio, hud);
    assert.equal(horror.bothCleared, false);
    horror.dismissRitual(radio, hud, "approach");
    assert.equal(horror.bothCleared, true);
    assert.equal(horror.bothDone, true);
  });

  it("pig stands on train roof", () => {
    assert.ok(horror._pig.position.y >= HORROR_CONFIG.pigOnTrainOffset.y - 0.2);
  });

  it("distanceXZ helper", () => {
    assert.ok(Math.abs(distanceXZ(0, 0, 3, 4) - 5) < 1e-9);
  });
});
