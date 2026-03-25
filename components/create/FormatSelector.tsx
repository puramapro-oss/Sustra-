'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  MonitorPlay,
  Smartphone,
  Music,
  Newspaper,
  Film,
  Mic,
  UserX,
  ImageIcon,
} from 'lucide-react';

interface FormatOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  aspect: string;
  aspectPreview: { w: number; h: number };
}

const formats: FormatOption[] = [
  {
    id: 'youtube_long',
    name: 'YouTube Long',
    description: 'Vidéo longue format classique',
    icon: <MonitorPlay size={24} />,
    aspect: '16:9',
    aspectPreview: { w: 48, h: 27 },
  },
  {
    id: 'short_reel',
    name: 'Short / Reel',
    description: 'Format court vertical',
    icon: <Smartphone size={24} />,
    aspect: '9:16',
    aspectPreview: { w: 27, h: 48 },
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Optimisé pour TikTok',
    icon: <Music size={24} />,
    aspect: '9:16',
    aspectPreview: { w: 27, h: 48 },
  },
  {
    id: 'story',
    name: 'Story',
    description: 'Stories Instagram / Facebook',
    icon: <ImageIcon size={24} />,
    aspect: '9:16',
    aspectPreview: { w: 27, h: 48 },
  },
  {
    id: 'pub',
    name: 'Pub',
    description: 'Publicité vidéo carrée',
    icon: <Newspaper size={24} />,
    aspect: '1:1',
    aspectPreview: { w: 40, h: 40 },
  },
  {
    id: 'mini_doc',
    name: 'Mini-Doc',
    description: 'Mini documentaire immersif',
    icon: <Film size={24} />,
    aspect: '16:9',
    aspectPreview: { w: 48, h: 27 },
  },
  {
    id: 'podcast_video',
    name: 'Podcast → Vidéo',
    description: 'Transformez votre podcast',
    icon: <Mic size={24} />,
    aspect: '16:9',
    aspectPreview: { w: 48, h: 27 },
  },
  {
    id: 'faceless',
    name: 'Faceless',
    description: 'Vidéo sans visage, voix off',
    icon: <UserX size={24} />,
    aspect: '9:16',
    aspectPreview: { w: 27, h: 48 },
  },
];

interface FormatSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export default function FormatSelector({ selected, onSelect, className }: FormatSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3', className)}>
      {formats.map((format, i) => {
        const isSelected = selected === format.id;
        return (
          <motion.button
            key={format.id}
            onClick={() => onSelect(format.id)}
            className={cn(
              'relative flex flex-col items-center gap-3 p-5 rounded-2xl border text-center',
              'transition-all duration-300 group',
              isSelected
                ? 'bg-violet-500/10 border-violet-500/40 shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                : 'bg-white/[0.03] border-white/10 hover:bg-white/5 hover:border-white/20'
            )}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Icon */}
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200',
                isSelected
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-white/5 text-white/40 group-hover:text-white/60'
              )}
            >
              {format.icon}
            </div>

            {/* Name & description */}
            <div>
              <p
                className={cn(
                  'text-sm font-semibold font-[family-name:var(--font-orbitron)] mb-1',
                  isSelected ? 'text-white' : 'text-white/70'
                )}
              >
                {format.name}
              </p>
              <p className="text-xs text-white/40 font-[family-name:var(--font-exo2)]">
                {format.description}
              </p>
            </div>

            {/* Aspect ratio preview */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'border rounded-sm transition-colors',
                  isSelected ? 'border-violet-400/50' : 'border-white/20'
                )}
                style={{
                  width: format.aspectPreview.w * 0.5,
                  height: format.aspectPreview.h * 0.5,
                }}
              />
              <span className="text-[10px] text-white/30 font-mono">{format.aspect}</span>
            </div>

            {/* Selected checkmark */}
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
