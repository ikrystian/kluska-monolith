import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;
const INK = '#1a1026';
const BAT_INK = '#2a1f33';
const SPIDER_INK = '#1d1826';
/** Scales how many bats, ghosts and pumpkins appear (30% fewer than before). */
const DENSITY = 0.7;

interface Vec {
  x: number;
  y: number;
}

/** Offsets (ox/oy) are pushed away from the cursor and decay back to zero. */
interface Bat {
  x: number;
  y: number;
  baseY: number;
  ox: number;
  oy: number;
  speed: number;
  amp: number;
  phase: number;
  size: number;
}

interface Ghost {
  x: number;
  y: number;
  baseX: number;
  ox: number;
  oy: number;
  speed: number;
  phase: number;
  size: number;
}

interface Pumpkin {
  x: number;
  y: number;
  baseX: number;
  speed: number;
  phase: number;
  spin: number;
  angle: number;
  size: number;
  face: boolean;
}

interface Spider {
  x: number;
  y: number;
  anchorX: number;
  baseDrop: number;
  phase: number;
  size: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * Full-viewport Halloween overlay drawn on a canvas. Purely decorative:
 * pointer-events are disabled, and reduced-motion users get a single static frame.
 */
export function HalloweenScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer: Vec = { x: -1e4, y: -1e4 };
    let width = 0;
    let height = 0;
    let unit = 1;
    let time = 0;
    let bats: Bat[] = [];
    let ghosts: Ghost[] = [];
    let pumpkins: Pumpkin[] = [];
    let spiders: Spider[] = [];
    let flash = 0;
    let flashIn = rand(5, 10);
    let bolt: Vec[] = [];

    const populate = () => {
      const area = width * height;
      unit = clamp(Math.min(width, height) / 640, 0.55, 1.35);

      bats = Array.from({ length: clamp(Math.round((area / 150000) * DENSITY), 3, 6) }, () => {
        const baseY = rand(0, height * 0.6);
        return {
          x: rand(0, width),
          y: baseY,
          baseY,
          ox: 0,
          oy: 0,
          speed: rand(35, 85) * sign(),
          amp: rand(20, 55),
          phase: rand(0, TAU),
          size: rand(12, 22),
        };
      });

      ghosts = Array.from({ length: clamp(Math.round((area / 300000) * DENSITY), 1, 3) }, () => {
        const baseX = rand(0, width);
        return {
          x: baseX,
          y: rand(height * 0.2, height * 0.9),
          baseX,
          ox: 0,
          oy: 0,
          speed: rand(14, 26),
          phase: rand(0, TAU),
          size: rand(22, 30),
        };
      });

      pumpkins = Array.from({ length: clamp(Math.round((width / 80) * DENSITY), 4, 10) }, (_, i) => {
        const baseX = rand(0, width);
        return {
          x: baseX,
          y: rand(0, height),
          baseX,
          speed: rand(18, 40),
          phase: rand(0, TAU),
          spin: rand(-0.6, 0.6),
          angle: rand(0, TAU),
          size: rand(14, 24),
          face: i % 3 === 0,
        };
      });

      const spiderCount = width > 640 ? 2 : 1;
      spiders = Array.from({ length: spiderCount }, (_, i) => ({
        x: 0,
        y: 0,
        anchorX: ((i + rand(0.2, 0.8)) / spiderCount) * width,
        baseDrop: rand(100, 200) * unit,
        phase: rand(0, TAU),
        size: rand(12, 16),
      }));
    };

    /** Nudges an entity away from the cursor; the offset then eases back. */
    const repel = (entity: { ox: number; oy: number }, x: number, y: number, dt: number) => {
      const radius = 130 * unit;
      const dx = x + entity.ox - pointer.x;
      const dy = y + entity.oy - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < radius * radius) {
        const d = Math.sqrt(d2);
        const push = (1 - d / radius) * 260 * unit * dt;
        entity.ox += (dx / d) * push;
        entity.oy += (dy / d) * push;
      }
      const decay = Math.exp(-dt * 2.5);
      entity.ox *= decay;
      entity.oy *= decay;
    };

    const makeBolt = (): Vec[] => {
      const points: Vec[] = [];
      const steps = 10;
      let x = rand(0.2, 0.8) * width;
      for (let i = 0; i <= steps; i++) {
        points.push({ x, y: (i / steps) * height * 0.55 });
        x += rand(-34, 34) * unit;
      }
      return points;
    };

    const update = (dt: number) => {
      time += dt;

      for (const bat of bats) {
        bat.x += bat.speed * unit * dt;
        if (bat.x > width + 60) bat.x = -60;
        else if (bat.x < -60) bat.x = width + 60;
        bat.y = bat.baseY + Math.sin(time * 0.8 + bat.phase) * bat.amp * unit;
        repel(bat, bat.x, bat.y, dt);
      }

      for (const ghost of ghosts) {
        ghost.y -= ghost.speed * unit * dt;
        if (ghost.y < -90 * unit) ghost.y = height + 90 * unit;
        ghost.x = ghost.baseX + Math.sin(time * 0.6 + ghost.phase) * 28 * unit;
        repel(ghost, ghost.x, ghost.y, dt);
      }

      for (const pumpkin of pumpkins) {
        pumpkin.y += pumpkin.speed * unit * dt;
        if (pumpkin.y > height + 60 * unit) {
          pumpkin.y = -60 * unit;
          pumpkin.baseX = rand(0, width);
        }
        pumpkin.x = pumpkin.baseX + Math.sin(time * 0.9 + pumpkin.phase) * 18 * unit;
        pumpkin.angle += pumpkin.spin * dt;
      }

      for (const spider of spiders) {
        spider.x = spider.anchorX + Math.sin(time * 0.8 + spider.phase) * 12 * unit;
        spider.y = spider.baseDrop * (1 + 0.25 * Math.sin(time * 0.5 + spider.phase));
      }

      flashIn -= dt;
      if (flashIn <= 0) {
        flash = 1;
        bolt = makeBolt();
        flashIn = rand(6, 14);
      }
      flash = Math.max(0, flash - dt * 2.2);
    };

    const drawMoon = () => {
      const x = width * 0.84;
      const y = height * 0.11;
      const r = 38 * unit;

      const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
      glow.addColorStop(0, 'rgba(255, 233, 176, 0.45)');
      glow.addColorStop(1, 'rgba(255, 233, 176, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, r * 3.2, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ffe9b0';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();

      const craters: [number, number, number][] = [
        [-0.3, -0.2, 0.22],
        [0.25, 0.3, 0.16],
        [0.1, -0.45, 0.1],
      ];
      ctx.fillStyle = 'rgba(190, 150, 90, 0.22)';
      for (const [dx, dy, cr] of craters) {
        ctx.beginPath();
        ctx.arc(x + dx * r, y + dy * r, cr * r, 0, TAU);
        ctx.fill();
      }
    };

    /** One quadrant of a web anchored at (0, 0); mirrored for the other corner. */
    const drawCobweb = (size: number) => {
      const spokes = 8;
      const quarter = Math.PI / 2;
      ctx.strokeStyle = 'rgba(90, 80, 105, 0.28)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * quarter;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size);
      }
      ctx.stroke();

      for (let ring = 1; ring <= 6; ring++) {
        const r = (ring / 6) * size;
        ctx.beginPath();
        for (let i = 0; i <= spokes; i++) {
          const a = (i / spokes) * quarter;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            const mid = ((i - 0.5) / spokes) * quarter;
            ctx.quadraticCurveTo(Math.cos(mid) * r * 0.92, Math.sin(mid) * r * 0.92, x, y);
          }
        }
        ctx.stroke();
      }
    };

    const drawGhost = (ghost: Ghost) => {
      const s = ghost.size * unit;
      const blink = (time + ghost.phase) % 4.5 < 0.14;

      ctx.save();
      ctx.translate(ghost.x + ghost.ox, ghost.y + ghost.oy);

      ctx.shadowColor = 'rgba(170, 210, 255, 0.8)';
      ctx.shadowBlur = 22 * unit;
      ctx.beginPath();
      ctx.arc(0, 0, s, Math.PI, 0);
      ctx.lineTo(s, s * 1.2);
      const waves = 3;
      const step = (2 * s) / waves;
      for (let i = 0; i < waves; i++) {
        const startX = s - i * step;
        const control = i % 2 === 0 ? s * 0.42 : -s * 0.12;
        ctx.quadraticCurveTo(startX - step / 2, s * 1.2 + control, startX - step, s * 1.2);
      }
      ctx.closePath();

      const body = ctx.createRadialGradient(-s * 0.3, -s * 0.4, s * 0.1, 0, 0, s * 1.3);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(1, '#c9d7ee');
      ctx.fillStyle = body;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.5 * unit;
      ctx.strokeStyle = 'rgba(26, 16, 38, 0.3)';
      ctx.stroke();

      ctx.fillStyle = INK;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(side * s * 0.35, -s * 0.1, s * 0.13, blink ? s * 0.02 : s * 0.18, 0, 0, TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, s * 0.45, s * 0.13, s * 0.17, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    const drawPumpkin = (pumpkin: Pumpkin) => {
      const s = pumpkin.size * unit;

      ctx.save();
      ctx.translate(pumpkin.x, pumpkin.y);
      ctx.rotate(pumpkin.angle);

      ctx.shadowColor = 'rgba(255, 122, 26, 0.5)';
      ctx.shadowBlur = 14 * unit;
      const body = ctx.createRadialGradient(-s * 0.35, -s * 0.35, s * 0.1, 0, 0, s * 1.1);
      body.addColorStop(0, '#ffb347');
      body.addColorStop(1, '#d9480f');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.85, 0, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(120, 40, 0, 0.35)';
      ctx.lineWidth = 1.2 * unit;
      for (const ridge of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.ellipse(ridge * s, 0, s * 0.4, s * 0.85, 0, 0, TAU);
        ctx.stroke();
      }

      ctx.fillStyle = '#4a7c2a';
      ctx.fillRect(-s * 0.08, -s * 1.0, s * 0.16, s * 0.28);

      if (pumpkin.face) {
        ctx.fillStyle = '#ffd43b';
        ctx.shadowColor = 'rgba(255, 220, 80, 0.9)';
        ctx.shadowBlur = 10 * unit;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * s * 0.4 - s * 0.16, -s * 0.3);
          ctx.lineTo(side * s * 0.4 + s * 0.16, -s * 0.3);
          ctx.lineTo(side * s * 0.4, -s * 0.02);
          ctx.closePath();
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(-s * 0.5, s * 0.15);
        ctx.lineTo(s * 0.5, s * 0.15);
        ctx.lineTo(s * 0.25, s * 0.5);
        ctx.lineTo(0, s * 0.22);
        ctx.lineTo(-s * 0.25, s * 0.5);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    const drawBat = (bat: Bat) => {
      const s = bat.size * unit;
      const flap = Math.sin(time * 9 + bat.phase);

      ctx.save();
      ctx.translate(bat.x + bat.ox, bat.y + bat.oy);
      ctx.fillStyle = BAT_INK;

      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * s * 0.55, -s * (0.3 + 0.35 * flap), side * s * 1.15, -s * (0.1 + 0.45 * flap));
        ctx.quadraticCurveTo(side * s * 0.95, s * 0.05, side * s * 0.8, s * 0.12);
        ctx.quadraticCurveTo(side * s * 0.6, s * 0.02, side * s * 0.45, s * 0.3);
        ctx.quadraticCurveTo(side * s * 0.25, s * 0.1, 0, s * 0.1);
        ctx.closePath();
        ctx.fill();
      }

      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.14, s * 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.26, s * 0.13, 0, TAU);
      ctx.fill();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(side * s * 0.1, -s * 0.34);
        ctx.lineTo(side * s * 0.14, -s * 0.52);
        ctx.lineTo(side * s * 0.02, -s * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#ff9f1c';
      ctx.shadowColor = '#ff9f1c';
      ctx.shadowBlur = 8 * unit;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * s * 0.05, -s * 0.28, s * 0.03, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawSpider = (spider: Spider) => {
      const s = spider.size * unit;

      ctx.strokeStyle = 'rgba(30, 25, 35, 0.45)';
      ctx.lineWidth = unit;
      ctx.beginPath();
      ctx.moveTo(spider.anchorX, 0);
      ctx.lineTo(spider.x, spider.y);
      ctx.stroke();

      ctx.save();
      ctx.translate(spider.x, spider.y);
      ctx.strokeStyle = SPIDER_INK;
      ctx.lineWidth = 1.6 * unit;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 4; i++) {
          const legY = (-0.1 + i * 0.15) * s;
          const wiggle = Math.sin(time * 6 + i + spider.phase) * 0.1 * s;
          ctx.beginPath();
          ctx.moveTo(side * s * 0.12, legY);
          ctx.quadraticCurveTo(side * s * 0.6, legY - s * 0.25 + wiggle, side * s * 0.85, legY + s * 0.35);
          ctx.stroke();
        }
      }

      ctx.fillStyle = SPIDER_INK;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.25, s * 0.32, s * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.2, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ff3b3b';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * s * 0.08, -s * 0.25, s * 0.04, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      drawMoon();

      const webSize = Math.min(220 * unit, Math.min(width, height) * 0.3);
      drawCobweb(webSize);
      ctx.save();
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      drawCobweb(webSize);
      ctx.restore();

      ghosts.forEach(drawGhost);
      pumpkins.forEach(drawPumpkin);
      bats.forEach(drawBat);
      spiders.forEach(drawSpider);

      if (flash > 0) {
        ctx.save();
        ctx.strokeStyle = `rgba(230, 236, 255, ${flash})`;
        ctx.shadowColor = `rgba(200, 215, 255, ${flash})`;
        ctx.shadowBlur = 20 * unit;
        ctx.lineWidth = 2.5 * unit;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        bolt.forEach((point, i) => (i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y)));
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = `rgba(220, 228, 255, ${flash * 0.2})`;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      populate();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    let last = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      frameId = requestAnimationFrame(tick);
    };

    resize();
    if (reduceMotion) {
      draw();
    } else {
      frameId = requestAnimationFrame(tick);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-30 h-full w-full" />;
}
