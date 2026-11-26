// Skymark Courier — the world: a procedural river canyon, the rings, the plane.
// The canyon is a chain of segments marching away from the camera. Each segment
// knows the valley centre (the river winds), the ridge height on each side and
// what stands on the valley floor (runway, village, bridge, trees, balloons).
// The plane flies forward through the segments; distance travelled is the clock.
import {
  ALT_MAX, ALT_MIN, ALT_START, CLIMB_RATE, FUEL_DRAIN, FUEL_MAX, FUEL_PER_RING,
  LATERAL_LIMIT, LIVES, RING_FIRST_Z, RING_GAP_MIN, RING_GAP_START, RING_RADIUS,
  RING_SCORE, SPEED_MAX, SPEED_MIN, SPEED_START, STEP, TURN_RATE, VIEW_DEPTH,
} from './config.js';

export const EVENT_RING = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_LEVEL = 8;
export const KIND_RING = 'ring';

const SEG_LEN = 130; // world units per canyon segment
const SEG_COUNT = 28; // segments kept ahead of the plane

function smoothNoise(random, count, min, max) {
  const raw = [];
  for (let i = 0; i < count; i += 1) raw.push(random.range(min, max));
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[i];
    const c = raw[Math.min(count - 1, i + 1)];
    out.push((a + b * 2 + c) / 4);
  }
  return out;
}

export function createWorld(random) {
  // The canyon's shape: gentle S-curves, ridges that rise and fall, a river that
  // follows the valley floor. Generated once per seed; segments recycle ahead.
  const curve = smoothNoise(random, 400, -1, 1);
  const ridgeL = smoothNoise(random, 400, 0.55, 1);
  const ridgeR = smoothNoise(random, 400, 0.55, 1);
  const floorH = smoothNoise(random, 400, 0, 26);
  const feature = [];
  for (let i = 0; i < 400; i += 1) {
    const roll = random.next();
    feature.push(roll < 0.06 ? 'village' : roll < 0.11 ? 'bridge' : roll < 0.2 ? 'trees' : roll < 0.26 ? 'balloon' : 'none');
  }

  function segmentAt(index) {
    const i = ((index % 400) + 400) % 400;
    return {
      index,
      centre: curve[i] * 120,
      ridgeLeft: 150 + ridgeL[i] * 260,
      ridgeRight: 150 + ridgeR[i] * 260,
      floor: floorH[i],
      feature: feature[i],
      // The runway sits on the valley floor for the first stretch of every run.
      runway: index >= 0 && index < 4,
    };
  }

  const state = {
    distance: 0,
    speed: SPEED_START,
    throttle: 0.55,
    lateral: 0, // -LATERAL_LIMIT .. LATERAL_LIMIT, 0 = over the river
    altitude: ALT_START,
    bank: 0,
    pitch: 0,
    heading: 42, // degrees; the canyon bends, so the heading wanders
    score: 0,
    rings: 0,
    level: 1,
    lives: LIVES,
    fuel: FUEL_MAX,
    time: 0,
    invulnerable: 0,
    crashed: false,
    message: '',
    messageTime: 0,
    nextRingZ: RING_FIRST_Z,
    ringsList: [],
    best: 0,
  };

  function ringGap() {
    return Math.max(RING_GAP_MIN, RING_GAP_START - (state.level - 1) * 40);
  }

  function spawnRing(z) {
    const r = random;
    state.ringsList.push({
      kind: KIND_RING,
      z,
      x: r.range(-90, 90),
      y: r.range(70, 300),
      radius: RING_RADIUS,
      passed: false,
      hue: r.pick([46, 160, 200, 320]),
    });
  }

  function reset() {
    state.distance = 0;
    state.speed = SPEED_START;
    state.throttle = 0.55;
    state.lateral = 0;
    state.altitude = ALT_START;
    state.bank = 0;
    state.pitch = 0;
    state.heading = 42;
    state.score = 0;
    state.rings = 0;
    state.level = 1;
    state.lives = LIVES;
    state.fuel = FUEL_MAX;
    state.time = 0;
    state.invulnerable = 0;
    state.crashed = false;
    state.message = '';
    state.messageTime = 0;
    state.nextRingZ = RING_FIRST_Z;
    state.ringsList = [];
    spawnRing(RING_FIRST_Z);
  }

  function terrainHeightAt(z, lateral) {
    const seg = segmentAt(Math.floor(z / SEG_LEN));
    const t = (z / SEG_LEN) % 1;
    const next = segmentAt(seg.index + 1);
    const centre = seg.centre + (next.centre - seg.centre) * t;
    const floor = seg.floor + (next.floor - seg.floor) * t;
    const off = lateral - centre;
    const half = 190;
    if (Math.abs(off) <= half) return floor + Math.abs(off) * 0.02;
    const ridge = off < 0 ? seg.ridgeLeft : seg.ridgeRight;
    const climb = (Math.abs(off) - half) / 160;
    return floor + ridge * Math.min(1, climb);
  }

  function step(dt, steer, climb, throttleDelta, autopilot) {
    let events = 0;
    if (state.lives <= 0) return EVENT_OVER;
    state.time += dt;
    if (state.invulnerable > 0) state.invulnerable -= dt;
    if (state.messageTime > 0) state.messageTime -= dt;

    // Throttle and speed.
    state.throttle = Math.max(0, Math.min(1, state.throttle + throttleDelta * dt * 0.8));
    const targetSpeed = SPEED_MIN + (SPEED_MAX - SPEED_MIN) * state.throttle;
    state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 0.6);
    state.distance += state.speed * 1.45 * dt; // world units per second

    // Steering: bank into the turn, drift across the valley, climb and dive.
    const wantBank = steer * 0.55;
    state.bank += (wantBank - state.bank) * Math.min(1, dt * 4);
    state.lateral = Math.max(-LATERAL_LIMIT, Math.min(LATERAL_LIMIT, state.lateral + steer * TURN_RATE * 42 * dt));
    const wantPitch = climb * 0.3;
    state.pitch += (wantPitch - state.pitch) * Math.min(1, dt * 3);
    state.altitude = Math.max(ALT_MIN, Math.min(ALT_MAX, state.altitude + climb * CLIMB_RATE * dt));
    const segNow = segmentAt(Math.floor(state.distance / SEG_LEN));
    const segNext = segmentAt(Math.floor(state.distance / SEG_LEN) + 1);
    const frac = (state.distance / SEG_LEN) % 1;
    const centreNow = segNow.centre + (segNext.centre - segNow.centre) * frac;
    state.heading = (42 + (centreNow - state.lateral) * 0.06 + state.bank * 22 + 360) % 360;

    // Fuel burns; an empty tank ends the run.
    state.fuel -= FUEL_DRAIN * dt * (0.7 + state.throttle * 0.6);
    if (state.fuel <= 0) {
      state.fuel = 0;
      state.lives = 0;
      state.crashed = true;
      return EVENT_OVER;
    }

    // Rings: keep one ahead, score the ones the plane threads.
    while (state.nextRingZ < state.distance + VIEW_DEPTH) {
      spawnRing(state.nextRingZ);
      state.nextRingZ += ringGap();
    }
    for (const ring of state.ringsList) {
      if (ring.passed) continue;
      const relZ = ring.z - state.distance;
      if (relZ < -30) {
        ring.passed = true; // missed it: it drifts behind
        continue;
      }
      if (relZ <= 0) {
        const dx = ring.x - state.lateral;
        const dy = ring.y - state.altitude;
        const dist = Math.sqrt(dx * dx + dy * dy);
        ring.passed = true;
        if (dist < ring.radius && state.invulnerable <= 0) {
          state.rings += 1;
          state.score += RING_SCORE;
          state.fuel = Math.min(FUEL_MAX, state.fuel + FUEL_PER_RING);
          state.message = `RING ${state.rings}  +${RING_SCORE}`;
          state.messageTime = 1.6;
          events |= EVENT_RING;
          if (state.rings % 10 === 0) {
            state.level += 1;
            state.message = `LEVEL ${state.level} — CANYON SPEEDS UP`;
            state.messageTime = 2.2;
            events |= EVENT_LEVEL;
          }
        }
      }
    }
    state.ringsList = state.ringsList.filter((r) => r.z > state.distance - 60);

    // Terrain collision: the ridges and the valley floor bite.
    const ground = terrainHeightAt(state.distance, state.lateral);
    if (state.altitude <= ground + 6 && state.invulnerable <= 0) {
      state.lives -= 1;
      state.crashed = true;
      events |= EVENT_HIT;
      if (state.lives <= 0) return events | EVENT_OVER;
      state.altitude = Math.min(ALT_MAX, ground + 130);
      state.lateral = 0;
      state.speed = SPEED_START;
      state.invulnerable = 3;
      state.message = state.lives === 1 ? 'TERRAIN STRIKE — 1 LIFE LEFT' : 'TERRAIN STRIKE';
      state.messageTime = 2;
    }

    // Hot-air balloons drift over the valley: soft obstacles worth dodging.
    const seg = segmentAt(Math.floor(state.distance / SEG_LEN));
    if (seg.feature === 'balloon' && state.invulnerable <= 0) {
      const balloonAlt = 190 + (seg.index % 5) * 18;
      if (Math.abs(state.lateral - seg.centre) < 34 && Math.abs(state.altitude - balloonAlt) < 30) {
        state.lives -= 1;
        events |= EVENT_HIT;
        if (state.lives <= 0) return events | EVENT_OVER;
        state.invulnerable = 3;
        state.message = 'BALLOON STRIKE';
        state.messageTime = 2;
      }
    }
    return events;
  }

  reset();
  return { state, reset, step, segmentAt, terrainHeightAt, SEG_LEN, SEG_COUNT };
}

export { STEP };
