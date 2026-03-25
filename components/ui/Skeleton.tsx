'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
}

const baseClasses = 'animate-pulse bg-gradient-to-r from-white/5 via-violet-500/10 to-white/5 bg-[length:200%_100%] animate-[shimmer_2s_infinite]';

export default function Skeleton({ variant = 'rect', width, height, className }: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };

  switch (variant) {
    case 'text':
      return (
        <div
          className={cn(baseClasses, 'h-4 rounded-md', className)}
          style={{ width: width ?? '100%', ...style }}
        />
      );
    case 'circle':
      return (
        <div
          className={cn(baseClasses, 'rounded-full', className)}
          style={{ width: width ?? 40, height: height ?? width ?? 40 }}
        />
      );
    case 'card':
      return (
        <div
          className={cn(
            baseClasses,
            'rounded-2xl border border-white/5',
            className
          )}
          style={{ width: width ?? '100%', height: height ?? 200 }}
        />
      );
    case 'rect':
    default:
      return (
        <div
          className={cn(baseClasses, 'rounded-xl', className)}
          style={style}
        />
      );
  }
}
