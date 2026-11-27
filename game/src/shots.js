// The screenshot scenes behind ?shot=start|play|caught|escaped. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (jump the ground hazards in time, slide under the high knives), so the frame
// is what a real game looks like and the same seed always gives the same frame.
//
// The caught scene's pilot reacts late, so it is caught once the knives speed up, as a
// hurried player is; the escaped scene's pilot plays well all the way to the forest gate.

import { FIELD, STEP, TURKEY, GOAL_METRES, PX_PER_METRE } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const CAUGHT_LIMIT_SECONDS = 600;
const ESCAPED_LIMIT_SECONDS = 600;

function nearestCorn(state) {
  let corn = null;
  for (const p of state.pickups) {
    if (p.kind !== 'corn' || p.x < TURKEY.x) continue;
    if (corn === null || p.x < corn.x) corn = p;
  }
  return corn;
}

/** How fast a threat closes on the turkey, in px/s, and how far away it is, in px. */
function threatTiming(state, ob) {
  const closing = ob.kind === 'knifeHigh'
    ? ob.vx
    : state.speed + (ob.kind === 'knifeLow' ? 180 : 0);
  const distance = ob.kind === 'knifeHigh'
    ? TURKEY.x - ob.x
    : ob.x - (TURKEY.x + TURKEY.width);
  return { closing: Math.max(120, closing), distance };
}

/** Seconds until the threat reaches the turkey; Infinity when it never does. */
function timeToReach(state, ob) {
  const { closing, distance } = threatTiming(state, ob);
  if (distance < -ob.w) return Infinity;
  return Math.max(0, distance) / closing;
}

/** Jump for ground hazards and low knives, slide for high knives, chase low corn. */
function autopilot(state, reactionSeconds) {
  const t = state.turkey;
  const input = { jump: false, slide: false };
  // The threat that arrives first decides the move — not the nearest by x, since a
  // knife thrown from behind starts far to the left and a fence may be nearer in time.
  let urgent = null;
  let urgentTime = Infinity;
  for (const ob of state.obstacles) {
    if (ob.kind === 'knifeHigh' && ob.x + ob.w < 0) continue;
    if (ob.kind !== 'knifeHigh' && ob.x + ob.w < TURKEY.x - 10) continue;
    const time = timeToReach(state, ob);
    if (time < urgentTime) {
      urgentTime = time;
      urgent = ob;
    }
  }
  if (urgent) {
    if (urgent.kind === 'knifeHigh') {
      // Slide under it. A ground hazard arriving right behind it is no reason to
      // stay up: a jump cancels the slide, so the turkey can leap the moment the
      // knife has passed.
      if (urgentTime < 0.4 + reactionSeconds) input.slide = true;
    } else if (urgentTime < 0.42 + reactionSeconds) {
      // No on-ground gate here: the world's jump buffer catches a press made while
      // airborne and fires it on landing, so a jump asked for a moment too early
      // still lands on time.
      input.jump = true;
    }
  }
  if (!input.jump && !input.slide && urgentTime > 1.0) {
    const corn = nearestCorn(state);
    if (corn && corn.y < FIELD.groundY - 90 && corn.x - TURKEY.x < 260) {
      input.jump = true;
    }
  }
  if (t.state === 'slide' && urgent && urgent.kind === 'knifeHigh') input.slide = true;
  return input;
}

function runFor(world, seconds, reactionSeconds, attract) {
  let events = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    const input = autopilot(world.state, reactionSeconds);
    events = world.step(STEP, input, attract);
    if (events & EVENT_OVER) break;
  }
  return events;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Unknown names stage the title.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    runFor(world, PLAY_SECONDS, 0, false);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // The pilot plays well for the first stretch, then gets hurried and sloppy: it
  // jumps too early, lands on the obstacles, and the farmer catches up.
  if (name === 'caught') {
    runFor(world, 25, 0, false);
    if (!world.state.over) runFor(world, CAUGHT_LIMIT_SECONDS, 0.3, false);
    const over = world.state.over === 'caught';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'escaped') {
    runFor(world, ESCAPED_LIMIT_SECONDS, 0, false);
    const over = world.state.over === 'escaped';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // Title: the farm runs behind the panel in attract mode, turkey and farmer alive.
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, autopilot(world.state, 0), true);
  }
  // Pull the farmer into frame for the title: the chase is the game's whole idea.
  world.state.gap = 150;
  return { screen: SCREEN_TITLE, best: 0 };
}
