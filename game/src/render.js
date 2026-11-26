// Skymark Courier — the renderer: a dawn canyon in chase view.
// Pseudo-3D: the canyon is segments marching away from the camera; each one
// projects to the screen with a simple perspective scale, painted far to near.
// The plane sits fixed in the frame (lower centre), banking and pitching with
// the stick, while the world streams past it. The HUD is fully lit: altitude,
// speed, heading, fuel, score, lives and an attitude dial.
import { ALT_MAX, CANVAS_HEIGHT, CANVAS_WIDTH, HORIZON_Y, LIVES } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const CX = CANVAS_WIDTH / 2;
const FOCAL = 560;
const PLANE_Y = 512;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  function project(x, y, relZ, camX, camY) {
    const scale = FOCAL / Math.max(40, relZ);
    return {
      x: CX + (x - camX) * scale,
      y: HORIZON_Y - (y - camY) * scale,
      scale,
    };
  }

  function drawSky(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 120);
    sky.addColorStop(0, '#16224e');
    sky.addColorStop(0.45, '#4a4a7d');
    sky.addColorStop(0.78, '#c96f4a');
    sky.addColorStop(1, '#f2a35e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HORIZON_Y + 120);
    // Low sun, just over the ridge line.
    const sunX = CANVAS_WIDTH * 0.68;
    const sunY = HORIZON_Y - 42;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
    glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
    glow.addColorStop(0.25, 'rgba(255, 196, 110, 0.55)');
    glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 150, sunY - 150, 300, 300);
    ctx.fillStyle = '#ffedbe';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
    ctx.fill();
    // Slow clouds.
    ctx.fillStyle = 'rgba(255, 220, 190, 0.5)';
    for (let i = 0; i < 6; i += 1) {
      const cx = ((i * 263 + time * 6) % (CANVAS_WIDTH + 320)) - 160;
      const cy = 52 + (i % 3) * 44;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 74, 13, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 44, cy + 6, 52, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawWorld(world, time) {
    const s = world.state;
    const segLen = world.SEG_LEN;
    const camX = world.segmentAt(Math.floor(s.distance / segLen)).centre + s.lateral;
    const camY = s.altitude + 34;
    const baseSeg = Math.floor(s.distance / segLen);

    // Far ridge silhouettes first, so nearer strips paint over them.
    for (let i = world.SEG_COUNT; i >= 0; i -= 1) {
      const seg = world.segmentAt(baseSeg + i);
      const next = world.segmentAt(baseSeg + i + 1);
      const z0 = (baseSeg + i) * segLen - s.distance;
      const z1 = z0 + segLen;
      if (z1 < 30) continue;
      const pL0 = project(seg.centre - 200, seg.floor, z0, camX, camY);
      const pR0 = project(seg.centre + 200, seg.floor, z0, camX, camY);
      const pL1 = project(next.centre - 200, next.floor, z1, camX, camY);
      const pR1 = project(next.centre + 200, next.floor, z1, camX, camY);
      const ridgeL0 = project(seg.centre - 620, seg.floor + seg.ridgeLeft, z0, camX, camY);
      const ridgeR0 = project(seg.centre + 620, seg.floor + seg.ridgeRight, z0, camX, camY);
      const ridgeL1 = project(next.centre - 620, next.floor + next.ridgeLeft, z1, camX, camY);
      const ridgeR1 = project(next.centre + 620, next.floor + next.ridgeRight, z1, camX, camY);

      // Valley floor strip (alternating meadow tones).
      const meadow = (baseSeg + i) % 2 === 0 ? '#5d7a43' : '#54703d';
      ctx.fillStyle = meadow;
      ctx.beginPath();
      ctx.moveTo(pL0.x, pL0.y);
      ctx.lineTo(pR0.x, pR0.y);
      ctx.lineTo(pR1.x, pR1.y);
      ctx.lineTo(pL1.x, pL1.y);
      ctx.closePath();
      ctx.fill();

      // Left and right ridges.
      ctx.fillStyle = (baseSeg + i) % 2 === 0 ? '#6b4a3f' : '#63443a';
      ctx.beginPath();
      ctx.moveTo(pL0.x, pL0.y);
      ctx.lineTo(ridgeL0.x, ridgeL0.y);
      ctx.lineTo(ridgeL1.x, ridgeL1.y);
      ctx.lineTo(pL1.x, pL1.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = (baseSeg + i) % 2 === 0 ? '#7a5244' : '#6e4a3e';
      ctx.beginPath();
      ctx.moveTo(pR0.x, pR0.y);
      ctx.lineTo(ridgeR0.x, ridgeR0.y);
      ctx.lineTo(ridgeR1.x, ridgeR1.y);
      ctx.lineTo(pR1.x, pR1.y);
      ctx.closePath();
      ctx.fill();

      // Snow caps on the tallest ridges.
      if (seg.ridgeLeft > 330) {
        ctx.fillStyle = 'rgba(240, 238, 245, 0.85)';
        ctx.beginPath();
        ctx.moveTo(ridgeL0.x, ridgeL0.y);
        ctx.lineTo(lerp(ridgeL0.x, pL0.x, 0.22), lerp(ridgeL0.y, pL0.y, 0.22));
        ctx.lineTo(lerp(ridgeL1.x, pL1.x, 0.22), lerp(ridgeL1.y, pL1.y, 0.22));
        ctx.lineTo(ridgeL1.x, ridgeL1.y);
        ctx.closePath();
        ctx.fill();
      }

      // The river winds down the valley centre.
      const r0 = project(seg.centre - 34, seg.floor + 2, z0, camX, camY);
      const r1 = project(seg.centre + 34, seg.floor + 2, z0, camX, camY);
      const r2 = project(next.centre + 34, next.floor + 2, z1, camX, camY);
      const r3 = project(next.centre - 34, next.floor + 2, z1, camX, camY);
      ctx.fillStyle = '#3d7ab5';
      ctx.beginPath();
      ctx.moveTo(r0.x, r0.y);
      ctx.lineTo(r1.x, r1.y);
      ctx.lineTo(r2.x, r2.y);
      ctx.lineTo(r3.x, r3.y);
      ctx.closePath();
      ctx.fill();

      // The runway: grey strip with dashes on the first stretch of the run.
      if (seg.runway) {
        const w0 = project(seg.centre - 46, seg.floor + 3, z0, camX, camY);
        const w1 = project(seg.centre + 46, seg.floor + 3, z0, camX, camY);
        const w2 = project(next.centre + 46, next.floor + 3, z1, camX, camY);
        const w3 = project(next.centre - 46, next.floor + 3, z1, camX, camY);
        ctx.fillStyle = '#4c4c55';
        ctx.beginPath();
        ctx.moveTo(w0.x, w0.y);
        ctx.lineTo(w1.x, w1.y);
        ctx.lineTo(w2.x, w2.y);
        ctx.lineTo(w3.x, w3.y);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f5f2e8';
        const d0 = project(seg.centre - 4, seg.floor + 4, z0, camX, camY);
        const d1 = project(seg.centre + 4, seg.floor + 4, z0, camX, camY);
        const d2 = project(next.centre + 4, next.floor + 4, z1, camX, camY);
        const d3 = project(next.centre - 4, next.floor + 4, z1, camX, camY);
        ctx.beginPath();
        ctx.moveTo(d0.x, d0.y);
        ctx.lineTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.lineTo(d3.x, d3.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Features, near to far so nearer ones overlap correctly.
    for (let i = 0; i <= world.SEG_COUNT; i += 1) {
      const seg = world.segmentAt(baseSeg + i);
      if (seg.feature === 'none' || seg.runway) continue;
      const z = (baseSeg + i) * segLen - s.distance;
      if (z < 40 || z > 2400) continue;
      if (seg.feature === 'village') {
        for (let h = 0; h < 4; h += 1) {
          const hx = seg.centre + 120 + h * 42 - (h % 2) * 18;
          const p = project(hx, seg.floor, z, camX, camY);
          const w = Math.max(3, 26 * p.scale);
          const hh = Math.max(3, 20 * p.scale);
          ctx.fillStyle = '#e8d9b0';
          ctx.fillRect(p.x, p.y - hh, w, hh);
          ctx.fillStyle = '#a34a3a';
          ctx.beginPath();
          ctx.moveTo(p.x - 2, p.y - hh);
          ctx.lineTo(p.x + w / 2, p.y - hh - 10 * p.scale);
          ctx.lineTo(p.x + w + 2, p.y - hh);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#ffd977';
          ctx.fillRect(p.x + w * 0.3, p.y - hh * 0.55, Math.max(2, 5 * p.scale), Math.max(2, 5 * p.scale));
        }
      } else if (seg.feature === 'bridge') {
        const p0 = project(seg.centre - 90, seg.floor + 6, z, camX, camY);
        const p1 = project(seg.centre + 90, seg.floor + 6, z, camX, camY);
        const mid = project(seg.centre, seg.floor + 44, z, camX, camY);
        ctx.strokeStyle = '#8a6a4a';
        ctx.lineWidth = Math.max(2, 7 * p0.scale);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(mid.x, mid.y, p1.x, p1.y);
        ctx.stroke();
      } else if (seg.feature === 'trees') {
        for (let t = 0; t < 5; t += 1) {
          const tx = seg.centre - 150 + t * 64;
          const p = project(tx, seg.floor, z, camX, camY);
          const hgt = Math.max(4, 34 * p.scale);
          ctx.fillStyle = '#2f5230';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - hgt);
          ctx.lineTo(p.x - hgt * 0.36, p.y);
          ctx.lineTo(p.x + hgt * 0.36, p.y);
          ctx.closePath();
          ctx.fill();
        }
      } else if (seg.feature === 'balloon') {
        const bAlt = 190 + (seg.index % 5) * 18;
        const p = project(seg.centre, bAlt, z, camX, camY);
        const r = Math.max(4, 30 * p.scale);
        ctx.fillStyle = '#d6455a';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2e3c2';
        ctx.beginPath();
        ctx.arc(p.x, p.y - r * 0.25, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5a3a28';
        ctx.fillRect(p.x - r * 0.28, p.y + r * 0.95, r * 0.56, r * 0.5);
      }
    }

    // Target rings, far to near, glowing.
    const rings = [...s.ringsList].sort((a, b) => b.z - a.z);
    for (const ring of rings) {
      const relZ = ring.z - s.distance;
      if (relZ < 30 || relZ > 2500) continue;
      const p = project(ring.x, ring.y, relZ, camX, camY);
      const r = Math.max(3, ring.radius * p.scale);
      ctx.save();
      ctx.shadowColor = `hsl(${ring.hue} 90% 60%)`;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = `hsl(${ring.hue} 95% 62%)`;
      ctx.lineWidth = Math.max(2, 7 * p.scale);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, 2 * p.scale);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.82, r * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawPlane(world, time) {
    const s = world.state;
    const bob = Math.sin(time * 2.2) * 3;
    const px = CX + s.bank * 46;
    const py = PLANE_Y + bob - s.pitch * 60;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(s.bank * 0.5);
    // Soft shadow on the valley below is faked by a dark ellipse under the plane.
    ctx.fillStyle = 'rgba(20, 16, 30, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 96, 92, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings (seen from behind, slightly above).
    ctx.fillStyle = '#d8433c';
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-150, 26);
    ctx.lineTo(-146, 44);
    ctx.lineTo(-10, 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(150, 26);
    ctx.lineTo(146, 44);
    ctx.lineTo(10, 26);
    ctx.closePath();
    ctx.fill();
    // Wing tips, lit.
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.arc(-148, 35, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(148, 35, 5, 0, Math.PI * 2);
    ctx.fill();
    // Tailplane + fin.
    ctx.fillStyle = '#b8322c';
    ctx.beginPath();
    ctx.moveTo(-8, -52);
    ctx.lineTo(-58, -34);
    ctx.lineTo(-54, -22);
    ctx.lineTo(-6, -36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -52);
    ctx.lineTo(58, -34);
    ctx.lineTo(54, -22);
    ctx.lineTo(6, -36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(-12, -18);
    ctx.lineTo(12, -18);
    ctx.closePath();
    ctx.fill();
    // Fuselage, tapering away from the camera.
    const body = ctx.createLinearGradient(-16, 0, 16, 0);
    body.addColorStop(0, '#f4ede0');
    body.addColorStop(0.5, '#ffffff');
    body.addColorStop(1, '#e2d7c2');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-15, 34);
    ctx.lineTo(-11, -58);
    ctx.lineTo(11, -58);
    ctx.lineTo(15, 34);
    ctx.closePath();
    ctx.fill();
    // Cheatline + callsign.
    ctx.fillStyle = '#d8433c';
    ctx.fillRect(-14, 8, 28, 5);
    ctx.fillStyle = '#274b73';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SKY-7', 0, 30);
    // Lit cockpit windows.
    ctx.fillStyle = '#ffd977';
    ctx.beginPath();
    ctx.ellipse(-5, -44, 4, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(5, -44, 4, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Navigation lights.
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(-150, 35, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#34d17b';
    ctx.beginPath();
    ctx.arc(150, 35, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Invulnerability shimmer.
    if (s.invulnerable > 0 && Math.floor(time * 8) % 2 === 0) {
      ctx.strokeStyle = 'rgba(255, 217, 119, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -8, 158, 62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function litBox(x, y, w, h) {
    ctx.fillStyle = 'rgba(10, 16, 34, 0.72)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 217, 119, 0.55)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawHud(world) {
    const s = world.state;
    const altFt = Math.round(s.altitude * 9.2);
    const spdKt = Math.round(s.speed);
    const hdg = Math.round(s.heading);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // Altitude / speed / heading.
    litBox(18, 16, 300, 64);
    ctx.fillStyle = '#ffd977';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ALT', 32, 36);
    ctx.fillText('SPD', 132, 36);
    ctx.fillText('HDG', 228, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${altFt}`, 32, 64);
    ctx.fillText(`${spdKt}`, 132, 64);
    ctx.fillText(`${String(hdg).padStart(3, '0')}°`, 228, 64);
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '11px sans-serif';
    ctx.fillText('ft', 96, 64);
    ctx.fillText('kt', 186, 64);
    // Compass strip.
    litBox(CX - 190, 16, 380, 34);
    ctx.fillStyle = '#9fb4d8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    for (let i = -3; i <= 3; i += 1) {
      if (i === 0) continue; // the centre slot holds the ▼ marker + live heading
      const deg = (Math.round(s.heading / 45) * 45 + i * 45 + 360) % 360;
      ctx.fillText(dirs[deg / 45], CX + i * 52, 38);
    }
    ctx.fillStyle = '#ffd977';
    ctx.fillText('▼', CX, 28);
    ctx.fillText(`${String(hdg).padStart(3, '0')}°`, CX, 44);
    // Score, rings, level, lives.
    litBox(CANVAS_WIDTH - 318, 16, 300, 64);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd977';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SCORE', CANVAS_WIDTH - 304, 36);
    ctx.fillText('RINGS', CANVAS_WIDTH - 214, 36);
    ctx.fillText('LVL', CANVAS_WIDTH - 134, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(`${s.score}`, CANVAS_WIDTH - 304, 64);
    ctx.fillText(`${s.rings}`, CANVAS_WIDTH - 214, 64);
    ctx.fillText(`${s.level}`, CANVAS_WIDTH - 134, 64);
    ctx.fillStyle = '#ff5a4e';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('♥'.repeat(Math.max(0, s.lives)) + '♡'.repeat(Math.max(0, LIVES - s.lives)), CANVAS_WIDTH - 30, 64);
    // Fuel gauge.
    litBox(18, CANVAS_HEIGHT - 56, 300, 40);
    ctx.fillStyle = '#ffd977';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FUEL', 32, CANVAS_HEIGHT - 30);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(84, CANVAS_HEIGHT - 40, 200, 12);
    ctx.fillStyle = s.fuel < 25 ? '#ff5a4e' : '#34d17b';
    ctx.fillRect(84, CANVAS_HEIGHT - 40, 200 * (s.fuel / 100), 12);
    // Attitude dial, bottom right.
    const ax = CANVAS_WIDTH - 70;
    const ay = CANVAS_HEIGHT - 76;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#274b73';
    ctx.fillRect(ax - 34, ay - 34, 68, 68);
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-s.bank * 0.5);
    ctx.fillStyle = '#c96f4a';
    ctx.fillRect(-40, -40 - s.pitch * 40, 80, 40);
    ctx.fillStyle = '#5d7a43';
    ctx.fillRect(-40, -s.pitch * 40, 80, 40);
    ctx.restore();
    ctx.strokeStyle = '#ffd977';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax - 20, ay);
    ctx.lineTo(ax + 20, ay);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 217, 119, 0.55)';
    ctx.beginPath();
    ctx.arc(ax, ay, 34, 0, Math.PI * 2);
    ctx.stroke();
    // Centre message.
    if (s.messageTime > 0 && s.message) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillStyle = 'rgba(10, 16, 34, 0.55)';
      ctx.fillText(s.message, CX + 2, 152);
      ctx.fillStyle = '#ffe9b0';
      ctx.fillText(s.message, CX, 150);
    }
    // Throttle bar, bottom centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9fb4d8';
    ctx.font = '11px sans-serif';
    ctx.fillText('THR', CX, CANVAS_HEIGHT - 44);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(CX - 70, CANVAS_HEIGHT - 38, 140, 8);
    ctx.fillStyle = '#ffd977';
    ctx.fillRect(CX - 70, CANVAS_HEIGHT - 38, 140 * s.throttle, 8);
  }

  function drawTitle(world) {
    ctx.fillStyle = 'rgba(10, 16, 34, 0.45)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText('SKYMARK COURIER', CX, 190);
    ctx.fillStyle = '#ffffff';
    ctx.font = '22px sans-serif';
    ctx.fillText('Dawn run through the river canyon — thread every ring, mind the ridges.', CX, 232);
    ctx.fillStyle = '#ffd977';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ARROWS / WASD — steer & climb · SHIFT — throttle up · CTRL — throttle down', CX, 300);
    ctx.fillText('Mouse drag steers too · P — pause · M — mute · SPACE / CLICK — fly', CX, 330);
    if (world.state.best > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`BEST SCORE  ${world.state.best}`, CX, 380);
    }
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('— PRESS SPACE OR CLICK TO FLY —', CX, 440);
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 16, 34, 0.6)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9b0';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('PAUSED', CX, 330);
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px sans-serif';
    ctx.fillText('Press P or Space to keep flying.', CX, 372);
  }

  function drawOver(world) {
    const s = world.state;
    ctx.fillStyle = 'rgba(10, 16, 34, 0.62)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff8a7a';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(s.fuel <= 0 ? 'OUT OF FUEL' : 'RUN OVER', CX, 240);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(`SCORE ${s.score}   ·   RINGS ${s.rings}   ·   LEVEL ${s.level}`, CX, 300);
    if (s.score >= s.best && s.score > 0) {
      ctx.fillStyle = '#ffd977';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('NEW BEST!', CX, 344);
    }
    ctx.fillStyle = '#ffe9b0';
    ctx.font = '20px sans-serif';
    ctx.fillText('Press Space or click to fly again.', CX, 400);
  }

  function draw(state, screen, best) {
    const world = state;
    world.state.best = best;
    drawSky(world.state.time);
    drawWorld(world, world.state.time);
    drawPlane(world, world.state.time);
    if (screen === SCREEN_TITLE) drawTitle(world);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(world);
    drawHud(world);
  }

  return { draw, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER };
}
