'use client';

import { useEffect, useRef, useState } from 'react';

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const posRef = useRef({ x: -200, y: -200 });

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isMobile) return;

    let raf: number;
    const el = glowRef.current;

    const onMove = (e: MouseEvent) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };

    const animate = () => {
      if (el) {
        el.style.transform = `translate(${posRef.current.x - 100}px, ${posRef.current.y - 100}px)`;
      }
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [isMobile]);

  if (isMobile) return null;

  return (
    <div
      ref={glowRef}
      className="fixed top-0 left-0 w-[200px] h-[200px] rounded-full pointer-events-none z-[50]"
      style={{
        background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
        willChange: 'transform',
      }}
      aria-hidden="true"
    />
  );
}
