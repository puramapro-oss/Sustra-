'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helper?: string;
  textarea?: boolean;
  rows?: number;
}

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ label, error, helper, textarea, className, rows = 4, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const sharedClasses = cn(
      'w-full bg-white/5 backdrop-blur-sm border rounded-xl px-4 py-3 text-sm text-white',
      'placeholder:text-white/30 font-[family-name:var(--font-exo2)]',
      'transition-all duration-300 outline-none',
      'focus:bg-white/[0.08] focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]',
      error ? 'border-red-500/50' : 'border-white/10',
      className
    );

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">
            {label}
          </label>
        )}
        {textarea ? (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            rows={rows}
            className={cn(sharedClasses, 'resize-y')}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.Ref<HTMLInputElement>}
            id={inputId}
            className={sharedClasses}
            {...props}
          />
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {helper && !error && <p className="text-xs text-white/40">{helper}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
