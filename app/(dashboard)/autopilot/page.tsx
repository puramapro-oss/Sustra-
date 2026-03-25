'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Calendar, Clock, Globe, PlaySquare, Camera,
  Settings, Play, Pause, Check, X, ChevronLeft, ChevronRight,
  BarChart3, Film, Eye, ThumbsUp, Save, Rocket, Brain, Loader2,
  RefreshCw
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

const NICHES = [
  'Finance', 'Tech', 'Motivation', 'Lifestyle', 'Gaming',
  'Éducation', 'Santé', 'Voyage', 'Cuisine', 'Science',
  'Histoire', 'Sport', 'Mode', 'Musique', 'Business',
];

const FREQUENCIES = [
  { value: 'daily', label: '1 vidéo/jour', per_week: 7 },
  { value: '3-week', label: '3 vidéos/semaine', per_week: 3 },
  { value: 'weekly', label: '1 vidéo/semaine', per_week: 1 },
  { value: 'bimonthly', label: '2 vidéos/mois', per_week: 0.5 },
];

const STYLES = [
  'Cinématique', 'Moderne', 'Vintage', 'Néon', 'Nature', 'Corporate', 'Cartoon', 'Minimaliste',
];

const FORMATS = [
  { value: 'youtube', label: 'YouTube Long' },
  { value: 'short', label: 'Short / Reel' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'mix', label: 'Mix (IA choisit)' },
];

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

interface QueueItem {
  id: string;
  video_id: string;
  platform: string;
  scheduled_at: string;
  optimal_score: number;
  status: string;
  videos?: { title: string; thumbnail_url: string };
}

interface OptimalTime {
  day: string;
  hour: number;
  score: number;
}

export default function AutopilotPage() {
  const [enabled, setEnabled] = useState(false);
  const [niche, setNiche] = useState('Tech');
  const [style, setStyle] = useState('Moderne');
  const [frequency, setFrequency] = useState('3-week');
  const [format, setFormat] = useState('mix');
  const [networks, setNetworks] = useState({ youtube: true, tiktok: false, instagram: false });
  const [publishMode, setPublishMode] = useState<'auto' | 'approval'>('approval');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [optimalTimes, setOptimalTimes] = useState<OptimalTime[]>([]);
  const [calculatingTimes, setCalculatingTimes] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || '';
  };

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('autopilot_enabled, autopilot_mode, autopilot_frequency, autopilot_niche, autopilot_style, optimal_posting_times')
          .eq('id', user.id)
          .single();

        if (profile) {
          setEnabled(profile.autopilot_enabled || false);
          setPublishMode(profile.autopilot_mode || 'approval');
          setNiche(profile.autopilot_niche || 'Tech');
          setStyle(profile.autopilot_style || 'Moderne');
          if (profile.autopilot_frequency) {
            setFrequency(profile.autopilot_frequency.frequency || '3-week');
            setFormat(profile.autopilot_frequency.format || 'mix');
            setNetworks(profile.autopilot_frequency.networks || { youtube: true, tiktok: false, instagram: false });
          }
          if (profile.optimal_posting_times) {
            setOptimalTimes(profile.optimal_posting_times);
          }
        }
      } catch (err) {
        console.error('Error loading config:', err);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  // Load queue
  const loadQueue = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/autopilot/queue', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.posts || []);
      }
    } catch (err) {
      console.error('Error loading queue:', err);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await getAuthToken();
      await fetch('/api/autopilot/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          niche,
          style,
          frequency: { frequency, format, per_week: FREQUENCIES.find(f => f.value === frequency)?.per_week, networks },
          publish_mode: publishMode,
        }),
      });
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (res.ok) {
        setEnabled(!enabled);
      }
    } catch (err) {
      console.error('Error toggling:', err);
    }
  };

  const handleApprove = async (postId: string) => {
    setApproving(postId);
    try {
      const token = await getAuthToken();
      await fetch('/api/autopilot/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post_id: postId }),
      });
      await loadQueue();
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setApproving(null);
    }
  };

  const handleCalculateOptimalTimes = async () => {
    setCalculatingTimes(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/autopilot/optimal-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          niche,
          platforms: Object.entries(networks).filter(([, v]) => v).map(([k]) => k),
          country: 'FR',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOptimalTimes(data.optimal_times || []);
      }
    } catch (err) {
      console.error('Error calculating times:', err);
    } finally {
      setCalculatingTimes(false);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7;

  const getQueueForDay = (day: number) => {
    return queue.filter(item => {
      const d = new Date(item.scheduled_at);
      return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sutra-violet" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sutra-gold/20 to-sutra-rose/20 border border-sutra-gold/30">
            <Rocket className="text-sutra-gold" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-orbitron font-bold gradient-text">Autopilot Pro</h1>
            <p className="text-white/50 text-sm">Timing intelligent + publication automatique + file d&apos;attente IA</p>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={`relative w-16 h-8 rounded-full transition-all duration-300 ${
            enabled ? 'bg-sutra-green shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white/10'
          }`}
        >
          <div
            className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all duration-300 ${
              enabled ? 'left-9' : 'left-1'
            }`}
          />
        </button>
      </motion.div>

      {/* Status Banner */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-4 border border-sutra-green/30 bg-sutra-green/5 flex items-center gap-3"
        >
          <div className="w-3 h-3 rounded-full bg-sutra-green animate-pulse" />
          <span className="text-sutra-green text-sm font-medium">
            Autopilot actif — Mode {publishMode === 'auto' ? '100% automatique' : 'avec approbation'}
          </span>
          <span className="text-white/40 text-sm ml-auto">
            {queue.length} vidéo{queue.length !== 1 ? 's' : ''} en attente
          </span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass p-6 space-y-5"
        >
          <h2 className="font-semibold flex items-center gap-2 text-lg">
            <Settings size={18} className="text-sutra-violet" /> Configuration
          </h2>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Niche / Thématique</label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-sutra-violet/50"
            >
              {NICHES.map((n) => (
                <option key={n} value={n} className="bg-[#1a1a2e]">{n}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Format</label>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFormat(f.value)}
                  className={`text-sm px-3 py-2 rounded-lg transition-all ${
                    format === f.value
                      ? 'bg-sutra-violet/20 border border-sutra-violet/50 text-sutra-violet'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Style visuel</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-sutra-violet/50"
            >
              {STYLES.map((s) => (
                <option key={s} value={s} className="bg-[#1a1a2e]">{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Fréquence</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFrequency(f.value)}
                  className={`text-sm px-3 py-2 rounded-lg transition-all ${
                    frequency === f.value
                      ? 'bg-sutra-violet/20 border border-sutra-violet/50 text-sutra-violet'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Réseaux de publication</label>
            <div className="flex gap-3">
              {[
                { key: 'youtube', icon: <PlaySquare size={16} />, label: 'YouTube' },
                { key: 'tiktok', icon: <Zap size={16} />, label: 'TikTok' },
                { key: 'instagram', icon: <Camera size={16} />, label: 'Instagram' },
              ].map((n) => (
                <button
                  key={n.key}
                  onClick={() => setNetworks({ ...networks, [n.key]: !networks[n.key as keyof typeof networks] })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm transition-all ${
                    networks[n.key as keyof typeof networks]
                      ? 'bg-sutra-violet/20 border border-sutra-violet/50 text-white'
                      : 'bg-white/5 border border-white/10 text-white/40'
                  }`}
                >
                  {n.icon} {n.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/50">Mode de publication</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPublishMode('approval')}
                className={`text-sm px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  publishMode === 'approval'
                    ? 'bg-sutra-blue/20 border border-sutra-blue/50 text-sutra-blue'
                    : 'bg-white/5 border border-white/10 text-white/60'
                }`}
              >
                <Check size={14} /> Avec approbation
              </button>
              <button
                onClick={() => setPublishMode('auto')}
                className={`text-sm px-3 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 ${
                  publishMode === 'auto'
                    ? 'bg-sutra-green/20 border border-sutra-green/50 text-sutra-green'
                    : 'bg-white/5 border border-white/10 text-white/60'
                }`}
              >
                <Rocket size={14} /> 100% auto
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-glow w-full flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
          </button>
        </motion.div>

        {/* Right Column: Optimal Times + Calendar */}
        <div className="space-y-6">
          {/* Optimal Posting Times */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Brain size={18} className="text-sutra-cyan" /> Créneaux optimaux
              </h2>
              <button
                onClick={handleCalculateOptimalTimes}
                disabled={calculatingTimes}
                className="text-xs text-sutra-cyan hover:text-white transition-colors flex items-center gap-1"
              >
                {calculatingTimes ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {calculatingTimes ? 'Analyse...' : 'Analyser'}
              </button>
            </div>

            {optimalTimes.length > 0 ? (
              <div className="space-y-2">
                {optimalTimes.slice(0, 5).map((time, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      time.score >= 80 ? 'bg-sutra-green/20 text-sutra-green' :
                      time.score >= 60 ? 'bg-sutra-gold/20 text-sutra-gold' :
                      'bg-white/10 text-white/50'
                    }`}>
                      {time.score}
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{time.day}</span>
                      <span className="text-white/40 text-sm ml-2">{time.hour}h00</span>
                    </div>
                    <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          time.score >= 80 ? 'bg-sutra-green' : time.score >= 60 ? 'bg-sutra-gold' : 'bg-white/30'
                        }`}
                        style={{ width: `${time.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-white/30 text-sm">
                <Globe size={24} className="mx-auto mb-2 opacity-50" />
                Clique sur &quot;Analyser&quot; pour que l&apos;IA calcule<br />tes meilleurs créneaux de publication
              </div>
            )}
          </motion.div>

          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Calendar size={18} className="text-sutra-blue" /> Calendrier éditorial
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-medium w-36 text-center capitalize">
                  {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d} className="text-center text-xs text-white/30 py-2">{d}</div>
              ))}
              {Array.from({ length: firstDayOfMonth }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const dayQueue = getQueueForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth();
                return (
                  <div
                    key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all cursor-pointer hover:bg-white/5 relative ${
                      dayQueue.length > 0 ? 'bg-sutra-violet/10' : ''
                    } ${isToday ? 'ring-1 ring-sutra-cyan/50' : ''}`}
                  >
                    <span className={`${dayQueue.length > 0 ? 'text-sutra-violet font-medium' : 'text-white/50'} ${isToday ? 'text-sutra-cyan' : ''}`}>
                      {day}
                    </span>
                    {dayQueue.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayQueue.slice(0, 3).map((q, qi) => (
                          <div key={qi} className={`w-1.5 h-1.5 rounded-full ${
                            q.platform === 'youtube' ? 'bg-red-500' :
                            q.platform === 'tiktok' ? 'bg-sutra-cyan' :
                            'bg-sutra-rose'
                          }`} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-white/40 justify-center">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> YouTube</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sutra-cyan" /> TikTok</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sutra-rose" /> Instagram</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Queue */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock size={18} className="text-sutra-cyan" /> File d&apos;attente ({queue.length}/3 vidéos d&apos;avance)
          </h2>
          <button onClick={loadQueue} className="text-xs text-white/40 hover:text-white/60 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="space-y-3">
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/[0.08] transition-all">
              <div className="w-16 h-10 rounded bg-white/5 flex items-center justify-center text-white/20">
                <Film size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{item.videos?.title || 'Vidéo en préparation'}</div>
                <div className="text-xs text-white/40 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} />
                    {new Date(item.scheduled_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="capitalize">{item.platform}</span>
                  {item.optimal_score > 0 && (
                    <span className="text-sutra-green">Score: {item.optimal_score}</span>
                  )}
                </div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                item.status === 'approved' ? 'bg-sutra-green/20 text-sutra-green' :
                item.status === 'published' ? 'bg-sutra-blue/20 text-sutra-blue' :
                item.status === 'publishing' ? 'bg-sutra-gold/20 text-sutra-gold' :
                'bg-white/10 text-white/50'
              }`}>
                {item.status === 'approved' ? 'Approuvé' :
                 item.status === 'published' ? 'Publié' :
                 item.status === 'publishing' ? 'En cours...' :
                 'En attente'}
              </span>
              {item.status === 'scheduled' && (
                <div className="flex gap-1">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={approving === item.id}
                    className="p-1.5 rounded-lg bg-sutra-green/20 text-sutra-green hover:bg-sutra-green/30 transition-colors"
                  >
                    {approving === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button className="p-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
          {queue.length === 0 && (
            <div className="text-center py-8 text-white/30">
              <Clock size={32} className="mx-auto mb-2 opacity-30" />
              Aucune vidéo en file d&apos;attente.<br />
              {!enabled && "Active l'autopilot pour commencer."}
            </div>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { icon: Film, label: 'Vidéos ce mois', value: String(queue.filter(q => q.status === 'published').length), color: 'text-sutra-violet', bg: 'bg-sutra-violet/20' },
          { icon: Eye, label: 'Vues totales', value: '0', color: 'text-sutra-blue', bg: 'bg-sutra-blue/20' },
          { icon: ThumbsUp, label: 'Engagement', value: '0%', color: 'text-sutra-green', bg: 'bg-sutra-green/20' },
          { icon: BarChart3, label: 'Score moyen', value: optimalTimes.length > 0 ? String(Math.round(optimalTimes.reduce((s, t) => s + t.score, 0) / optimalTimes.length)) : '-', color: 'text-sutra-gold', bg: 'bg-sutra-gold/20' },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-4 flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <div className="text-2xl font-orbitron font-bold">{stat.value}</div>
              <div className="text-xs text-white/40">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
