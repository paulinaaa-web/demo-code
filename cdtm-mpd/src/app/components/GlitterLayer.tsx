"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface Sparkle {
  x: number;
  y: number;
  size: number;
  alpha: number;
  decay: number;
  vx: number;
  vy: number;
}

const COLORS = ["#ff69b4", "#ffb6c1", "#ff1493", "#fff0f5", "#ffffff", "#ffd1dc"];

function randomSparkle(width: number, height: number): Sparkle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 3 + 1,
    alpha: Math.random() * 0.8 + 0.2,
    decay: Math.random() * 0.012 + 0.006,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
  };
}

export default function GlitterLayer() {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparklesRef = useRef<Sparkle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = map.getContainer();
    const canvas = document.createElement("canvas");
    canvas.className = "glitter-canvas";
    container.appendChild(canvas);
    canvasRef.current = canvas;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();

    const SPARKLE_COUNT = 220;
    sparklesRef.current = Array.from({ length: SPARKLE_COUNT }, () =>
      randomSparkle(canvas.width, canvas.height)
    );

    const draw = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparklesRef.current.forEach((s, i) => {
        ctx.save();
        ctx.globalAlpha = s.alpha;
        ctx.fillStyle = COLORS[i % COLORS.length];
        ctx.shadowColor = COLORS[i % COLORS.length];
        ctx.shadowBlur = s.size * 4;

        // Draw a 4-pointed star
        const r = s.size;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const angle = (j * Math.PI) / 4;
          const len = j % 2 === 0 ? r : r * 0.35;
          const px = s.x + Math.cos(angle) * len;
          const py = s.y + Math.sin(angle) * len;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        s.x += s.vx;
        s.y += s.vy;
        s.alpha -= s.decay;

        if (s.alpha <= 0) {
          sparklesRef.current[i] = randomSparkle(canvas.width, canvas.height);
        }
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      canvas.remove();
    };
  }, [map]);

  return null;
}
