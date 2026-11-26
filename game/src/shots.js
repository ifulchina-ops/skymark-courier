// Skymark Courier — screenshot scenes behind ?shot=start|play|end.
// Each scene plays the real rules forward from a fresh world for a fixed number
// of steps, steered by a simple autopilot (aim at the next ring, climb or dive
// toward it, stay off the ridges), so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 2;
const PLAY_SECONDS = 24;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** Steer toward the next ring; dive/climb to its height; keep off the ridges. */
function autopilot(state, world) {
  const ring = state.ringsList.find((r) => !r.passed && r.z > state.distance);
  let steer = 0;
  let climb = 0;
  if (ring) {
    const dx = ring.x - state.lateral;
    steer = dx > 12 ? 1 : dx < -12 ? -1 : dx / 12;
    const dy = ring.y - state.altitude;
    climb = dy > 14 ? 1 : dy < -14 ? -1 : dy / 14;
  }
  // Ridge guard: if the ground ahead is high, climb away from it.
  const ahead = world.terrainHeightAt(state.distance + state.speed * 1.2, state.lateral);
  if (ahead > state.altitude - 40) climb = 1;
  return { steer, climb };
}

/** The end scene's pilot is sloppy: it reacts late, so it is caught out once the canyon speeds up. */
function sloppyAutopilot(state, world) {
  const ring = state.ringsList.find((r) => !r.passed && r.z > state.distance);
  let steer = 0;
  let climb = 0;
  if (ring) {
    const dx = ring.x - state.lateral;
    steer = dx > 40 ? 1 : dx < -40 ? -1 : 0;
    const dy = ring.y - state.altitude;
    climb = dy > 50 ? 1 : dy < -50 ? -1 : 0;
  }
  return { steer, climb };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, 0, 0, 0);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const pilot = name === 'end' ? sloppyAutopilot : autopilot;
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const move = pilot(state, world);
    const events = world.step(STEP, move.steer, move.climb, 0);
    if (events & EVENT_OVER) break;
  }
  const over = state.lives === 0;
  if (over) state.messageTime = 0; // keep the RUN OVER panel clean
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: over ? state.score : 0 };
}
