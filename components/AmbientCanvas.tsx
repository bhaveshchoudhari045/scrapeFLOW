"use client";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

export function AmbientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0,
      H = 0,
      raf: number;
    const isDark = resolvedTheme !== "light";

    function resize() {
      W = canvas!.width = window.innerWidth;
      H = canvas!.height = window.innerHeight;
    }

    // ── Orb ─────────────────────────────────────────────────────
    class Orb {
      x: number;
      y: number;
      ox: number;
      oy: number;
      r: number;
      t: number;
      speed: number;
      ampX: number;
      ampY: number;
      color: string;
      opacity: number;

      constructor(
        x: number,
        y: number,
        r: number,
        color: string,
        opacity: number,
      ) {
        this.ox = this.x = x * W;
        this.oy = this.y = y * H;
        this.r = r;
        this.color = color;
        this.opacity = opacity;
        this.t = Math.random() * Math.PI * 2;
        this.speed = 0.0015 + Math.random() * 0.002;
        this.ampX = 60 + Math.random() * 80;
        this.ampY = 40 + Math.random() * 60;
      }

      update() {
        this.t += this.speed;
        this.x = this.ox + Math.sin(this.t) * this.ampX;
        this.y = this.oy + Math.cos(this.t * 0.71) * this.ampY;
      }

      draw() {
        const g = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.r,
        );
        g.addColorStop(0, this.color.replace("%%", String(this.opacity)));
        g.addColorStop(
          0.4,
          this.color.replace("%%", String(this.opacity * 0.5)),
        );
        g.addColorStop(1, this.color.replace("%%", "0"));
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.fill();
      }
    }

    // ── Particle ─────────────────────────────────────────────────
    class Particle {
      x!: number;
      y!: number;
      vx!: number;
      vy!: number;
      r!: number;
      life!: number;
      maxLife!: number;
      color!: string;
      twinkle!: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.vx = (Math.random() - 0.5) * 0.22;
        this.vy = (Math.random() - 0.5) * 0.22;
        this.r = Math.random() * 1.2 + 0.2;
        this.life = 0;
        this.maxLife = 250 + Math.random() * 400;
        this.twinkle = Math.random() * Math.PI * 2;
        const colors = isDark
          ? [
              "rgba(0,245,255,%%)",
              "rgba(155,109,255,%%)",
              "rgba(240,192,96,%%)",
              "rgba(0,245,255,%%)",
            ]
          : [
              "rgba(14,165,233,%%)",
              "rgba(124,58,237,%%)",
              "rgba(16,185,129,%%)",
              "rgba(217,119,6,%%)",
            ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life++;
        this.twinkle += 0.04;
        if (
          this.x < -10 ||
          this.x > W + 10 ||
          this.y < -10 ||
          this.y > H + 10 ||
          this.life > this.maxLife
        ) {
          this.reset();
        }
      }

      draw() {
        const progress = this.life / this.maxLife;
        const fadeIn = Math.min(progress * 5, 1);
        const fadeOut = Math.min((1 - progress) * 5, 1);
        const twinkle = Math.sin(this.twinkle) * 0.3 + 0.7;
        const alpha = fadeIn * fadeOut * twinkle * (isDark ? 0.45 : 0.35);

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace("%%", String(alpha));
        ctx.globalAlpha = 1;
        ctx.fill();
      }
    }

    // ── Grid lines ───────────────────────────────────────────────
    function drawGrid() {
      ctx.globalAlpha = isDark ? 0.028 : 0.04;
      ctx.strokeStyle = isDark ? "#00f5ff" : "#6366f1";
      ctx.lineWidth = 0.5;
      const spacing = 88;
      for (let x = 0; x < W; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // ── Constellation lines ───────────────────────────────────────
    function drawConstellations(pts: Particle[]) {
      const maxDist = 140;
      ctx.lineWidth = 0.4;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isDark ? 0.08 : 0.06);
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = isDark ? "#9b6dff" : "#6366f1";
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    let orbs: Orb[] = [];
    let particles: Particle[] = [];

    function init() {
      if (isDark) {
        orbs = [
          new Orb(0.12, 0.22, 500, "rgba(0,245,255,%%)", 0.07),
          new Orb(0.82, 0.68, 440, "rgba(155,109,255,%%)", 0.06),
          new Orb(0.48, 0.88, 380, "rgba(240,192,96,%%)", 0.05),
          new Orb(0.72, 0.12, 340, "rgba(0,200,212,%%)", 0.045),
          new Orb(0.25, 0.72, 300, "rgba(155,109,255,%%)", 0.04),
        ];
      } else {
        orbs = [
          new Orb(0.12, 0.22, 500, "rgba(14,165,233,%%)", 0.12),
          new Orb(0.82, 0.68, 440, "rgba(124,58,237,%%)", 0.1),
          new Orb(0.48, 0.88, 380, "rgba(217,119,6,%%)", 0.08),
          new Orb(0.72, 0.12, 340, "rgba(16,185,129,%%)", 0.09),
          new Orb(0.25, 0.72, 300, "rgba(124,58,237,%%)", 0.07),
        ];
      }
      particles = Array.from({ length: 70 }, () => new Particle());
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      orbs.forEach((o) => {
        o.update();
        o.draw();
      });
      drawConstellations(particles.slice(0, 30));
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      raf = requestAnimationFrame(loop);
    }

    resize();
    init();
    loop();

    const ro = new ResizeObserver(() => {
      resize();
      init();
    });
    ro.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [resolvedTheme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    />
  );
}
