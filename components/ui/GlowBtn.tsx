'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'success';
type BtnSize = 'sm' | 'md' | 'lg';

interface GlowBtnProps {
  children: React.ReactNode;
  className?: string;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<BtnVariant, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:shadow-[0_0_25px_rgba(139,92,246,0.5)] active:from-violet-700 active:to-blue-700',
  secondary:
    'bg-transparent border border-white/20 text-white hover:bg-white/10 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]',
  danger:
    'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-[0_0_25px_rgba(239,68,68,0.5)] active:from-red-700 active:to-rose-700',
  success:
    'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] active:from-emerald-700 active:to-green-700',
};

const sizeStyles: Record<BtnSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
};

export default function GlowBtn({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
}: GlowBtnProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-300 cursor-pointer select-none',
        'font-[family-name:var(--font-exo2)]',
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
