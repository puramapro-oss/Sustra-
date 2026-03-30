'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type GlowColor = 'violet' | 'blue' | 'cyan' | 'rose';

interface GlassProps {
  children: React.ReactNode;
  className?: string;
  glow?: GlowColor;
  variant?: 'default' | 'hover' | 'active';
}

const glowMap: Record<GlowColor, string> = {
  violet: 'shadow-[0_0_20px_rgba(139,92,246,0.3)] border-violet-500/40',
  blue: 'shadow-[0_0_20px_rgba(59,130,246,0.3)] border-blue-500/40',
  cyan: 'shadow-[0_0_20px_rgba(6,182,212,0.3)] border-cyan-500/40',
  rose: 'shadow-[0_0_20px_rgba(236,72,153,0.3)] border-rose-500/40',
};

const variantMap: Record<string, string> = {
  default: '',
  hover: 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10',
  active: 'animate-pulse-border',
};

export default function Glass({
  children,
  className,
  glow,
  variant = 'default',
}: GlassProps) {
  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/[0.06] rounded-2xl',
        variant && variantMap[variant],
        glow && glowMap[glow],
        className
      )}
    >
      {children}
    </div>
  );
}
