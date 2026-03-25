'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Pause, Mic, User } from 'lucide-react';

interface VoiceOption {
  id: string;
  name: string;
  description: string;
  sampleUrl?: string;
  isCloned?: boolean;
}

const defaultVoices: VoiceOption[] = [
  { id: 'narrator_pro', name: 'Narrateur Pro', description: 'Voix professionnelle et posée' },
  { id: 'energetic', name: 'Énergique', description: 'Dynamique et captivant' },
  { id: 'calm', name: 'Calme', description: 'Apaisante et méditative' },
  { id: 'mysterious', name: 'Mystérieux', description: 'Intrigue et suspense' },
  { id: 'humorous', name: 'Humoristique', description: 'Léger et amusant' },
  { id: 'feminine', name: 'Féminin', description: 'Voix féminine douce et claire' },
];

interface VoiceSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
  clonedVoices?: VoiceOption[];
  className?: string;
}

export default function VoiceSelector({
  selected,
  onSelect,
  clonedVoices = [],
  className,
}: VoiceSelectorProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const allVoices: VoiceOption[] = [
    ...defaultVoices,
    ...clonedVoices.map((v) => ({ ...v, isCloned: true })),
  ];

  const togglePlay = (voice: VoiceOption) => {
    if (!voice.sampleUrl) return;

    if (playingId === voice.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(voice.sampleUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingId(voice.id);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {allVoices.map((voice, i) => {
        const isSelected = selected === voice.id;
        const isPlaying = playingId === voice.id;

        return (
          <motion.button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-xl border text-left',
              'transition-all duration-200 group',
              isSelected
                ? 'bg-violet-500/10 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'bg-white/[0.03] border-white/10 hover:bg-white/5 hover:border-white/20'
            )}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
          >
            {/* Icon */}
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                isSelected
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-white/5 text-white/30'
              )}
            >
              {voice.isCloned ? <User size={18} /> : <Mic size={18} />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    'text-sm font-semibold font-[family-name:var(--font-exo2)]',
                    isSelected ? 'text-white' : 'text-white/70'
                  )}
                >
                  {voice.name}
                </p>
                {voice.isCloned && (
                  <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                    CLONÉE
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 font-[family-name:var(--font-exo2)]">
                {voice.description}
              </p>
            </div>

            {/* Preview button */}
            {voice.sampleUrl && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(voice);
                }}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                  'transition-all duration-200',
                  isPlaying
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                )}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
              </button>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <motion.div
                className="w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center shrink-0"
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
