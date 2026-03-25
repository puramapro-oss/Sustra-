'use client';

import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  error?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function Select({
  label,
  options,
  error,
  value,
  onValueChange,
  placeholder = 'Select...',
  className,
  disabled,
}: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">{label}</label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          className={cn(
            'flex items-center justify-between w-full bg-white/5 backdrop-blur-sm border rounded-xl px-4 py-3 text-sm text-white',
            'font-[family-name:var(--font-exo2)] transition-all duration-300 outline-none',
            'focus:bg-white/[0.08] focus:border-violet-500/50 focus:shadow-[0_0_15px_rgba(139,92,246,0.2)]',
            'data-[placeholder]:text-white/30',
            error ? 'border-red-500/50' : 'border-white/10',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={16} className="text-white/50" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            className="overflow-hidden bg-[#0d0c1d]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-50"
            position="popper"
            sideOffset={4}
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={option.value}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 text-sm text-white/80 rounded-lg cursor-pointer outline-none',
                    'font-[family-name:var(--font-exo2)]',
                    'data-[highlighted]:bg-violet-500/20 data-[highlighted]:text-white',
                    'transition-colors duration-150'
                  )}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="ml-auto">
                    <Check size={14} className="text-violet-400" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
