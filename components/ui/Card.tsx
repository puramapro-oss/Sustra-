'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  header?: React.ReactNode;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export default function Card({
  children,
  className,
  hoverable = false,
  onClick,
  header,
  title,
  description,
  footer,
}: CardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden',
        'transition-all duration-300',
        hoverable && 'hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10 hover:border-white/20',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {header && <div className="w-full">{header}</div>}
      <div className="p-5">
        {title && (
          <h3 className="text-base font-bold text-white font-[family-name:var(--font-orbitron)] mb-1">
            {title}
          </h3>
        )}
        {description && (
          <p className="text-sm text-white/50 font-[family-name:var(--font-exo2)] mb-3">{description}</p>
        )}
        {children}
      </div>
      {footer && (
        <div className="px-5 py-3 border-t border-white/5">{footer}</div>
      )}
    </div>
  );
}
