import { useEffect, useRef } from 'react';

interface ConfettiOverlayProps {
  onComplete: () => void;
}

type ParticleShape = 'rect' | 'ribbon' | 'circle';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  shape: ParticleShape;
  rotation: number;
  rotationSpeed: number;
  tilt: number;
  tiltSpeed: number;
  wobble: number;
  wobbleSpeed: number;
  wobbleAmp: number;
  age: number;
  maxLife: number;
}

interface BurstSpec {
  delayMs: number;
  originX: number;
  originY: number;
  count: number;
  minAngleDeg: number;
  maxAngleDeg: number;
  minSpeed: number;
  maxSpeed: number;
}

const COLORS = [
  '#22c55e', // emerald (matches solved indicator)
  '#3b82f6', // blue (matches accent)
  '#f59e0b', // amber
  '#ec4899', // pink
  '#a855f7', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#eab308', // yellow
] as const;

const GRAVITY = 420; // px/s^2
const DRAG_RATE = 1.8; // exponential velocity decay per second
const FADE_DURATION = 0.8; // seconds at end of life

const BURSTS: readonly BurstSpec[] = [
  // Opening lower-edge side cannons
  {
    delayMs: 0,
    originX: 0,
    originY: 0.85,
    count: 100,
    minAngleDeg: -72,
    maxAngleDeg: -22,
    minSpeed: 950,
    maxSpeed: 1750,
  },
  {
    delayMs: 0,
    originX: 1,
    originY: 0.85,
    count: 100,
    minAngleDeg: -158,
    maxAngleDeg: -108,
    minSpeed: 950,
    maxSpeed: 1750,
  },
  // Second wave from mid-height edges
  {
    delayMs: 220,
    originX: 0,
    originY: 0.62,
    count: 75,
    minAngleDeg: -66,
    maxAngleDeg: -14,
    minSpeed: 850,
    maxSpeed: 1650,
  },
  {
    delayMs: 220,
    originX: 1,
    originY: 0.62,
    count: 75,
    minAngleDeg: -166,
    maxAngleDeg: -114,
    minSpeed: 850,
    maxSpeed: 1650,
  },
  // Finishing volley from upper-side edges
  {
    delayMs: 460,
    originX: 0,
    originY: 0.42,
    count: 55,
    minAngleDeg: -55,
    maxAngleDeg: -8,
    minSpeed: 750,
    maxSpeed: 1450,
  },
  {
    delayMs: 460,
    originX: 1,
    originY: 0.42,
    count: 55,
    minAngleDeg: -172,
    maxAngleDeg: -125,
    minSpeed: 750,
    maxSpeed: 1450,
  },
];

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickShape(): ParticleShape {
  const r = Math.random();
  if (r < 0.55) return 'rect';
  if (r < 0.82) return 'ribbon';
  return 'circle';
}

function createBurstParticles(spec: BurstSpec, width: number, height: number): Particle[] {
  const speedScale = Math.max(0.65, Math.min(1.25, Math.hypot(width, height) / 1350));
  const originX = spec.originX * width;
  const originY = spec.originY * height;
  const result: Particle[] = [];

  for (let i = 0; i < spec.count; i++) {
    const angle = (randomBetween(spec.minAngleDeg, spec.maxAngleDeg) * Math.PI) / 180;
    const speed = randomBetween(spec.minSpeed, spec.maxSpeed) * speedScale;
    const shape = pickShape();

    const pWidth =
      shape === 'circle'
        ? randomBetween(5, 8)
        : shape === 'ribbon'
          ? randomBetween(4, 6)
          : randomBetween(7, 11);
    const pHeight =
      shape === 'circle'
        ? pWidth
        : shape === 'ribbon'
          ? randomBetween(13, 18)
          : randomBetween(4.5, 7);

    result.push({
      x: originX + randomBetween(-12, 12),
      y: originY + randomBetween(-12, 12),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      width: pWidth,
      height: pHeight,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape,
      rotation: randomBetween(0, Math.PI * 2),
      rotationSpeed: randomBetween(-6, 6),
      tilt: randomBetween(0, Math.PI * 2),
      tiltSpeed: randomBetween(6, 12),
      wobble: randomBetween(0, Math.PI * 2),
      wobbleSpeed: randomBetween(3, 6),
      wobbleAmp: randomBetween(18, 45),
      age: 0,
      maxLife: randomBetween(2.9, 4.3),
    });
  }

  return result;
}

/** Full-viewport celebratory confetti burst rendered on a transient canvas overlay. */
export function ConfettiOverlay({ onComplete }: ConfettiOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCompleteRef.current();
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      onCompleteRef.current();
      return;
    }

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    const particles: Particle[] = [];
    let nextBurstIndex = 0;
    const startTime = performance.now();
    let lastTime = startTime;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsedMs = now - startTime;
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      while (nextBurstIndex < BURSTS.length && elapsedMs >= BURSTS[nextBurstIndex].delayMs) {
        particles.push(...createBurstParticles(BURSTS[nextBurstIndex], width, height));
        nextBurstIndex++;
      }

      ctx.clearRect(0, 0, width, height);

      const drag = Math.exp(-DRAG_RATE * dt);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.maxLife || p.y > height + 30) {
          particles.splice(i, 1);
          continue;
        }

        p.vx *= drag;
        p.vy = p.vy * drag + GRAVITY * dt;
        p.wobble += p.wobbleSpeed * dt;
        p.tilt += p.tiltSpeed * dt;
        p.rotation += p.rotationSpeed * dt;
        p.x += (p.vx + Math.sin(p.wobble) * p.wobbleAmp) * dt;
        p.y += p.vy * dt;

        const remaining = p.maxLife - p.age;
        const alpha = remaining < FADE_DURATION ? Math.max(0, remaining / FADE_DURATION) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, Math.cos(p.tilt));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.width * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.width * 0.5, -p.height * 0.5, p.width, p.height);
        }

        ctx.restore();
      }

      if (particles.length > 0 || nextBurstIndex < BURSTS.length) {
        rafId = requestAnimationFrame(tick);
      } else {
        onCompleteRef.current();
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
