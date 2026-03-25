'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Play, Eye, Calendar, Plus, Film } from 'lucide-react';
import Chip from '@/components/ui/Chip';
import GlowBtn from '@/components/ui/GlowBtn';
import { formatDate, formatNumber } from '@/lib/utils';

interface VideoItem {
  id: string;
  title: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  views?: number;
}

interface RecentVideosProps {
  videos: VideoItem[];
  onVideoClick?: (id: string) => void;
  onCreateClick?: () => void;
  className?: string;
}

const statusVariantMap: Record<string, 'violet' | 'blue' | 'cyan' | 'rose' | 'green' | 'gold'> = {
  draft: 'blue',
  scripting: 'violet',
  generating_voice: 'violet',
  generating_visuals: 'cyan',
  generating_music: 'rose',
  assembling: 'gold',
  rendering: 'gold',
  completed: 'green',
  published: 'green',
  failed: 'rose',
};

const statusLabelMap: Record<string, string> = {
  draft: 'Brouillon',
  scripting: 'Script',
  generating_voice: 'Voix',
  generating_visuals: 'Visuels',
  generating_music: 'Musique',
  assembling: 'Montage',
  rendering: 'Rendu',
  completed: 'Terminé',
  published: 'Publié',
  failed: 'Erreur',
};

export default function RecentVideos({
  videos,
  onVideoClick,
  onCreateClick,
  className,
}: RecentVideosProps) {
  if (videos.length === 0) {
    return (
      <div
        className={cn(
          'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8',
          'flex flex-col items-center justify-center text-center min-h-[300px]',
          className
        )}
      >
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
          <Film size={32} className="text-violet-400" />
        </div>
        <h3 className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)] mb-2">
          Aucune vidéo
        </h3>
        <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mb-6 max-w-xs">
          Créez votre première vidéo alimentée par l&apos;IA en quelques clics
        </p>
        <GlowBtn onClick={onCreateClick} icon={<Plus size={18} />}>
          Créer une vidéo
        </GlowBtn>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)]">
          Vidéos récentes
        </h2>
        <GlowBtn variant="secondary" size="sm" onClick={onCreateClick} icon={<Plus size={14} />}>
          Nouvelle
        </GlowBtn>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video, i) => (
          <motion.div
            key={video.id}
            className={cn(
              'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden',
              'transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-violet-500/10',
              'cursor-pointer group'
            )}
            onClick={() => onVideoClick?.(video.id)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-white/[0.02] overflow-hidden">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={32} className="text-white/10" />
                </div>
              )}
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Play size={20} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
              {/* Status badge */}
              <div className="absolute top-2 right-2">
                <Chip
                  label={statusLabelMap[video.status] || video.status}
                  variant={statusVariantMap[video.status] || 'blue'}
                  size="sm"
                />
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-2">
              <h3 className="text-sm font-semibold text-white truncate font-[family-name:var(--font-exo2)]">
                {video.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatDate(video.created_at)}
                </span>
                {video.views !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {formatNumber(video.views)}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
