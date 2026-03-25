'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  PlaySquare,
  Film,
  Smartphone,
  Camera,
  Brain,
  Send,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
);

// --- Constants ---

type Frequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'custom';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'once', label: 'Ponctuel' },
  { value: 'daily', label: 'Quotidien' },
  { value: 'weekly', label: 'Hebdomadaire' },
  { value: 'monthly', label: 'Mensuel' },
  { value: 'custom', label: 'Personnalisé' },
];

const DAYS_SHORT = ['L', 'M', 'Me', 'J', 'V', 'S', 'D'];
const DAYS_FULL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const FORMATS = [
  { value: 'youtube_long', label: 'YouTube Long' },
  { value: 'short', label: 'Short' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'ai_choice', label: "L'IA choisit" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

interface Schedule {
  id: string;
  name: string;
  frequency: Frequency;
  days: number[];
  day_of_month: number | null;
  hour: number;
  minute: number;
  format: string;
  topic: string;
  ai_topic: boolean;
  platforms: string[];
  publish_mode: 'auto' | 'approval';
  active: boolean;
  next_execution: string | null;
  videos_created: number;
  created_at: string;
}

interface FormState {
  name: string;
  frequency: Frequency;
  days: number[];
  dayOfMonth: number;
  hour: number;
  minute: number;
  format: string;
  topic: string;
  aiTopic: boolean;
  platforms: { youtube: boolean; tiktok: boolean; instagram: boolean };
  publishMode: 'auto' | 'approval';
}

const initialForm: FormState = {
  name: '',
  frequency: 'daily',
  days: [],
  dayOfMonth: 1,
  hour: 10,
  minute: 0,
  format: 'youtube_long',
  topic: '',
  aiTopic: false,
  platforms: { youtube: true, tiktok: false, instagram: false },
  publishMode: 'approval',
};

// --- Helpers ---

const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || '';
};

const pad = (n: number) => n.toString().padStart(2, '0');

const frequencyLabel = (f: Frequency) =>
  FREQUENCIES.find((fr) => fr.value === f)?.label || f;

const formatDays = (days: number[]) =>
  days
    .sort((a, b) => a - b)
    .map((d) => DAYS_SHORT[d])
    .join(', ');

const platformColor = (platform: string) => {
  switch (platform) {
    case 'youtube':
    case 'youtube_long':
      return 'bg-red-500';
    case 'short':
      return 'bg-cyan-400';
    case 'tiktok':
      return 'bg-green-500';
    case 'instagram':
      return 'bg-pink-500';
    default:
      return 'bg-gray-500';
  }
};

// --- Component ---

export default function SchedulerPage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- Data loading ---

  const loadSchedules = useCallback(async () => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/scheduler', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      } else {
        console.error('Failed to load schedules:', res.status);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // --- Form handlers ---

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDay = (dayIndex: number) => {
    setForm((prev) => ({
      ...prev,
      days: prev.days.includes(dayIndex)
        ? prev.days.filter((d) => d !== dayIndex)
        : [...prev.days, dayIndex],
    }));
  };

  const togglePlatform = (platform: 'youtube' | 'tiktok' | 'instagram') => {
    setForm((prev) => ({
      ...prev,
      platforms: { ...prev.platforms, [platform]: !prev.platforms[platform] },
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!form.name.trim()) {
      setError('Le nom du planning est requis.');
      return;
    }

    const selectedPlatforms = Object.entries(form.platforms)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (selectedPlatforms.length === 0) {
      setError('Sélectionnez au moins une plateforme.');
      return;
    }

    if (form.frequency === 'weekly' && form.days.length === 0) {
      setError('Sélectionnez au moins un jour de la semaine.');
      return;
    }

    if (!form.aiTopic && !form.topic.trim()) {
      setError('Entrez un sujet ou laissez l\'IA choisir.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/scheduler', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          frequency: form.frequency,
          days: form.frequency === 'weekly' ? form.days : [],
          day_of_month: form.frequency === 'monthly' ? form.dayOfMonth : null,
          hour: form.hour,
          minute: form.minute,
          format: form.format,
          topic: form.aiTopic ? '' : form.topic.trim(),
          ai_topic: form.aiTopic,
          platforms: selectedPlatforms,
          publish_mode: form.publishMode,
        }),
      });

      if (res.ok) {
        setSuccess('Planning créé avec succès !');
        setForm(initialForm);
        await loadSchedules();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Erreur lors de la création du planning.');
      }
    } catch (err) {
      console.error('Error creating schedule:', err);
      setError('Erreur réseau. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/scheduler/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule_id: id }),
      });
      if (res.ok) {
        setSchedules((prev) =>
          prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
        );
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/scheduler', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schedule_id: id }),
      });
      if (res.ok) {
        setSchedules((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error('Error deleting schedule:', err);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Calendar helpers ---

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();

  const firstDayOfMonth =
    (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() + 6) % 7;

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() &&
    currentMonth.getMonth() === today.getMonth() &&
    currentMonth.getFullYear() === today.getFullYear();

  const getSchedulesForDay = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${pad(currentMonth.getMonth() + 1)}-${pad(day)}`;
    const dayOfWeek = (new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day).getDay() + 6) % 7;

    return schedules
      .filter((s) => {
        if (!s.active) return false;
        if (s.frequency === 'daily') return true;
        if (s.frequency === 'weekly') return s.days.includes(dayOfWeek);
        if (s.frequency === 'monthly') return s.day_of_month === day;
        if (s.frequency === 'once' && s.next_execution) {
          return s.next_execution.startsWith(dateStr);
        }
        return false;
      })
      .flatMap((s) => s.platforms.map((p) => ({ platform: p, schedule: s })));
  };

  const prevMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const monthName = currentMonth.toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });

  // --- Render ---

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-orbitron gradient-text mb-2">
          Planificateur SUTRA
        </h1>
        <p className="text-white/60 text-sm md:text-base">
          Programmez vos vidéos, laissez l&apos;IA produire pour vous.
        </p>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300"
          >
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-white">
              &times;
            </button>
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300"
          >
            <CheckCircle size={18} />
            <span className="text-sm">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-300 hover:text-white">
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 1: Create Schedule */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass p-6 rounded-2xl"
      >
        <h2 className="text-xl font-orbitron text-white mb-6 flex items-center gap-2">
          <Plus size={20} className="text-cyan-400" />
          Créer un planning
        </h2>

        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm text-white/70 mb-1">Nom du planning</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="Ex: Vidéos tech quotidiennes"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Fréquence</label>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.value}
                  onClick={() => updateForm('frequency', f.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    form.frequency === f.value
                      ? 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-300'
                      : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Days of week (weekly only) */}
          <AnimatePresence>
            {form.frequency === 'weekly' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm text-white/70 mb-2">Jours de la semaine</label>
                <div className="flex gap-2">
                  {DAYS_SHORT.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        form.days.includes(i)
                          ? 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-300'
                          : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Day of month (monthly only) */}
          <AnimatePresence>
            {form.frequency === 'monthly' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="block text-sm text-white/70 mb-2">Jour du mois</label>
                <select
                  value={form.dayOfMonth}
                  onChange={(e) => updateForm('dayOfMonth', parseInt(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                >
                  {MONTH_DAYS.map((d) => (
                    <option key={d} value={d} className="bg-gray-900">
                      {d}
                    </option>
                  ))}
                </select>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time */}
          <div className="flex gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Heure</label>
              <select
                value={form.hour}
                onChange={(e) => updateForm('hour', parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h} className="bg-gray-900">
                    {pad(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-white/70 mb-1">Minute</label>
              <select
                value={form.minute}
                onChange={(e) => updateForm('minute', parseInt(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m} className="bg-gray-900">
                    {pad(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm text-white/70 mb-1">Format vidéo</label>
            <select
              value={form.format}
              onChange={(e) => updateForm('format', e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value} className="bg-gray-900">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm text-white/70 mb-1">Sujet</label>
            <div className="space-y-2">
              <input
                type="text"
                value={form.topic}
                onChange={(e) => updateForm('topic', e.target.value)}
                placeholder="Ex: Les tendances IA en 2026"
                disabled={form.aiTopic}
                className={`w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors ${
                  form.aiTopic ? 'opacity-40 cursor-not-allowed' : ''
                }`}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aiTopic}
                  onChange={(e) => updateForm('aiTopic', e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
                />
                <Brain size={16} className="text-cyan-400" />
                <span className="text-sm text-white/70">L&apos;IA choisit le sujet</span>
              </label>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Plateformes</label>
            <div className="flex flex-wrap gap-3">
              {([
                { key: 'youtube' as const, label: 'YouTube', icon: PlaySquare, color: 'red' },
                { key: 'tiktok' as const, label: 'TikTok', icon: Smartphone, color: 'green' },
                { key: 'instagram' as const, label: 'Instagram', icon: Camera, color: 'pink' },
              ]).map(({ key, label, icon: Icon, color }) => (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer transition-all ${
                    form.platforms[key]
                      ? `bg-${color}-500/20 border border-${color}-400/50 text-${color}-300`
                      : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.platforms[key]}
                    onChange={() => togglePlatform(key)}
                    className="hidden"
                  />
                  <Icon size={18} />
                  <span className="text-sm font-medium">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Publish mode */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Mode de publication</label>
            <div className="flex gap-3">
              {([
                { value: 'auto' as const, label: 'Automatique', desc: 'Publie directement' },
                { value: 'approval' as const, label: 'Avec approbation', desc: 'Vous validez avant' },
              ]).map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => updateForm('publishMode', mode.value)}
                  className={`flex-1 p-3 rounded-lg text-left transition-all ${
                    form.publishMode === mode.value
                      ? 'bg-cyan-500/20 border border-cyan-400/50'
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className={`text-sm font-medium ${form.publishMode === mode.value ? 'text-cyan-300' : 'text-white/70'}`}>
                    {mode.label}
                  </div>
                  <div className="text-xs text-white/40 mt-0.5">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-glow w-full py-3 rounded-xl font-orbitron text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
            {submitting ? 'Création en cours...' : 'Programmer'}
          </motion.button>
        </div>
      </motion.section>

      {/* Section 2: Active Schedules */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass p-6 rounded-2xl"
      >
        <h2 className="text-xl font-orbitron text-white mb-6 flex items-center gap-2">
          <CalendarDays size={20} className="text-cyan-400" />
          Mes plannings actifs
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-cyan-400" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-12">
            <CalendarDays size={48} className="mx-auto text-white/20 mb-3" />
            <p className="text-white/40 text-sm">Aucun planning créé pour le moment.</p>
            <p className="text-white/30 text-xs mt-1">
              Utilisez le formulaire ci-dessus pour en créer un.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {schedules.map((schedule, index) => (
                <motion.div
                  key={schedule.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`glass-hover p-4 rounded-xl border transition-all ${
                    schedule.active
                      ? 'border-cyan-500/20'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">{schedule.name}</h3>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            schedule.active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/40'
                          }`}
                        >
                          {schedule.active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                        <span>{frequencyLabel(schedule.frequency)}</span>
                        {schedule.frequency === 'weekly' && schedule.days.length > 0 && (
                          <span>{formatDays(schedule.days)}</span>
                        )}
                        {schedule.frequency === 'monthly' && schedule.day_of_month && (
                          <span>Jour {schedule.day_of_month}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {pad(schedule.hour)}:{pad(schedule.minute)}
                        </span>
                        {schedule.next_execution && (
                          <span className="text-cyan-400/70">
                            Prochain: {new Date(schedule.next_execution).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Film size={12} />
                          {schedule.videos_created} vidéo{schedule.videos_created !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        {schedule.platforms.map((p) => (
                          <span
                            key={p}
                            className={`text-[10px] px-2 py-0.5 rounded-full text-white/80 ${platformColor(p)}/30`}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggle(schedule.id)}
                        disabled={togglingId === schedule.id}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white disabled:opacity-50"
                        title={schedule.active ? 'Désactiver' : 'Activer'}
                      >
                        {togglingId === schedule.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : schedule.active ? (
                          <ToggleRight size={18} className="text-cyan-400" />
                        ) : (
                          <ToggleLeft size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(schedule.id)}
                        disabled={deletingId === schedule.id}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors text-white/40 hover:text-red-400 disabled:opacity-50"
                        title="Supprimer"
                      >
                        {deletingId === schedule.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* Section 3: Calendar */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass p-6 rounded-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-orbitron text-white flex items-center gap-2">
            <CalendarDays size={20} className="text-cyan-400" />
            Calendrier
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-medium text-sm min-w-[140px] text-center capitalize">
              {monthName}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAYS_FULL.map((day) => (
            <div key={day} className="text-center text-xs text-white/40 py-1 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for offset */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const daySchedules = getSchedulesForDay(day);
            const todayHighlight = isToday(day);

            return (
              <motion.div
                key={day}
                whileHover={{ scale: 1.05 }}
                className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start transition-all cursor-default ${
                  todayHighlight
                    ? 'ring-2 ring-cyan-400 bg-cyan-500/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <span
                  className={`text-xs font-medium ${
                    todayHighlight ? 'text-cyan-300' : 'text-white/60'
                  }`}
                >
                  {day}
                </span>
                {daySchedules.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {daySchedules.slice(0, 4).map((item, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 rounded-full ${platformColor(item.platform)}`}
                      />
                    ))}
                    {daySchedules.length > 4 && (
                      <span className="text-[8px] text-white/40">
                        +{daySchedules.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/10">
          <span className="text-xs text-white/40">Légende :</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs text-white/50">YouTube</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-xs text-white/50">Short</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs text-white/50">TikTok</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span className="text-xs text-white/50">Instagram</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-3 h-3 rounded ring-2 ring-cyan-400 bg-cyan-500/10" />
            <span className="text-xs text-white/50">Aujourd&apos;hui</span>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
