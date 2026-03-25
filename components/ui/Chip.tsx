'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type ChipVariant = 'violet' | 'blue' | 'cyan' | 'rose' | 'green' | 'gold';
type ChipSize = 'sm' | 'md';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
}

const variantStyles: Record<ChipVariant, string> = {
  violet: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  rose: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  gold: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};

const sizeStyles: Record<ChipSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
};

export default function Chip({ label, variant = 'violet', size = 'md', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        'font-[family-name:var(--font-exo2)]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {label}
    </span>
  );
}
