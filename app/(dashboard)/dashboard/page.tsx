'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import Skeleton from '@/components/ui/Skeleton';
import StatCard from '@/components/dashboard/StatCard';
import RecentVideos from '@/components/dashboard/RecentVideos';
import AISuggestions from '@/components/dashboard/AISuggestions';
import { supabase } from '@/lib/supabase';
import type { Profile, Video } from '@/lib/types';
import {
  Film,
  Eye,
  DollarSign,
  Zap,
  Plus,
  Scissors,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface DashboardStats {
  videosCreated: number;
  totalViews: number;
  estimatedRevenue: number;
  creditsRemaining: number;
  videosChange: number;
  viewsChange: number;
  revenueChange: number;
}

interface ActivityItem {
  id: string;
  type: 'video_created' | 'video_published' | 'video_completed' | 'plan_upgraded';
  message: string;
  timestamp: string;
}

const DEFAULT_SUGGESTIONS = [
  {
    id: '1',
    topic: 'Les 5 technologies IA qui vont changer 2026',
    description: 'Tendance tech avec fort potentiel viral',
  },
  {
    id: '2',
    topic: 'Comment gagner de l\'argent avec l\'IA en dormant',
    description: 'Finance personnelle + IA, sujet populaire',
  },
  {
    id: '3',
    topic: 'Les secrets que Google ne veut pas que vous sachiez',
    description: 'Hook mystère, fort taux de clic',
  },
  {
    id: '4',
    topic: 'J\'ai testé ChatGPT pendant 30 jours, voici le résultat',
    description: 'Format challenge, engagement élevé',
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileData) {
        setProfile(profileData as Profile);
      }

      // Fetch recent videos
      const { data: videosData } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(6);

      if (videosData) {
        setVideos(videosData as Video[]);
      }

      // Fetch video count for stats
      const { count: videoCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Calculate stats
      const totalVideos = videoCount || 0;
      const totalViews = videosData
        ? videosData.reduce(
            (acc: number, v: Record<string, unknown>) =>
              acc + ((v.views as number) || 0),
            0
          )
        : 0;

      const prof = profileData as Profile | null;
      const plan = prof?.plan || 'free';
      const creditsPhotos = prof?.credits_used_photos || 0;
      const creditsShorts = prof?.credits_used_shorts || 0;

      let maxCredits = 1;
      if (plan === 'starter') maxCredits = 3;
      else if (plan === 'creator') maxCredits = 20;
      else if (plan === 'empire') maxCredits = 999;

      const remaining = Math.max(0, maxCredits - creditsShorts);

      setStats({
        videosCreated: totalVideos,
        totalViews,
        estimatedRevenue: Math.round(totalViews * 0.003 * 100) / 100,
        creditsRemaining: remaining,
        videosChange: 12,
        viewsChange: 24,
        revenueChange: 18,
      });

      // Build activity feed from recent videos
      const activityItems: ActivityItem[] = (videosData || [])
        .slice(0, 5)
        .map((v: Record<string, unknown>) => ({
          id: v.id as string,
          type:
            v.status === 'published'
              ? ('video_published' as const)
              : v.status === 'completed'
              ? ('video_completed' as const)
              : ('video_created' as const),
          message:
            v.status === 'published'
              ? `"${v.title}" a été publié`
              : v.status === 'completed'
              ? `"${v.title}" est prête`
              : `"${v.title}" créée`,
          timestamp: v.created_at as string,
        }));

      setActivities(activityItems);
    } catch (err) {
      console.error('Dashboard data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Load SUTRA Mirror suggestions
  const loadMirrorSuggestions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/mirror/suggestions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions.map((s: { id: string; title: string; description: string; estimated_viral_score?: number }) => ({
            id: s.id,
            topic: s.title,
            description: s.description + (s.estimated_viral_score ? ` (Score: ${s.estimated_viral_score})` : ''),
          })));
          return;
        }
      }
    } catch {
      // Fallback to default suggestions
    }
  }, []);

  useEffect(() => {
    loadMirrorSuggestions();
  }, [loadMirrorSuggestions]);

  const handleRefreshSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      await loadMirrorSuggestions();
    } catch {
      const shuffled = [...DEFAULT_SUGGESTIONS].sort(() => Math.random() - 0.5);
      setSuggestions(shuffled);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [loadMirrorSuggestions]);

  const handleSuggestionSelect = useCallback(
    (topic: string) => {
      router.push(`/create?topic=${encodeURIComponent(topic)}`);
    },
    [router]
  );

  const handleVideoClick = useCallback(
    (id: string) => {
      router.push(`/editor?video=${id}`);
    },
    [router]
  );

  const handleCreateClick = useCallback(() => {
    router.push('/create');
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Skeleton welcome */}
        <div className="space-y-2">
          <Skeleton variant="text" width="300px" height={32} />
          <Skeleton variant="text" width="200px" height={16} />
        </div>

        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="card" height={140} />
          ))}
        </div>

        {/* Skeleton content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton variant="card" height={400} />
          </div>
          <Skeleton variant="card" height={400} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-orbitron)] text-white">
            Bienvenue{profile?.full_name ? `, ${profile.full_name}` : ''}
          </h1>
          <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mt-1">
            Voici un aperçu de votre activité
          </p>
        </div>
        <div className="flex gap-3">
          <GlowBtn
            icon={<Plus size={18} />}
            onClick={handleCreateClick}
          >
            Créer une vidéo
          </GlowBtn>
          <GlowBtn
            variant="secondary"
            icon={<Scissors size={18} />}
            onClick={() => router.push('/editor')}
          >
            Ouvrir l&apos;éditeur
          </GlowBtn>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Film size={20} />}
          label="Vidéos créées"
          value={stats?.videosCreated || 0}
          change={stats?.videosChange}
          color="violet"
        />
        <StatCard
          icon={<Eye size={20} />}
          label="Vues totales"
          value={stats?.totalViews || 0}
          change={stats?.viewsChange}
          color="blue"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Revenus estimés"
          value={stats?.estimatedRevenue || 0}
          change={stats?.revenueChange}
          color="cyan"
          suffix="€"
        />
        <StatCard
          icon={<Zap size={20} />}
          label="Crédits restants"
          value={stats?.creditsRemaining || 0}
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Videos - 2/3 width */}
        <div className="lg:col-span-2">
          <RecentVideos
            videos={videos.map((v) => ({
              id: v.id,
              title: v.title,
              thumbnail_url: v.thumbnail_url,
              status: v.status,
              created_at: v.created_at,
            }))}
            onVideoClick={handleVideoClick}
            onCreateClick={handleCreateClick}
          />
        </div>

        {/* AI Suggestions - 1/3 width */}
        <AISuggestions
          suggestions={suggestions}
          onSelect={handleSuggestionSelect}
          onRefresh={handleRefreshSuggestions}
          loading={suggestionsLoading}
        />
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Glass className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <TrendingUp size={16} className="text-violet-400" />
            </div>
            <h2 className="text-sm font-bold text-white font-[family-name:var(--font-orbitron)]">
              Activité récente
            </h2>
          </div>

          {activities.length === 0 ? (
            <p className="text-sm text-white/30 text-center py-8 font-[family-name:var(--font-exo2)]">
              Aucune activité récente. Créez votre première vidéo pour commencer.
            </p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity, i) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0"
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      activity.type === 'video_published'
                        ? 'bg-emerald-500/15'
                        : activity.type === 'video_completed'
                        ? 'bg-cyan-500/15'
                        : 'bg-violet-500/15'
                    }`}
                  >
                    {activity.type === 'video_published' ? (
                      <Eye size={14} className="text-emerald-400" />
                    ) : activity.type === 'video_completed' ? (
                      <Film size={14} className="text-cyan-400" />
                    ) : (
                      <Plus size={14} className="text-violet-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] truncate">
                      {activity.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/30 shrink-0">
                    <Clock size={12} />
                    <span className="font-[family-name:var(--font-exo2)]">
                      {new Date(activity.timestamp).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Glass>
      </motion.div>
    </div>
  );
}
