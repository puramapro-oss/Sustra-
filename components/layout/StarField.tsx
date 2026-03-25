'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  speed: number;
  layer: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  drift: number;
}

const STAR_COUNT = 300;
const NEBULA_COUNT = 4;

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const starsRef = useRef<Star[]>([]);
  const shootingStarsRef = useRef<ShootingStar[]>([]);
  const nebulaeRef = useRef<Nebula[]>([]);
  const timeRef = useRef(0);

  const initStars = useCallback((width: number, height: number) => {
    starsRef.current = Array.from({ length: STAR_COUNT }, () => {
      const layer = Math.random() < 0.3 ? 0 : Math.random() < 0.6 ? 1 : 2;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 3,
        size: Math.random() * 2 + 0.5 - layer * 0.3,
        opacity: Math.random() * 0.8 + 0.2,
        speed: (0.05 + Math.random() * 0.15) * (layer + 1),
        layer,
      };
    });

    const nebulaColors = [
      'rgba(139, 92, 246,',  // violet
      'rgba(59, 130, 246,',  // blue
      'rgba(6, 182, 212,',   // cyan
      'rgba(236, 72, 153,',  // rose
    ];

    nebulaeRef.current = Array.from({ length: NEBULA_COUNT }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 150 + Math.random() * 200,
      color: nebulaColors[i % nebulaColors.length],
      opacity: 0.03 + Math.random() * 0.04,
      drift: (Math.random() - 0.5) * 0.1,
    }));
  }, []);

  const spawnShootingStar = useCallback((width: number, height: number) => {
    const angle = Math.PI / 6 + Math.random() * Math.PI / 6;
    const speed = 8 + Math.random() * 6;
    shootingStarsRef.current.push({
      x: Math.random() * width * 0.8,
      y: Math.random() * height * 0.4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 1,
      size: 1.5 + Math.random() * 1.5,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      if (starsRef.current.length === 0) {
        initStars(width, height);
      }
    };

    resize();
    initStars(width, height);

    const draw = () => {
      timeRef.current += 0.016;

      // Clear with bg color
      ctx.fillStyle = '#06050e';
      ctx.fillRect(0, 0, width, height);

      // Draw nebulae
      for (const nebula of nebulaeRef.current) {
        nebula.x += nebula.drift;
        if (nebula.x > width + nebula.radius) nebula.x = -nebula.radius;
        if (nebula.x < -nebula.radius) nebula.x = width + nebula.radius;

        const gradient = ctx.createRadialGradient(
          nebula.x, nebula.y, 0,
          nebula.x, nebula.y, nebula.radius
        );
        gradient.addColorStop(0, `${nebula.color}${nebula.opacity})`);
        gradient.addColorStop(1, `${nebula.color}0)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(
          nebula.x - nebula.radius,
          nebula.y - nebula.radius,
          nebula.radius * 2,
          nebula.radius * 2
        );
      }

      // Draw stars
      for (const star of starsRef.current) {
        star.y += star.speed;
        if (star.y > height + 5) {
          star.y = -5;
          star.x = Math.random() * width;
        }

        const twinkle = Math.sin(timeRef.current * (2 + star.z) + star.x) * 0.3 + 0.7;
        const alpha = star.opacity * twinkle;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        // Glow for brighter stars
        if (star.size > 1.5) {
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(200, 200, 255, ${alpha * 0.1})`;
          ctx.fill();
        }
      }

      // Shooting stars
      if (Math.random() < 0.003) {
        spawnShootingStar(width, height);
      }

      shootingStarsRef.current = shootingStarsRef.current.filter((s) => {
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 0.02;

        if (s.life <= 0) return false;

        const alpha = s.life;

        // Trail
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = s.size;
        ctx.stroke();

        // Head
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();

        return true;
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initStars, spawnShootingStar]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
