// Gobble Run's renderer: every pixel is drawn with canvas paths — a sunset farm, a
// running turkey, a chasing farmer, ovens, knives and corn. Nothing is loaded from a
// file, so the game plays with the network off.

import { FIELD, TURKEY, FARMER, GOAL_METRES, PALETTE, FONT } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || FIELD.width;
    const h = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
  }
  resize();
  window.addEventListener('resize', resize);

  function drawSky(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.groundY);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.55, PALETTE.skyMid);
    g.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.groundY + 2);
    // Low sun, half sunk behind the hills.
    ctx.save();
    ctx.fillStyle = PALETTE.sunGlow;
    ctx.beginPath();
    ctx.arc(1010, 520, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sun;
    ctx.beginPath();
    ctx.arc(1010, 520, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Clouds.
    ctx.fillStyle = PALETTE.cloud;
    for (const c of state.clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 58 * c.scale, 15 * c.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 34 * c.scale, c.y + 5 * c.scale, 40 * c.scale, 12 * c.scale, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 36 * c.scale, c.y + 6 * c.scale, 34 * c.scale, 10 * c.scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHills(state) {
    // Two ridges of hills, each a row of sine bumps, scrolling at different rates.
    const layers = [
      { parallax: 0.18, color: PALETTE.hillFar, base: 560, amp: 46, period: 420 },
      { parallax: 0.34, color: PALETTE.hillNear, base: 596, amp: 34, period: 300 },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, FIELD.groundY);
      const offset = (state.distancePx * layer.parallax) % layer.period;
      for (let x = 0; x <= FIELD.width; x += 16) {
        const wx = x + offset;
        const y = layer.base - Math.abs(Math.sin((wx / layer.period) * Math.PI)) * layer.amp
          - Math.sin(wx / 97) * 8;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(FIELD.width, FIELD.groundY);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawBarnAndTrees(state) {
    const offset = (state.distancePx * 0.55) % 2600;
    // One barn per 2600 px of travel, then trees between barns.
    const barnX = FIELD.width + 80 - offset;
    if (barnX > -320 && barnX < FIELD.width + 40) drawBarn(barnX, 470);
    for (let i = 0; i < 5; i += 1) {
      const treeX = ((i * 520 + 700 - state.distancePx * 0.55) % 2600 + 2600) % 2600 - 200;
      if (treeX > -80 && treeX < FIELD.width + 40) drawTree(treeX, FIELD.groundY, 0.9 + hash(i) * 0.5);
    }
  }

  function drawBarn(x, baseY) {
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(x, baseY, 220, 150);
    // Gambrel roof.
    ctx.fillStyle = PALETTE.barnRoof;
    ctx.beginPath();
    ctx.moveTo(x - 14, baseY);
    ctx.lineTo(x + 40, baseY - 62);
    ctx.lineTo(x + 110, baseY - 92);
    ctx.lineTo(x + 180, baseY - 62);
    ctx.lineTo(x + 234, baseY);
    ctx.closePath();
    ctx.fill();
    // Door and trim.
    ctx.fillStyle = PALETTE.barnTrim;
    ctx.fillRect(x + 82, baseY + 62, 56, 88);
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(x + 86, baseY + 66, 48, 84);
    ctx.strokeStyle = PALETTE.barnTrim;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 110, baseY + 66);
    ctx.lineTo(x + 110, baseY + 150);
    ctx.stroke();
    // Hay loft window.
    ctx.fillStyle = PALETTE.barnTrim;
    ctx.fillRect(x + 96, baseY + 18, 28, 28);
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(x + 100, baseY + 22, 20, 20);
  }

  function drawTree(x, baseY, s) {
    ctx.fillStyle = '#5d3a24';
    ctx.fillRect(x - 5 * s, baseY - 46 * s, 10 * s, 46 * s);
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.arc(x, baseY - 78 * s, 34 * s, 0, Math.PI * 2);
    ctx.arc(x - 24 * s, baseY - 52 * s, 24 * s, 0, Math.PI * 2);
    ctx.arc(x + 24 * s, baseY - 52 * s, 24 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.treeDark;
    ctx.beginPath();
    ctx.arc(x - 10 * s, baseY - 66 * s, 18 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGround(state) {
    ctx.fillStyle = PALETTE.groundTop;
    ctx.fillRect(0, FIELD.groundY, FIELD.width, 10);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY + 10, FIELD.width, FIELD.height - FIELD.groundY - 10);
    // Grass tufts and pebbles, keyed to the ground's scroll so they never flicker.
    const start = Math.floor((state.distancePx - 40) / 90);
    for (let i = start; i < start + 18; i += 1) {
      const x = i * 90 - state.distancePx + 40 + hash(i) * 40;
      const y = FIELD.groundY + 22 + hash(i + 50) * 70;
      ctx.strokeStyle = hash(i + 9) > 0.5 ? PALETTE.grass : '#a08a5a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y - 9);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 7, y - 10);
      ctx.moveTo(x + 9, y);
      ctx.lineTo(x + 12, y - 7);
      ctx.stroke();
    }
    // Fence posts along the back of the field.
    ctx.fillStyle = PALETTE.fence;
    const fStart = Math.floor(state.distancePx / 130);
    for (let i = fStart; i < fStart + 12; i += 1) {
      const x = i * 130 - state.distancePx;
      ctx.fillRect(x, FIELD.groundY - 42, 8, 42);
    }
    ctx.fillRect(0, FIELD.groundY - 34, FIELD.width, 5);
    ctx.fillRect(0, FIELD.groundY - 18, FIELD.width, 5);
  }

  function drawTurkey(state) {
    const t = state.turkey;
    if (t.invulnT > 0 && Math.floor(t.invulnT * 12) % 2 === 0) return; // blink while invulnerable
    const phase = t.runPhase;
    const sliding = t.state === 'slide';
    const jumping = t.state === 'jump';
    ctx.save();
    ctx.translate(TURKEY.x + 32, t.y);
    if (sliding) ctx.rotate(-0.28);
    else if (jumping) ctx.rotate(0.12);
    // Legs.
    ctx.strokeStyle = PALETTE.turkeyLeg;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const legSwing = Math.sin(phase) * 12;
    const legSwing2 = Math.sin(phase + Math.PI) * 12;
    ctx.beginPath();
    if (jumping || sliding) {
      ctx.moveTo(-6, -14);
      ctx.lineTo(-14, 0);
      ctx.moveTo(8, -14);
      ctx.lineTo(16, 0);
    } else {
      ctx.moveTo(-6, -14);
      ctx.lineTo(-6 + legSwing, 0);
      ctx.moveTo(8, -14);
      ctx.lineTo(8 + legSwing2, 0);
    }
    ctx.stroke();
    // Tail fan: five feathers fanning behind, swaying as the turkey runs.
    const sway = Math.sin(phase * 0.5) * 0.06;
    for (let i = 0; i < 5; i += 1) {
      const angle = -2.5 + i * 0.42 + sway;
      ctx.save();
      ctx.translate(-22, -26);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.turkeyTail[i];
      ctx.beginPath();
      ctx.ellipse(-20, 0, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(-32, 0, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.ellipse(0, -28, 34, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(-6, -20, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wing, flapping with the run.
    const flap = jumping ? -0.9 : Math.sin(phase) * 0.35 - 0.15;
    ctx.save();
    ctx.translate(-2, -30);
    ctx.rotate(flap);
    ctx.fillStyle = PALETTE.turkeyDark;
    ctx.beginPath();
    ctx.ellipse(-4, 0, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Head, beak, wattle, eye.
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.arc(30, -56, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyBeak;
    ctx.beginPath();
    ctx.moveTo(40, -60);
    ctx.lineTo(54, -55);
    ctx.lineTo(40, -51);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyWattle;
    ctx.beginPath();
    ctx.ellipse(38, -46, 4, 7, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1c22';
    ctx.beginPath();
    ctx.arc(33, -59, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(34, -60, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawFarmer(state) {
    const gap = state.gap;
    const x = TURKEY.x - gap - FARMER.width + 20;
    if (x < -FARMER.width - 40) return;
    const phase = state.farmer.phase;
    const throwing = state.farmer.throwT > 0;
    ctx.save();
    ctx.translate(x, FIELD.groundY);
    const legSwing = Math.sin(phase) * 14;
    const legSwing2 = Math.sin(phase + Math.PI) * 14;
    // Legs (overalls).
    ctx.strokeStyle = PALETTE.farmerOveralls;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -52);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.moveTo(10, -52);
    ctx.lineTo(10 + legSwing2, 0);
    ctx.stroke();
    // Torso: red shirt, blue overalls.
    ctx.fillStyle = PALETTE.farmerShirt;
    roundRect(ctx, -18, -96, 44, 48, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-14, -72, 36, 24);
    // Arms: one raised with the carving knife when throwing, else pumping.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 8;
    ctx.beginPath();
    if (throwing) {
      ctx.moveTo(20, -88);
      ctx.lineTo(44, -118);
    } else {
      ctx.moveTo(20, -88);
      ctx.lineTo(20 + Math.sin(phase) * 10, -62);
    }
    ctx.moveTo(-14, -88);
    ctx.lineTo(-14 - Math.sin(phase) * 10, -62);
    ctx.stroke();
    // The carving knife in the raised hand.
    if (throwing) {
      ctx.save();
      ctx.translate(46, -120);
      ctx.rotate(-0.7);
      ctx.fillStyle = PALETTE.knifeBlade;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(30, -2);
      ctx.lineTo(34, 0);
      ctx.lineTo(30, 3);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PALETTE.knifeHandle;
      ctx.fillRect(-10, -4, 11, 9);
      ctx.restore();
    }
    // Head, beard, straw hat.
    ctx.fillStyle = PALETTE.farmerSkin;
    ctx.beginPath();
    ctx.arc(6, -110, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerBeard;
    ctx.beginPath();
    ctx.ellipse(10, -100, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerHat;
    ctx.beginPath();
    ctx.ellipse(6, -120, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-6, -136, 24, 14);
    // Angry eyes.
    ctx.fillStyle = '#1c1c22';
    ctx.beginPath();
    ctx.arc(12, -112, 2, 0, Math.PI * 2);
    ctx.arc(2, -112, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1c22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, -118);
    ctx.lineTo(15, -116);
    ctx.moveTo(6, -118);
    ctx.lineTo(-1, -116);
    ctx.stroke();
    ctx.restore();
  }

  function drawOven(ob) {
    const flicker = 0.75 + Math.sin(ob.x * 0.05 + performance.now() / 130) * 0.25;
    ctx.fillStyle = PALETTE.ovenBody;
    roundRect(ctx, ob.x, ob.y, ob.w, ob.h, 8);
    ctx.fill();
    // Chimney.
    ctx.fillRect(ob.x + ob.w - 26, ob.y - 22, 16, 24);
    // Open door, glowing with fire.
    ctx.fillStyle = `rgba(255, ${Math.round(110 + 60 * flicker)}, 26, ${0.85 * flicker + 0.15})`;
    roundRect(ctx, ob.x + 14, ob.y + 30, 46, 56, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.ovenFire;
    ctx.beginPath();
    ctx.moveTo(ob.x + 22, ob.y + 80);
    ctx.lineTo(ob.x + 30, ob.y + 48);
    ctx.lineTo(ob.x + 38, ob.y + 66);
    ctx.lineTo(ob.x + 46, ob.y + 44);
    ctx.lineTo(ob.x + 52, ob.y + 80);
    ctx.closePath();
    ctx.fill();
    // Danger sign: a small skull-ish warning triangle on the oven's side.
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('HOT!', ob.x + ob.w - 22, ob.y + 18);
  }

  function drawFence(ob) {
    ctx.fillStyle = PALETTE.fence;
    ctx.fillRect(ob.x, ob.y, 8, ob.h);
    ctx.fillRect(ob.x + ob.w - 8, ob.y, 8, ob.h);
    ctx.fillRect(ob.x, ob.y + 10, ob.w, 7);
    ctx.fillRect(ob.x, ob.y + 34, ob.w, 7);
  }

  function drawHay(ob) {
    ctx.fillStyle = '#d9a441';
    ctx.beginPath();
    ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a87c22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2 - 9, 0, Math.PI * 2);
    ctx.arc(ob.x + ob.w / 2, ob.y + ob.h / 2, ob.w / 2 - 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#f2d488';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.w / 2 + Math.cos(a) * 10, ob.y + ob.h / 2 + Math.sin(a) * 10);
      ctx.lineTo(ob.x + ob.w / 2 + Math.cos(a) * (ob.w / 2 - 4), ob.y + ob.h / 2 + Math.sin(a) * (ob.w / 2 - 4));
      ctx.stroke();
    }
  }

  function drawKnife(ob) {
    ctx.save();
    ctx.translate(ob.x + ob.w / 2, ob.y + ob.h / 2);
    ctx.rotate(ob.spin);
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(-26, -5);
    ctx.lineTo(16, -6);
    ctx.lineTo(28, 0);
    ctx.lineTo(16, 6);
    ctx.lineTo(-26, 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(-20, -4, 30, 2);
    ctx.fillStyle = PALETTE.knifeHandle;
    roundRect(ctx, -34, -5, 10, 10, 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCorn(p) {
    const bob = Math.sin(p.bob) * 4;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = PALETTE.corn;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 13, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9a92e';
    for (let r = -1; r <= 1; r += 1) {
      for (let c = -1; c <= 1; c += 1) {
        ctx.beginPath();
        ctx.arc(r * 5, c * 7, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.lineTo(-14, 18);
    ctx.lineTo(-4, 14);
    ctx.closePath();
    ctx.moveTo(8, 8);
    ctx.lineTo(14, 18);
    ctx.lineTo(4, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFeather(p) {
    const bob = Math.sin(p.bob) * 5;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(Math.sin(p.bob * 0.5) * 0.3);
    ctx.shadowColor = PALETTE.featherGold;
    ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.featherGold;
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#c98f1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(6, -14);
    ctx.stroke();
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHeart(x, y, filled, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 20, size / 20);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-11, -4, -7, -13, 0, -6);
    ctx.bezierCurveTo(7, -13, 11, -4, 0, 6);
    ctx.closePath();
    ctx.fillStyle = filled ? '#ff5a4e' : 'rgba(255,255,255,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function drawHUD(state, best) {
    // Top bar: hearts left, progress to the forest gate centre, score right.
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 16, 14, 220, 52, 12);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) drawHeart(44 + i * 44, 40, i < state.lives, 22);

    const barX = 260;
    const barW = FIELD.width - 520;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, barX, 14, barW, 52, 12);
    ctx.fill();
    const progress = Math.min(1, state.distancePx / (GOAL_METRES * 50));
    ctx.fillStyle = '#3a3049';
    roundRect(ctx, barX + 16, 34, barW - 32, 12, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.grass;
    if (progress > 0) {
      roundRect(ctx, barX + 16, 34, (barW - 32) * progress, 12, 6);
      ctx.fill();
    }
    // Forest gate at the bar's end, turkey marker on the bar (drawn shapes, not emoji,
    // so the HUD reads the same in every browser).
    const markerX = barX + 16 + (barW - 32) * progress;
    ctx.fillStyle = PALETTE.tree;
    ctx.beginPath();
    ctx.moveTo(barX + barW - 14, 30);
    ctx.lineTo(barX + barW - 6, 44);
    ctx.lineTo(barX + barW - 22, 44);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d3a24';
    ctx.fillRect(barX + barW - 16, 44, 4, 6);
    ctx.fillStyle = PALETTE.turkeyBody;
    ctx.beginPath();
    ctx.arc(markerX, 40, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyHead;
    ctx.beginPath();
    ctx.arc(markerX + 6, 34, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.floor(state.distancePx / 50)} m / ${GOAL_METRES} m`, barX + 18, 26);
    ctx.textAlign = 'right';
    ctx.fillText('to the woods', barX + barW - 40, 26);

    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, FIELD.width - 236, 14, 220, 52, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px ' + FONT;
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE ${state.score}`, FIELD.width - 32, 38);
    ctx.font = '14px ' + FONT;
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, FIELD.width - 32, 58);
    ctx.textAlign = 'left';
  }

  function panel(width, height, topY = null) {
    const x = (FIELD.width - width) / 2;
    const y = topY === null ? (FIELD.height - height) / 2 : topY;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, width, height, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, width, height, 18);
    ctx.stroke();
    return { x, y, width, height };
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(20, 12, 40, 0.32)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const p = panel(760, 380, 120);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.font = 'bold 84px ' + FONT;
    ctx.fillText('GOBBLE RUN', FIELD.width / 2, p.y + 96);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillText('The Great Turkey Escape', FIELD.width / 2, p.y + 138);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '20px ' + FONT;
    ctx.fillText('Thanksgiving is coming. The farmer is behind you.', FIELD.width / 2, p.y + 182);
    ctx.fillText('Jump the fences, dodge the oven and the carving knives,', FIELD.width / 2, p.y + 210);
    ctx.fillText('grab the corn — and make it 1200 m to the woods.', FIELD.width / 2, p.y + 238);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px ' + FONT;
    ctx.fillText('SPACE / CLICK — jump      DOWN / HOLD — slide      P — pause', FIELD.width / 2, p.y + 282);
    if (best > 0) {
      ctx.fillStyle = PALETTE.panelEdge;
      ctx.font = 'bold 20px ' + FONT;
      ctx.fillText(`BEST SCORE ${best}`, FIELD.width / 2, p.y + 318);
    }
    const blink = Math.floor(state.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 26px ' + FONT;
      ctx.fillText('PRESS SPACE OR CLICK TO RUN', FIELD.width / 2, p.y + 352);
    }
  }

  function drawOver(state, best) {
    const escaped = state.over === 'escaped';
    ctx.fillStyle = escaped ? 'rgba(16, 48, 24, 0.55)' : 'rgba(48, 10, 10, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const p = panel(620, 380);
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? '#8fe388' : PALETTE.danger;
    ctx.font = 'bold 76px ' + FONT;
    ctx.fillText(escaped ? 'ESCAPED!' : 'CAUGHT!', FIELD.width / 2, p.y + 104);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px ' + FONT;
    ctx.fillText(
      escaped
        ? 'You made it to the woods — no Thanksgiving dinner for you!'
        : 'The farmer got you… Thanksgiving dinner awaits.',
      FIELD.width / 2, p.y + 156,
    );
    ctx.font = 'bold 30px ' + FONT;
    ctx.fillText(`SCORE ${state.score}`, FIELD.width / 2, p.y + 216);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '20px ' + FONT;
    ctx.fillText(`Corn ${state.corn}   •   Distance ${Math.floor(state.distancePx / 50)} m   •   Best ${Math.max(best, state.score)}`, FIELD.width / 2, p.y + 254);
    const blink = Math.floor(state.time * 2) % 2 === 0;
    if (blink) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 24px ' + FONT;
      ctx.fillText('PRESS SPACE OR CLICK TO TRY AGAIN', FIELD.width / 2, p.y + 330);
    }
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 10, 20, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const p = panel(480, 200);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 52px ' + FONT;
    ctx.fillText('PAUSED', FIELD.width / 2, p.y + 92);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '20px ' + FONT;
    ctx.fillText('Press P or click to keep running', FIELD.width / 2, p.y + 140);
  }

  function draw(state, screen, best) {
    resize();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.shake > 0) {
      const mag = state.shake * 14;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }
    drawSky(state);
    drawHills(state);
    drawBarnAndTrees(state);
    drawGround(state);
    for (const ob of state.obstacles) {
      if (ob.kind === 'oven') drawOven(ob);
      else if (ob.kind === 'fence') drawFence(ob);
      else if (ob.kind === 'hay') drawHay(ob);
      else drawKnife(ob);
    }
    for (const p of state.pickups) {
      if (p.kind === 'corn') drawCorn(p);
      else drawFeather(p);
    }
    drawFarmer(state);
    drawTurkey(state);
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHUD(state, best);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
  }

  return { draw };
}
