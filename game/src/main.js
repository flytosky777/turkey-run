// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and game over (caught
// or escaped), and the farmer's chase is always on screen.
//
// ?seed=N fixes the obstacle pattern. ?shot=start|play|caught|escaped (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_CORN, EVENT_FEATHER, EVENT_HIT, EVENT_OVER } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, ACTION_SLIDE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // A jump press is read once per frame and handed to the next fixed step, so the
  // menu handler can never eat it: the world's jump buffer then times it.
  let pendingJump = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.gobble();
    world.reset();
    accumulator = 0;
    pendingJump = false;
    screen = SCREEN_PLAY;
    announce(`Playing. ${LIVES} lives. Reach the woods, 1200 metres away.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    pendingJump = false;
    if (world.state.over === 'escaped') {
      audio.escaped();
      announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught. Score ${world.state.score}. Best ${best}.`);
    }
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & 16) audio.toggleMute();
    if (actions & ACTION_JUMP) pendingJump = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      pendingJump = false;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Attract mode: the farm runs behind the title panel and the turkey plays itself.
      world.step(STEP, { jump: false, slide: false }, true);
      return;
    }
    const jump = pendingJump;
    pendingJump = false;
    const slide = input.slideDown();
    const events = world.step(STEP, { jump, slide }, false);
    if (events & EVENT_HIT) {
      audio.hit();
      audio.farmerYell();
      announce(world.state.lives === 1 ? 'Hit. 1 life left.' : `Hit. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_CORN) audio.corn();
    if (events & EVENT_FEATHER) audio.feather();
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Jump and slide are read inside step() so they land on the right fixed step; the
    // confirm/pause actions are handled here so menus respond at once.
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch up unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Run. Press Space or click to run from the farmer.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
