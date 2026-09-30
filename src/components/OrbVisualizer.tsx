import React, { useEffect, useRef } from 'react';

export type AssistantState = 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR';

interface OrbVisualizerProps {
  state: AssistantState;
  audioLevel?: number; // 0 to 1
  onClick?: () => void;
  size?: number;
}

interface Ring {
  radiusRatio: number;
  rotation: number;
  speed: number;
  thickness: number;
  dash: boolean;
}

interface Particle {
  radiusRatio: number;
  angle: number;
  angularVelocity: number;
  size: number;
  phase: number;
}

const STATE_STYLES: Record<
  AssistantState,
  {
    baseRadiusRatio: number;
    glowIntensity: number;
    ringSpeed: number;
    pulseSpeed: number;
    colorPrimary: string;
    colorSecondary: string;
    rgbPrimary: [number, number, number];
  }
> = {
  IDLE: {
    baseRadiusRatio: 0.25,
    glowIntensity: 0.4,
    ringSpeed: 0.3,
    pulseSpeed: 1.2,
    colorPrimary: '#00d4ff',
    colorSecondary: '#0077aa',
    rgbPrimary: [0, 212, 255],
  },
  LISTENING: {
    baseRadiusRatio: 0.3,
    glowIntensity: 0.75,
    ringSpeed: 0.6,
    pulseSpeed: 2.2,
    colorPrimary: '#00ffcc',
    colorSecondary: '#00aa88',
    rgbPrimary: [0, 255, 204],
  },
  THINKING: {
    baseRadiusRatio: 0.26,
    glowIntensity: 0.65,
    ringSpeed: 1.8,
    pulseSpeed: 1.8,
    colorPrimary: '#a855f7',
    colorSecondary: '#6b21a8',
    rgbPrimary: [168, 85, 247],
  },
  SPEAKING: {
    baseRadiusRatio: 0.28,
    glowIntensity: 0.85,
    ringSpeed: 0.8,
    pulseSpeed: 3.0,
    colorPrimary: '#00d4ff',
    colorSecondary: '#0099cc',
    rgbPrimary: [0, 212, 255],
  },
  ERROR: {
    baseRadiusRatio: 0.26,
    glowIntensity: 0.7,
    ringSpeed: 0.5,
    pulseSpeed: 2.5,
    colorPrimary: '#ff4444',
    colorSecondary: '#aa0000',
    rgbPrimary: [255, 68, 68],
  },
};

export const OrbVisualizer: React.FC<OrbVisualizerProps> = ({
  state,
  audioLevel = 0,
  onClick,
  size = 280,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ringsRef = useRef<Ring[]>([
    { radiusRatio: 1.35, rotation: 0, speed: 0.4, thickness: 1.8, dash: true },
    { radiusRatio: 1.7, rotation: Math.PI / 3, speed: -0.3, thickness: 1.4, dash: false },
    { radiusRatio: 2.05, rotation: Math.PI, speed: 0.55, thickness: 2.0, dash: true },
  ]);

  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Initialize particle cloud
  useEffect(() => {
    const pCount = 42;
    const newParticles: Particle[] = [];
    for (let i = 0; i < pCount; i++) {
      newParticles.push({
        radiusRatio: 0.8 + Math.random() * 1.3,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.6,
        size: 1.5 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = newParticles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t0 = performance.now();
    let lastFrame = t0;

    const render = (time: number) => {
      const dt = (time - lastFrame) / 1000;
      lastFrame = time;
      const elapsed = (time - t0) / 1000;

      const currentState = stateRef.current;
      const style = STATE_STYLES[currentState] || STATE_STYLES.IDLE;
      const currentAudio = audioLevelRef.current || 0;

      // Update canvas dimensions
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const minDim = size;

      // Breathing calculation
      const breathing = (Math.sin(elapsed * style.pulseSpeed) + 1) / 2;
      const energy = Math.min(1.0, (breathing * 0.6 + 0.4) * 0.85 + currentAudio * 0.65);
      const coreRadius = minDim * style.baseRadiusRatio * (0.9 + 0.12 * energy);

      // 1. Draw outer ambient glow
      const glowRadius = coreRadius * 2.3;
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
      const [r, g, b] = style.rgbPrimary;
      const alphaGlow = 0.35 * style.glowIntensity * (0.5 + 0.5 * energy);
      glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alphaGlow})`);
      glowGrad.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${alphaGlow * 0.4})`);
      glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw glowing core
      const coreGrad = ctx.createRadialGradient(cx - coreRadius * 0.2, cy - coreRadius * 0.2, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.2, style.colorPrimary);
      coreGrad.addColorStop(0.7, style.colorSecondary);
      coreGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.15)`);

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Step and draw rotating HUD rings
      const rings = ringsRef.current;
      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        ring.rotation += (ring.speed * style.ringSpeed * dt);
        const ringR = coreRadius * ring.radiusRatio;

        ctx.save();
        ctx.beginPath();
        if (ring.dash) {
          ctx.setLineDash([14, 8, 4, 8]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.3 + 0.4 * energy})`;
        ctx.lineWidth = ring.thickness;

        // Draw partial arc (approx 310 degrees with gap)
        const arcLength = (Math.PI * 2) * 0.85;
        ctx.arc(cx, cy, ringR, ring.rotation, ring.rotation + arcLength);
        ctx.stroke();

        // Draw small tech node dots along rings
        const nodeX = cx + ringR * Math.cos(ring.rotation);
        const nodeY = cy + ringR * Math.sin(ring.rotation);
        ctx.fillStyle = style.colorPrimary;
        ctx.beginPath();
        ctx.arc(nodeX, nodeY, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 4. Step and draw particle cloud
      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.angle += (p.angularVelocity * (1 + energy * 0.5)) * dt;
        const pr = coreRadius * p.radiusRatio;
        const px = cx + pr * Math.cos(p.angle);
        const py = cy + pr * Math.sin(p.angle);

        const twinkle = 0.4 + 0.6 * ((Math.sin(p.phase + elapsed * 2.5) + 1) / 2);
        const pAlpha = Math.min(1.0, 0.45 * twinkle + 0.3 * energy);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer group select-none transition-transform hover:scale-105 active:scale-95"
      title={`JARVIS Visualizer: ${state} (Click to toggle state)`}
    >
      <canvas
        ref={canvasRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="block"
      />
      {/* Floating State HUD Tag beneath Orb */}
      <div className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-[#0a121e]/80 border border-cyan-500/30 text-[11px] font-hud tracking-[0.25em] text-cyan-300 shadow-[0_0_12px_rgba(0,212,255,0.2)]">
        {state}
      </div>
    </div>
  );
};
