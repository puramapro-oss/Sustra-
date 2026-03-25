'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Clapperboard,
  Zap,
  Clock,
  Lightbulb,
  Leaf,
  Briefcase,
  Smile,
  Minus,
} from 'lucide-react';

interface StyleOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  preview: string;
}

const styles: StyleOption[] = [
  {
    id: 'cinematic',
    name: 'Cinématique',
    description: 'Film hollywoodien, profondeur de champ',
    icon: <Clapperboard size={20} />,
    gradient: 'from-amber-900/40 to-orange-900/40',
    preview: 'bg-gradient-to-br from-amber-900/30 via-orange-950/30 to-yellow-900/20',
  },
  {
    id: 'modern',
    name: 'Moderne',
    description: 'Clean, épuré, contemporain',
    icon: <Zap size={20} />,
    gradient: 'from-blue-600/40 to-violet-600/40',
    preview: 'bg-gradient-to-br from-blue-600/20 via-indigo-600/20 to-violet-600/20',
  },
  {
    id: 'vintage',
    name: 'Vintage',
    description: 'Rétro, grain de film, tons chauds',
    icon: <Clock size={20} />,
    gradient: 'from-yellow-800/40 to-red-900/40',
    preview: 'bg-gradient-to-br from-yellow-900/30 via-orange-900/20 to-red-900/20',
  },
  {
    id: 'neon',
    name: 'Néon',
    description: 'Cyberpunk, lumières néon, futuriste',
    icon: <Lightbulb size={20} />,
    gradient: 'from-fuchsia-600/40 to-cyan-500/40',
    preview: 'bg-gradient-to-br from-fuchsia-600/20 via-purple-600/20 to-cyan-500/20',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'Organique, terreux, apaisant',
    icon: <Leaf size={20} />,
    gradient: 'from-emerald-700/40 to-teal-600/40',
    preview: 'bg-gradient-to-br from-emerald-700/20 via-green-800/20 to-teal-700/20',
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Professionnel, sobre, confiance',
    icon: <Briefcase size={20} />,
    gradient: 'from-slate-600/40 to-blue-800/40',
    preview: 'bg-gradient-to-br from-slate-700/20 via-blue-900/20 to-slate-800/20',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Illustré, coloré, ludique',
    icon: <Smile size={20} />,
    gradient: 'from-pink-500/40 to-yellow-500/40',
    preview: 'bg-gradient-to-br from-pink-500/20 via-orange-400/20 to-yellow-400/20',
  },
  {
    id: 'minimalist',
    name: 'Minimaliste',
    description: 'Espace vide, typographie forte',
    icon: <Minus size={20} />,
    gradient: 'from-white/20 to-gray-500/20',
    preview: 'bg-gradient-to-br from-white/10 via-gray-500/10 to-white/5',
  },
];

interface VisualStyleSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export default function VisualStyleSelector({ selected, onSelect, className }: VisualStyleSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
      {styles.map((style, i) => {
        const isSelected = selected === style.id;
        return (
          <motion.button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={cn(
              'relative flex flex-col rounded-2xl border overflow-hidden',
              'transition-all duration-300 text-left group',
              isSelected
                ? 'border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                : 'border-white/10 hover:border-white/20'
            )}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Preview */}
            <div
              className={cn(
                'h-24 w-full flex items-center justify-center',
                style.preview,
                'transition-all duration-300 group-hover:brightness-125'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm',
                  `bg-gradient-to-br ${style.gradient}`,
                  'border border-white/10'
                )}
              >
                <span className={isSelected ? 'text-white' : 'text-white/60'}>
                  {style.icon}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-white/[0.02]">
              <p
                className={cn(
                  'text-xs font-semibold font-[family-name:var(--font-orbitron)] mb-0.5',
                  isSelected ? 'text-white' : 'text-white/70'
                )}
              >
                {style.name}
              </p>
              <p className="text-[10px] text-white/40 font-[family-name:var(--font-exo2)] leading-relaxed">
                {style.description}
              </p>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <motion.div
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
