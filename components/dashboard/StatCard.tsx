'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  change?: number;
  color?: 'violet' | 'blue' | 'cyan' | 'rose' | 'green' | 'gold';
  prefix?: string;
  suffix?: string;
  className?: string;
}

const colorMap = {
  violet: {
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    shadow: 'shadow-violet-500/20',
  },
  blue: {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    shadow: 'shadow-blue-500/20',
  },
  cyan: {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    shadow: 'shadow-cyan-500/20',
  },
  rose: {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    shadow: 'shadow-rose-500/20',
  },
  green: {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    shadow: 'shadow-emerald-500/20',
  },
  gold: {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    shadow: 'shadow-amber-500/20',
  },
};

function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let frame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

export default function StatCard({
  icon,
  label,
  value,
  change,
  color = 'violet',
  prefix = '',
  suffix = '',
  className,
}: StatCardProps) {
  const animatedValue = useAnimatedCounter(value);
  const colors = colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5',
        'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        `hover:${colors.shadow}`,
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            colors.bg,
            colors.text
          )}
        >
          {icon}
        </div>
        {change !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              isPositive ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{isPositive ? '+' : ''}{change}%</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-white font-[family-name:var(--font-orbitron)]">
          {prefix}{animatedValue.toLocaleString()}{suffix}
        </p>
        <p className="text-sm text-white/50 font-[family-name:var(--font-exo2)]">{label}</p>
      </div>
    </motion.div>
  );
}
