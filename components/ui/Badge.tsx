'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  plan: string;
  size?: 'sm' | 'md';
  className?: string;
}

const planStyles: Record<string, string> = {
  starter: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  creator: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  empire: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
};

export default function Badge({ plan, size = 'md', className }: BadgeProps) {
  const key = plan.toLowerCase();
  const styles = planStyles[key] || planStyles.starter;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold uppercase tracking-wider',
        'font-[family-name:var(--font-orbitron)]',
        styles,
        sizeStyles[size],
        className
      )}
    >
      {plan}
    </span>
  );
}
