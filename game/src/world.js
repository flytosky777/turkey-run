// Gobble Run's simulation: the turkey runs right, the farm scrolls left, the farmer gains
// whenever the turkey stumbles. One fixed step at a time; the renderer only paints state.
//
// The run ends two ways: the turkey reaches the forest gate (escaped) or the farmer closes
// the gap / the turkey runs out of lives (caught).

import {
  FIELD, STEP, GOAL_METRES, PX_PER_METRE, TURKEY, RUN, FARMER, LIVES,
  SPAWN, OBSTACLES, PICKUP,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_FEATHER = 4;
export const EVENT_OVER = 8;

const GRAVITY = TURKEY.gravity;
const GROUND = FIELD.groundY;

/** Seconds of forgiveness after leaving the ground before a jump no longer counts. */
const COYOTE_SECONDS = 0.12;
/** Seconds a jump press is remembered before landing. */
const BUFFER_SECONDS = 0.18;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createWorld(random) {
  const state = {
    time: 0,
    distancePx: 0,
    speed: RUN.startSpeed,
    score: 0,
    corn: 0,
    feathers: 0,
    lives: LIVES,
    gap: FARMER.startGap,
    turkey: {
      y: GROUND, // feet
      vy: 0,
      state: 'run', // 'run' | 'jump' | 'slide'
      slideT: 0,
      invulnT: 0,
      runPhase: 0,
      coyoteT: 0,
      bufferT: 0,
      dustT: 0,
    },
    farmer: { phase: 0, throwT: 0, yellT: 0 },
    obstacles: [],
    pickups: [],
    particles: [],
    clouds: [],
    shake: 0,
    over: null, // null | 'caught' | 'escaped'
    spawnT: 1.2,
  };

  for (let i = 0; i < 6; i += 1) {
    state.clouds.push({
      x: random.range(0, FIELD.width),
      y: random.range(36, 210),
      scale: random.range(0.6, 1.4),
      speed: random.range(8, 18),
    });
  }

  function reset() {
    state.time = 0;
    state.distancePx = 0;
    state.speed = RUN.startSpeed;
    state.score = 0;
    state.corn = 0;
    state.feathers = 0;
    state.lives = LIVES;
    state.gap = FARMER.startGap;
    state.turkey.y = GROUND;
    state.turkey.vy = 0;
    state.turkey.state = 'run';
    state.turkey.slideT = 0;
    state.turkey.invulnT = 0;
    state.turkey.runPhase = 0;
    state.turkey.coyoteT = 0;
    state.turkey.bufferT = 0;
    state.turkey.dustT = 0;
    state.farmer.phase = 0;
    state.farmer.throwT = 0;
    state.farmer.yellT = 0;
    state.obstacles.length = 0;
    state.pickups.length = 0;
    state.particles.length = 0;
    state.shake = 0;
    state.over = null;
    state.spawnT = 1.2;
  }

  function distanceMetres() {
    return state.distancePx / PX_PER_METRE;
  }

  function difficulty() {
    return Math.min(1, distanceMetres() / 600);
  }

  function spawnParticle(x, y, vx, vy, life, size, color, gravity = 0) {
    if (state.particles.length > 220) return;
    state.particles.push({ x, y, vx, vy, life, maxLife: life, size, color, gravity });
  }

  function featherBurst(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      spawnParticle(
        x + random.range(-14, 14), y + random.range(-16, 6),
        random.range(-160, 60), random.range(-260, -40),
        random.range(0.5, 1.1), random.range(4, 9), color, 500,
      );
    }
  }

  function sparkle(x, y, color) {
    for (let i = 0; i < 6; i += 1) {
      spawnParticle(
        x + random.range(-10, 10), y + random.range(-10, 10),
        random.range(-60, 60), random.range(-120, -20),
        random.range(0.3, 0.6), random.range(2, 4), color, 0,
      );
    }
  }

  function spawnCornPattern(baseX) {
    const kind = random.chance(0.5) ? 'arc' : 'line';
    if (kind === 'arc') {
      for (let i = 0; i < 5; i += 1) {
        const t = i / 4;
        state.pickups.push({
          kind: 'corn',
          x: baseX + i * 42,
          y: GROUND - 30 - Math.sin(t * Math.PI) * 120,
          size: PICKUP.cornSize,
          bob: random.range(0, Math.PI * 2),
        });
      }
    } else {
      for (let i = 0; i < 4; i += 1) {
        state.pickups.push({
          kind: 'corn',
          x: baseX + i * 46,
          y: GROUND - 26,
          size: PICKUP.cornSize,
          bob: random.range(0, Math.PI * 2),
        });
      }
    }
  }

  function spawnObstacle() {
    const d = difficulty();
    const metres = distanceMetres();
    const choices = [
      ['fence', 3],
      ['hay', 2.5],
    ];
    if (metres >= SPAWN.ovenFromMetres) choices.push(['oven', 2]);
    if (metres >= SPAWN.knifeFromMetres) {
      choices.push(['knifeLow', 1.5]);
      choices.push(['knifeHigh', 1.5]);
    }
    let total = 0;
    for (const [, weight] of choices) total += weight;
    let roll = random.next() * total;
    let kind = 'fence';
    for (const [name, weight] of choices) {
      roll -= weight;
      if (roll <= 0) {
        kind = name;
        break;
      }
    }
    // A knife thrown from behind is only fair when the turkey can slide for it: never
    // throw one while the turkey is mid-jump for a ground hazard, or while one is
    // about to arrive — the turkey cannot slide in the air. Downgrade it to a fence.
    if (kind === 'knifeHigh') {
      const airborne = state.turkey.state === 'jump' && state.turkey.y < GROUND - 30;
      let groundSoon = false;
      for (const ob of state.obstacles) {
        if (ob.kind === 'knifeHigh') continue;
        const closing = state.speed + (ob.kind === 'knifeLow' ? 180 : 0);
        const arrival = Math.max(0, ob.x - (TURKEY.x + TURKEY.width)) / Math.max(120, closing);
        if (arrival <= 0.7) {
          groundSoon = true;
          break;
        }
      }
      if (airborne || groundSoon) kind = 'fence';
    }
    const def = OBSTACLES[kind];
    if (kind === 'knifeHigh') {
      // Thrown by the farmer from behind: it flies right, faster than the turkey runs,
      // at chest height — slide under it. The farmer raises his arm as he throws.
      state.farmer.throwT = 0.45;
      state.obstacles.push({
        kind, x: TURKEY.x - state.gap, y: GROUND - 52, w: def.width, h: def.height,
        vx: state.speed + def.extraSpeed, spin: 0, passed: false,
      });
    } else if (kind === 'knifeLow') {
      // Skims the ground from ahead — jump over it.
      state.obstacles.push({
        kind, x: FIELD.width + 60, y: GROUND - 19, w: def.width, h: def.height,
        vx: -(state.speed + def.extraSpeed), spin: 0, passed: false,
      });
    } else {
      state.obstacles.push({
        kind, x: FIELD.width + 60, y: GROUND - def.height, w: def.width, h: def.height,
        vx: -state.speed, spin: 0, passed: false,
      });
    }
    // Corn often trails an obstacle, and a golden feather rarely floats by.
    if (random.chance(0.5)) spawnCornPattern(FIELD.width + 320 + random.range(0, 220));
    if (metres >= SPAWN.featherFromMetres && random.chance(0.05)) {
      state.pickups.push({
        kind: 'feather', x: FIELD.width + 200, y: GROUND - 150,
        size: PICKUP.featherSize, bob: random.range(0, Math.PI * 2),
      });
    }
  }

  function turkeyBox() {
    const t = state.turkey;
    const height = t.state === 'slide' ? TURKEY.slideHeight : TURKEY.height;
    // The feet sit 4 px forgiving: landing a hair late on an obstacle's tail is not a hit.
    return { x: TURKEY.x + 10, y: t.y - height + 4, w: 44, h: height - 4 };
  }

  function hitObstacle(ob) {
    const box = turkeyBox();
    const shrink = 8;
    return (
      ob.x + shrink < box.x + box.w &&
      ob.x + ob.w - shrink > box.x &&
      ob.y + shrink < box.y + box.h &&
      ob.y + ob.h - shrink > box.y
    );
  }

  function takeHit(events) {
    const t = state.turkey;
    if (t.invulnT > 0 || state.over) return events;
    state.lives -= 1;
    state.gap = Math.max(0, state.gap - FARMER.gapLostOnHit);
    state.shake = 0.35;
    t.invulnT = TURKEY.invulnerableSeconds;
    featherBurst(TURKEY.x + 32, t.y - 30, 14, '#e8a33c');
    featherBurst(TURKEY.x + 32, t.y - 30, 8, '#d2691e');
    events |= EVENT_HIT;
    if (state.lives <= 0 || state.gap <= FARMER.catchGap) {
      state.over = 'caught';
      events |= EVENT_OVER;
    }
    return events;
  }

  /**
   * One fixed step. `input` is { jump: boolean, slide: boolean } for this step;
   * in attract mode the turkey plays itself and hits never cost a life.
   */
  function step(dt, input, attract) {
    let events = 0;
    const t = state.turkey;
    if (state.over) return events;

    state.time += dt;
    state.speed = lerp(RUN.startSpeed, RUN.maxSpeed, Math.min(1, state.time / RUN.rampSeconds));
    state.distancePx += state.speed * dt;
    state.score = Math.floor(distanceMetres()) + state.corn * PICKUP.cornPoints + state.feathers * PICKUP.featherPoints;

    if (state.distancePx >= GOAL_METRES * PX_PER_METRE) {
      state.over = 'escaped';
      return events | EVENT_OVER;
    }

    // --- turkey vertical movement ---
    const onGround = t.y >= GROUND;
    if (onGround) t.coyoteT = COYOTE_SECONDS;
    else t.coyoteT = Math.max(0, t.coyoteT - dt);
    if (input.jump) t.bufferT = BUFFER_SECONDS;
    else t.bufferT = Math.max(0, t.bufferT - dt);

    if (t.bufferT > 0 && t.coyoteT > 0) {
      // A jump cancels a slide: a turkey that ducks under a knife and then sees a
      // fence must be able to leap at once.
      t.vy = TURKEY.jumpVelocity;
      t.state = 'jump';
      t.slideT = 0;
      t.bufferT = 0;
      t.coyoteT = 0;
    }
    if (t.state === 'jump' || !onGround) {
      t.vy += GRAVITY * dt;
      t.y += t.vy * dt;
      if (t.y >= GROUND) {
        t.y = GROUND;
        t.vy = 0;
        t.state = input.slide ? 'slide' : 'run';
        if (t.state === 'slide') t.slideT = TURKEY.slideSeconds;
        // A jump buffered while airborne fires the instant the turkey lands, with its
        // first frame of rise applied at once, so a knife arriving that same step is
        // cleared instead of clipping the turkey's feet.
        if (t.bufferT > 0) {
          t.vy = TURKEY.jumpVelocity;
          t.state = 'jump';
          t.bufferT = 0;
          t.coyoteT = 0;
          t.y += t.vy * dt;
        }
      }
    }
    if (onGround && t.state === 'run' && input.slide) {
      t.state = 'slide';
      t.slideT = TURKEY.slideSeconds;
    }
    if (t.state === 'slide') {
      t.slideT -= dt;
      if (t.slideT <= 0 && !input.slide) t.state = 'run';
      if (t.slideT <= 0 && input.slide) t.slideT = 0.1;
    }
    if (t.invulnT > 0) t.invulnT -= dt;
    t.runPhase += (state.speed / 420) * dt * 11;
    if (state.farmer.throwT > 0) state.farmer.throwT -= dt;
    if (state.farmer.yellT > 0) state.farmer.yellT -= dt;

    // Dust while running on the ground.
    t.dustT -= dt;
    if (onGround && t.state === 'run' && t.dustT <= 0) {
      t.dustT = 0.09;
      spawnParticle(TURKEY.x + 8, GROUND - 2, random.range(-70, -30), random.range(-40, -10), 0.5, random.range(3, 6), '#c9b18a', -60);
    }

    // --- farmer: gains on hits, falls back while the turkey runs clean ---
    if (!attract) {
      state.gap = Math.min(FARMER.maxGap, state.gap + FARMER.gapRegainPerSecond * dt);
      if (state.gap <= FARMER.catchGap) {
        state.over = 'caught';
        return events | EVENT_OVER;
      }
    }
    state.farmer.phase += (state.speed / 420) * dt * 10;

    // --- spawning ---
    state.spawnT -= dt;
    if (state.spawnT <= 0) {
      spawnObstacle();
      const interval = lerp(SPAWN.intervalStart, SPAWN.intervalEnd, difficulty());
      state.spawnT = interval * random.range(0.9, 1.25);
    }

    // --- obstacles move and collide ---
    const box = turkeyBox();
    for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
      const ob = state.obstacles[i];
      if (ob.kind === 'knifeHigh') {
        ob.x += ob.vx * dt;
        ob.spin += dt * 14;
      } else {
        ob.x += -state.speed * dt + (ob.kind === 'knifeLow' ? -OBSTACLES.knifeLow.extraSpeed * dt : 0);
        if (ob.kind === 'knifeLow') ob.spin += dt * 16;
      }
      if (ob.kind === 'oven' && random.chance(0.25)) {
        spawnParticle(ob.x + random.range(10, ob.w - 10), ob.y + 6, random.range(-8, 8), random.range(-70, -30), random.range(0.4, 0.8), random.range(2, 4), random.pick(['#ffb347', '#ff7a1a', '#ffd27a']), -40);
      }
      if (!ob.passed && ob.x + ob.w < TURKEY.x) ob.passed = true;
      if (ob.x < -160 || ob.x > FIELD.width + 400) {
        state.obstacles.splice(i, 1);
        continue;
      }
      if (!attract && t.invulnT <= 0 && hitObstacle(ob)) {
        events = takeHit(events);
        state.obstacles.splice(i, 1);
        if (events & EVENT_OVER) return events;
      }
    }

    // --- pickups drift left, bob, and get collected ---
    const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const p = state.pickups[i];
      p.x -= state.speed * dt;
      p.bob += dt * 4;
      if (p.x < -40) {
        state.pickups.splice(i, 1);
        continue;
      }
      const dx = p.x - centre.x;
      const dy = p.y + Math.sin(p.bob) * 4 - centre.y;
      if (dx * dx + dy * dy < 48 * 48) {
        if (p.kind === 'corn') {
          state.corn += 1;
          events |= EVENT_CORN;
          sparkle(p.x, p.y, '#f2c94c');
        } else {
          state.feathers += 1;
          events |= EVENT_FEATHER;
          sparkle(p.x, p.y, '#ffd94a');
        }
        state.pickups.splice(i, 1);
      }
    }

    // --- particles ---
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // --- scenery drifts ---
    for (const cloud of state.clouds) {
      cloud.x -= (cloud.speed + state.speed * 0.04) * dt;
      if (cloud.x < -160) {
        cloud.x = FIELD.width + random.range(0, 120);
        cloud.y = random.range(36, 210);
      }
    }

    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    return events;
  }

  return { state, reset, step, distanceMetres, difficulty };
}
