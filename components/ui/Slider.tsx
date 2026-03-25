'use client';

import React from 'react';
import * as RadixSlider from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface SliderProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  label?: string;
  step?: number;
  className?: string;
}

export default function Slider({ min, max, value, onChange, label, step = 1, className }: SliderProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">{label}</span>
          <span className="text-sm text-white/50 font-[family-name:var(--font-exo2)]">{value}</span>
        </div>
      )}
      <RadixSlider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      >
        <RadixSlider.Track className="bg-white/10 relative grow rounded-full h-1.5">
          <RadixSlider.Range className="absolute bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full h-full" />
        </RadixSlider.Track>
        <RadixSlider.Thumb
          className={cn(
            'block w-5 h-5 bg-white rounded-full',
            'shadow-[0_0_10px_rgba(139,92,246,0.5)]',
            'hover:shadow-[0_0_15px_rgba(139,92,246,0.7)]',
            'focus:outline-none focus:shadow-[0_0_20px_rgba(139,92,246,0.8)]',
            'transition-shadow duration-200 cursor-pointer'
          )}
        />
      </RadixSlider.Root>
    </div>
  );
}
