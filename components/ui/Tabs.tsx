'use client';

import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export default function Tabs({ tabs, defaultValue, className }: TabsProps) {
  return (
    <RadixTabs.Root defaultValue={defaultValue || tabs[0]?.value} className={cn('w-full', className)}>
      <RadixTabs.List className="flex gap-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-1">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              'flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 outline-none',
              'font-[family-name:var(--font-exo2)] text-white/50',
              'hover:text-white/70',
              'data-[state=active]:bg-violet-500/20 data-[state=active]:text-white',
              'data-[state=active]:shadow-[0_0_10px_rgba(139,92,246,0.2)]',
              'data-[state=active]:border data-[state=active]:border-violet-500/30'
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {tabs.map((tab) => (
        <RadixTabs.Content
          key={tab.value}
          value={tab.value}
          className="mt-4 outline-none focus:outline-none"
        >
          {tab.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
