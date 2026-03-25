'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'h-1.5',
  md: 'h-3',
  lg: 'h-5',
};

export default function ProgressBar({
  value,
  label,
  showPercentage = false,
  size = 'md',
  className,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">{label}</span>
          )}
          {showPercentage && (
            <span className="text-sm text-white/50 font-[family-name:var(--font-exo2)]">
              {Math.round(clampedValue)}%
            </span>
          )}
        </div>
      )}
      <div
        className={cn(
          'w-full bg-white/5 rounded-full overflow-hidden border border-white/5',
          sizeStyles[size]
        )}
      >
        <motion.div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500',
            'shadow-[0_0_10px_rgba(139,92,246,0.4)]'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}
