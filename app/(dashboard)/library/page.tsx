'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, Grid, List, Play, Edit3,
  Share2, Clock, Eye, PlaySquare, Smartphone, Zap, Film,
  Plus, MoreVertical, BookOpen, Image as ImageIcon
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

interface Video {
  id: string;
  title: string;
  format: string;
  status: string;
  video_url: string | null;
  thumbnail_urls: string[];
  duration_seconds: number;
  created_at: string;
  analytics: { views?: number } | null;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  youtube: <PlaySquare size={12} />,
  short: <Smartphone size={12} />,
  tiktok: <Zap size={12} />,
  docu: <BookOpen size={12} />,
  faceless: <Film size={12} />,
  story: <ImageIcon size={12} />,
};

const FORMAT_COLORS: Record<string, string> = {
  youtube: 'bg-red-500/20 text-red-400',
  short: 'bg-sutra-violet/20 text-sutra-violet',
  tiktok: 'bg-sutra-cyan/20 text-sutra-cyan',
  docu: 'bg-sutra-blue/20 text-sutra-blue',
  faceless: 'bg-sutra-gold/20 text-sutra-gold',
  story: 'bg-sutra-rose/20 text-sutra-rose',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-white/10 text-white/50',
  generating: 'bg-sutra-gold/20 text-sutra-gold',
  editing: 'bg-sutra-blue/20 text-sutra-blue',
  ready: 'bg-sutra-green/20 text-sutra-green',
  published: 'bg-sutra-violet/20 text-sutra-violet',
  error: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon',
  generating: 'En cours',
  editing: 'Édition',
  ready: 'Prêt',
  published: 'Publié',
  error: 'Erreur',
};

export default function LibraryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
        );
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, format, status, video_url, thumbnail_urls, duration_seconds, created_at, analytics')
          .order('created_at', { ascending: false });

        if (!error && data) setVideos(data);
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos
    .filter((v) => {
      if (searchQuery && !v.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterFormat !== 'all' && v.format !== filterFormat) return false;
      if (filterStatus !== 'all' && v.status !== filterStatus) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'views') return ((b.analytics?.views || 0) - (a.analytics?.views || 0));
      return 0;
    });

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-3xl font-orbitron font-bold gradient-text">Ma Bibliothèque</h1>
        <Link href="/create" className="btn-glow text-sm flex items-center gap-2">
          <Plus size={16} /> Créer une vidéo
        </Link>
      </motion.div>

      {/* Filters */}
      <div className="glass p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white outline-none focus:border-sutra-violet/50"
          />
        </div>
        <select
          value={filterFormat}
          onChange={(e) => setFilterFormat(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all" className="bg-[#1a1a2e]">Tous les formats</option>
          <option value="youtube" className="bg-[#1a1a2e]">YouTube</option>
          <option value="short" className="bg-[#1a1a2e]">Shorts</option>
          <option value="tiktok" className="bg-[#1a1a2e]">TikTok</option>
          <option value="story" className="bg-[#1a1a2e]">Stories</option>
          <option value="docu" className="bg-[#1a1a2e]">Mini-Doc</option>
          <option value="faceless" className="bg-[#1a1a2e]">Faceless</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
        >
          <option value="all" className="bg-[#1a1a2e]">Tous les statuts</option>
          <option value="draft" className="bg-[#1a1a2e]">Brouillon</option>
          <option value="ready" className="bg-[#1a1a2e]">Prêt</option>
          <option value="published" className="bg-[#1a1a2e]">Publié</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
        >
          <option value="recent" className="bg-[#1a1a2e]">Plus récent</option>
          <option value="oldest" className="bg-[#1a1a2e]">Plus ancien</option>
          <option value="views" className="bg-[#1a1a2e]">Plus de vues</option>
        </select>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-sutra-violet/20 text-sutra-violet' : 'text-white/40 hover:text-white'}`}
          >
            <Grid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-sutra-violet/20 text-sutra-violet' : 'text-white/40 hover:text-white'}`}
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass p-4 animate-pulse">
              <div className="aspect-video bg-white/5 rounded-lg mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredVideos.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass p-12 text-center"
        >
          <Film className="mx-auto mb-4 text-white/20" size={64} />
          <h3 className="text-xl font-semibold mb-2">Aucune vidéo</h3>
          <p className="text-white/50 mb-6">Crée ta première vidéo avec l&apos;IA !</p>
          <Link href="/create" className="btn-glow inline-flex items-center gap-2">
            <Plus size={18} /> Créer ma première vidéo
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}
        >
          {filteredVideos.map((video, idx) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-hover p-4 group"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-white/5 rounded-lg mb-3 relative overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <Film size={32} />
                </div>
                {/* Duration Badge */}
                {video.duration_seconds > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                    {formatDuration(video.duration_seconds)}
                  </div>
                )}
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-sutra-violet/80 flex items-center justify-center">
                    <Play size={20} className="text-white ml-0.5" />
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm truncate">{video.title || 'Sans titre'}</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${FORMAT_COLORS[video.format] || 'bg-white/10 text-white/50'}`}>
                    {FORMAT_ICONS[video.format]} {video.format}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_COLORS[video.status] || 'bg-white/10 text-white/50'}`}>
                    {STATUS_LABELS[video.status] || video.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-white/30">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {formatDate(video.created_at)}
                  </span>
                  {video.analytics?.views !== undefined && (
                    <span className="flex items-center gap-1">
                      <Eye size={10} /> {video.analytics.views}
                    </span>
                  )}
                </div>
                {/* Actions */}
                <div className="flex gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link
                    href={`/editor/${video.id}`}
                    className="flex-1 text-center text-[10px] py-1.5 rounded bg-sutra-violet/20 text-sutra-violet hover:bg-sutra-violet/30 transition-colors"
                  >
                    <Edit3 size={10} className="inline mr-1" /> Éditer
                  </Link>
                  <button className="flex-1 text-center text-[10px] py-1.5 rounded bg-sutra-blue/20 text-sutra-blue hover:bg-sutra-blue/30 transition-colors">
                    <Share2 size={10} className="inline mr-1" /> Publier
                  </button>
                  <button className="px-2 py-1.5 rounded bg-white/5 text-white/40 hover:bg-white/10 transition-colors">
                    <MoreVertical size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
