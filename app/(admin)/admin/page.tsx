'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Users,
  DollarSign,
  Trophy,
  BarChart3,
  Activity,
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Ban,
  Eye,
  Loader2,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Supabase client (env with fallbacks)
// ---------------------------------------------------------------------------
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Tab = 'overview' | 'users' | 'referrals' | 'influencers' | 'contests' | 'finances';

interface StatCard {
  label: string;
  value: string;
  trend: number;
  icon: React.ReactNode;
  color: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  plan: string;
  videos: number;
  created_at: string;
  status: 'active' | 'banned';
}

interface Referrer {
  id: string;
  name: string;
  referrals: number;
  earned: number;
}

interface Influencer {
  id: string;
  name: string;
  platform: string;
  clicks: number;
  conversions: number;
  earnings: number;
  contract_status: 'actif' | 'expiré' | 'en attente';
}

interface Contest {
  id: string;
  month: string;
  winner: string;
  prize: number;
  participants: number;
}

interface AdminStats {
  mrr: number;
  mrr_trend: number;
  total_revenue: number;
  revenue_trend: number;
  active_users: number;
  users_trend: number;
  churn_rate: number;
  churn_trend: number;
  recent_activity: { id: string; text: string; time: string }[];
  revenue_starter: number;
  revenue_creator: number;
  revenue_empire: number;
  total_commissions: number;
  total_prizes: number;
}

// ---------------------------------------------------------------------------
// Mock data fallbacks
// ---------------------------------------------------------------------------
const MOCK_STATS: AdminStats = {
  mrr: 24850,
  mrr_trend: 12.4,
  total_revenue: 187420,
  revenue_trend: 8.7,
  active_users: 1243,
  users_trend: 5.2,
  churn_rate: 3.1,
  churn_trend: -0.8,
  recent_activity: [
    { id: '1', text: 'Nouvel abonnement Empire — jean.dupont@mail.com', time: 'Il y a 5 min' },
    { id: '2', text: 'Paiement commission parrainage — 45,00 €', time: 'Il y a 12 min' },
    { id: '3', text: 'Upgrade Starter → Créateur — marie.l@mail.com', time: 'Il y a 28 min' },
    { id: '4', text: 'Nouveau parrainage validé — lucas.m@mail.com', time: 'Il y a 34 min' },
    { id: '5', text: 'Vidéo exportée (Empire) — sophie.r@mail.com', time: 'Il y a 41 min' },
    { id: '6', text: 'Inscription influenceur — @techreviewer', time: 'Il y a 1 h' },
  ],
  revenue_starter: 4970,
  revenue_creator: 8940,
  revenue_empire: 10940,
  total_commissions: 3420,
  total_prizes: 1500,
};

const MOCK_USERS: UserRow[] = Array.from({ length: 38 }, (_, i) => ({
  id: `u-${i + 1}`,
  name: [
    'Jean Dupont', 'Marie Laurent', 'Lucas Martin', 'Sophie Richard',
    'Thomas Bernard', 'Emma Petit', 'Hugo Moreau', 'Léa Simon',
    'Nathan Michel', 'Chloé Lefebvre',
  ][i % 10],
  email: `user${i + 1}@example.com`,
  plan: ['Starter', 'Créateur', 'Empire', 'Starter', 'Empire'][i % 5],
  videos: Math.floor(Math.random() * 120) + 1,
  created_at: new Date(Date.now() - Math.random() * 180 * 86400000).toISOString(),
  status: i === 4 ? 'banned' : 'active',
}));

const MOCK_REFERRERS: Referrer[] = [
  { id: 'r1', name: 'Jean Dupont', referrals: 23, earned: 1150 },
  { id: 'r2', name: 'Marie Laurent', referrals: 18, earned: 900 },
  { id: 'r3', name: 'Lucas Martin', referrals: 14, earned: 700 },
  { id: 'r4', name: 'Sophie Richard', referrals: 11, earned: 550 },
  { id: 'r5', name: 'Thomas Bernard', referrals: 7, earned: 350 },
];

const MOCK_INFLUENCERS: Influencer[] = [
  { id: 'i1', name: '@techreviewer', platform: 'YouTube', clicks: 4520, conversions: 89, earnings: 2670, contract_status: 'actif' },
  { id: 'i2', name: '@creativestudio', platform: 'Instagram', clicks: 3210, conversions: 64, earnings: 1920, contract_status: 'actif' },
  { id: 'i3', name: '@videomaster_fr', platform: 'TikTok', clicks: 8740, conversions: 112, earnings: 3360, contract_status: 'actif' },
  { id: 'i4', name: '@digitalartist', platform: 'Twitter', clicks: 1890, conversions: 28, earnings: 840, contract_status: 'expiré' },
  { id: 'i5', name: '@contentkingfr', platform: 'YouTube', clicks: 2340, conversions: 45, earnings: 1350, contract_status: 'en attente' },
];

const MOCK_CONTESTS: Contest[] = [
  { id: 'c1', month: 'Mars 2026', winner: 'Marie Laurent', prize: 500, participants: 342 },
  { id: 'c2', month: 'Février 2026', winner: 'Lucas Martin', prize: 500, participants: 298 },
  { id: 'c3', month: 'Janvier 2026', winner: 'Jean Dupont', prize: 500, participants: 267 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

const tabConfig: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: "Vue d'ensemble", icon: <BarChart3 className="w-4 h-4" /> },
  { key: 'users', label: 'Utilisateurs', icon: <Users className="w-4 h-4" /> },
  { key: 'referrals', label: 'Parrainages', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'influencers', label: 'Influenceurs', icon: <Activity className="w-4 h-4" /> },
  { key: 'contests', label: 'Concours', icon: <Trophy className="w-4 h-4" /> },
  { key: 'finances', label: 'Finances', icon: <DollarSign className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);

  // Data states
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);

  // Users tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [usersPage, setUsersPage] = useState(1);
  const USERS_PER_PAGE = 10;

  // -------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setStats(MOCK_STATS);
      }
    } catch {
      setStats(MOCK_STATS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? data);
      } else {
        setUsers(MOCK_USERS);
      }
    } catch {
      setUsers(MOCK_USERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setReferrers(data.referrers ?? MOCK_REFERRERS);
      } else {
        setReferrers(MOCK_REFERRERS);
      }
    } catch {
      setReferrers(MOCK_REFERRERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInfluencers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setInfluencers(data.influencers ?? MOCK_INFLUENCERS);
      } else {
        setInfluencers(MOCK_INFLUENCERS);
      }
    } catch {
      setInfluencers(MOCK_INFLUENCERS);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setContests(data.contests ?? MOCK_CONTESTS);
      } else {
        setContests(MOCK_CONTESTS);
      }
    } catch {
      setContests(MOCK_CONTESTS);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load data on tab switch
  useEffect(() => {
    switch (activeTab) {
      case 'overview':
      case 'finances':
        fetchStats();
        break;
      case 'users':
        fetchUsers();
        break;
      case 'referrals':
        fetchReferrals();
        break;
      case 'influencers':
        fetchInfluencers();
        break;
      case 'contests':
        fetchContests();
        break;
    }
  }, [activeTab, fetchStats, fetchUsers, fetchReferrals, fetchInfluencers, fetchContests]);

  // -------------------------------------------------------------------
  // User actions
  // -------------------------------------------------------------------
  const handleToggleBan = async (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: u.status === 'active' ? 'banned' : 'active' } : u
      )
    );
  };

  // -------------------------------------------------------------------
  // Filtered / paginated users
  // -------------------------------------------------------------------
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * USERS_PER_PAGE,
    usersPage * USERS_PER_PAGE
  );

  // -------------------------------------------------------------------
  // Spinner overlay
  // -------------------------------------------------------------------
  const LoadingOverlay = () => (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-sutra-violet" />
    </div>
  );

  // -------------------------------------------------------------------
  // Animation variants
  // -------------------------------------------------------------------
  const fadeIn = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
    transition: { duration: 0.25 },
  };

  // -------------------------------------------------------------------
  // Stat card builder (overview)
  // -------------------------------------------------------------------
  const buildStatCards = (): StatCard[] => {
    if (!stats) return [];
    return [
      {
        label: 'MRR',
        value: fmt(stats.mrr),
        trend: stats.mrr_trend,
        icon: <DollarSign className="w-5 h-5" />,
        color: 'from-sutra-violet to-sutra-blue',
      },
      {
        label: 'CA Total',
        value: fmt(stats.total_revenue),
        trend: stats.revenue_trend,
        icon: <BarChart3 className="w-5 h-5" />,
        color: 'from-sutra-blue to-sutra-cyan',
      },
      {
        label: 'Utilisateurs Actifs',
        value: stats.active_users.toLocaleString('fr-FR'),
        trend: stats.users_trend,
        icon: <Users className="w-5 h-5" />,
        color: 'from-sutra-cyan to-sutra-green',
      },
      {
        label: 'Taux de churn',
        value: `${stats.churn_rate}%`,
        trend: stats.churn_trend,
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'from-sutra-rose to-sutra-violet',
      },
    ];
  };

  // ===================================================================
  // TAB RENDERERS
  // ===================================================================

  // ---- Vue d'ensemble ----
  const renderOverview = () => {
    if (loading || !stats) return <LoadingOverlay />;
    const cards = buildStatCards();
    return (
      <motion.div {...fadeIn} className="space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass glass-hover p-6 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{card.label}</span>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-20`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-2xl font-orbitron font-bold">{card.value}</p>
              <div className="flex items-center gap-1 text-sm">
                {card.trend >= 0 ? (
                  <ArrowUp className="w-4 h-4 text-sutra-green" />
                ) : (
                  <ArrowDown className="w-4 h-4 text-sutra-rose" />
                )}
                <span className={card.trend >= 0 ? 'text-sutra-green' : 'text-sutra-rose'}>
                  {Math.abs(card.trend)}%
                </span>
                <span className="text-white/40">vs mois dernier</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent activity */}
        <div className="glass p-6 space-y-4">
          <h3 className="font-orbitron text-lg gradient-text">Activité récente</h3>
          <ul className="divide-y divide-white/5">
            {stats.recent_activity.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-sutra-violet" />
                  <span className="text-sm text-white/80">{a.text}</span>
                </div>
                <span className="text-xs text-white/40 whitespace-nowrap ml-4">{a.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    );
  };

  // ---- Utilisateurs ----
  const renderUsers = () => {
    if (loading && users.length === 0) return <LoadingOverlay />;
    return (
      <motion.div {...fadeIn} className="space-y-6">
        {/* Search bar */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher un utilisateur…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setUsersPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-sutra-violet/50 transition"
            />
          </div>
          <button
            onClick={fetchUsers}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-sutra-violet/50 transition"
            title="Rafraîchir"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            className="btn-glow flex items-center gap-2 text-sm !px-4 !py-2.5"
            title="Exporter CSV"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>

        {/* Table */}
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium text-center">Vidéos</th>
                  <th className="px-4 py-3 font-medium">Inscription</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                  <th className="px-4 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-white/60">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.plan === 'Empire'
                            ? 'bg-sutra-gold/20 text-sutra-gold'
                            : u.plan === 'Créateur'
                            ? 'bg-sutra-violet/20 text-sutra-violet'
                            : 'bg-sutra-cyan/20 text-sutra-cyan'
                        }`}
                      >
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/60">{u.videos}</td>
                    <td className="px-4 py-3 text-white/60">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.status === 'active'
                            ? 'bg-sutra-green/20 text-sutra-green'
                            : 'bg-sutra-rose/20 text-sutra-rose'
                        }`}
                      >
                        {u.status === 'active' ? 'Actif' : 'Banni'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-1.5 rounded-lg hover:bg-white/10 transition"
                          title="Voir profil"
                        >
                          <Eye className="w-4 h-4 text-sutra-blue" />
                        </button>
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition"
                          title={u.status === 'active' ? 'Bannir' : 'Débannir'}
                        >
                          <Ban
                            className={`w-4 h-4 ${
                              u.status === 'active' ? 'text-white/40 hover:text-sutra-rose' : 'text-sutra-rose'
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 text-sm">
            <span className="text-white/40">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} — page{' '}
              {usersPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={usersPage <= 1}
                onClick={() => setUsersPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-sutra-violet/50 disabled:opacity-30 transition"
              >
                Précédent
              </button>
              <button
                disabled={usersPage >= totalPages}
                onClick={() => setUsersPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-sutra-violet/50 disabled:opacity-30 transition"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  // ---- Parrainages ----
  const renderReferrals = () => {
    if (loading && referrers.length === 0) return <LoadingOverlay />;
    const pendingCommissions = referrers.reduce((sum, r) => sum + r.earned * 0.15, 0);
    return (
      <motion.div {...fadeIn} className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-6 space-y-2">
            <span className="text-white/50 text-sm">Top parrain</span>
            <p className="text-xl font-orbitron font-bold">{referrers[0]?.name ?? '—'}</p>
            <p className="text-sutra-green text-sm">{referrers[0]?.referrals ?? 0} filleuls</p>
          </div>
          <div className="glass p-6 space-y-2">
            <span className="text-white/50 text-sm">Commissions en attente</span>
            <p className="text-xl font-orbitron font-bold text-sutra-gold">{fmt(pendingCommissions)}</p>
          </div>
          <div className="glass p-6 space-y-2">
            <span className="text-white/50 text-sm">Total distribué</span>
            <p className="text-xl font-orbitron font-bold gradient-text">
              {fmt(referrers.reduce((s, r) => s + r.earned, 0))}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Parrain</th>
                  <th className="px-4 py-3 font-medium text-center">Filleuls</th>
                  <th className="px-4 py-3 font-medium text-right">Total gagné</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referrers.map((r, i) => (
                  <tr key={r.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-white/40">{i + 1}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-center text-white/70">{r.referrals}</td>
                    <td className="px-4 py-3 text-right text-sutra-green font-medium">{fmt(r.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  // ---- Influenceurs ----
  const renderInfluencers = () => {
    if (loading && influencers.length === 0) return <LoadingOverlay />;
    return (
      <motion.div {...fadeIn} className="space-y-6">
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Plateforme</th>
                  <th className="px-4 py-3 font-medium text-center">Clics</th>
                  <th className="px-4 py-3 font-medium text-center">Conversions</th>
                  <th className="px-4 py-3 font-medium text-right">Gains</th>
                  <th className="px-4 py-3 font-medium text-center">Statut contrat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {influencers.map((inf) => (
                  <tr key={inf.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium">{inf.name}</td>
                    <td className="px-4 py-3 text-white/60">{inf.platform}</td>
                    <td className="px-4 py-3 text-center text-white/70">
                      {inf.clicks.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-center text-white/70">{inf.conversions}</td>
                    <td className="px-4 py-3 text-right text-sutra-green font-medium">
                      {fmt(inf.earnings)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inf.contract_status === 'actif'
                            ? 'bg-sutra-green/20 text-sutra-green'
                            : inf.contract_status === 'expiré'
                            ? 'bg-sutra-rose/20 text-sutra-rose'
                            : 'bg-sutra-gold/20 text-sutra-gold'
                        }`}
                      >
                        {inf.contract_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  // ---- Concours ----
  const renderContests = () => {
    if (loading && contests.length === 0) return <LoadingOverlay />;
    const totalPrizes = contests.reduce((s, c) => s + c.prize, 0);
    const current = contests[0];
    return (
      <motion.div {...fadeIn} className="space-y-6">
        {/* Current month status */}
        <div className="glass p-6 space-y-3 border-sutra-gold/30">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-sutra-gold" />
            <h3 className="font-orbitron text-lg">Concours en cours — {current?.month ?? '—'}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-white/50 text-sm">Participants</p>
              <p className="text-xl font-bold">{current?.participants ?? 0}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Prix à gagner</p>
              <p className="text-xl font-bold text-sutra-gold">{fmt(current?.prize ?? 0)}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Total prix distribués</p>
              <p className="text-xl font-bold gradient-text">{fmt(totalPrizes)}</p>
            </div>
          </div>
        </div>

        {/* Past results */}
        <div className="glass overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10">
            <h3 className="font-orbitron text-sm text-white/60">Résultats passés</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/50">
                  <th className="px-4 py-3 font-medium">Mois</th>
                  <th className="px-4 py-3 font-medium">Gagnant</th>
                  <th className="px-4 py-3 font-medium text-center">Participants</th>
                  <th className="px-4 py-3 font-medium text-right">Prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {contests.map((c) => (
                  <tr key={c.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium">{c.month}</td>
                    <td className="px-4 py-3 text-sutra-gold">{c.winner}</td>
                    <td className="px-4 py-3 text-center text-white/70">{c.participants}</td>
                    <td className="px-4 py-3 text-right text-sutra-green font-medium">
                      {fmt(c.prize)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    );
  };

  // ---- Finances ----
  const renderFinances = () => {
    if (loading || !stats) return <LoadingOverlay />;
    const netProfit =
      stats.revenue_starter +
      stats.revenue_creator +
      stats.revenue_empire -
      stats.total_commissions -
      stats.total_prizes;
    return (
      <motion.div {...fadeIn} className="space-y-6">
        {/* Revenue breakdown */}
        <h3 className="font-orbitron gradient-text text-lg">Revenus par plan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Starter', value: stats.revenue_starter, color: 'text-sutra-cyan' },
            { label: 'Créateur', value: stats.revenue_creator, color: 'text-sutra-violet' },
            { label: 'Empire', value: stats.revenue_empire, color: 'text-sutra-gold' },
          ].map((plan) => (
            <div key={plan.label} className="glass glass-hover p-6 space-y-2">
              <span className="text-white/50 text-sm">{plan.label}</span>
              <p className={`text-2xl font-orbitron font-bold ${plan.color}`}>{fmt(plan.value)}</p>
              <div className="w-full h-1.5 rounded-full bg-white/10 mt-2">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    plan.label === 'Empire'
                      ? 'from-sutra-gold to-sutra-rose'
                      : plan.label === 'Créateur'
                      ? 'from-sutra-violet to-sutra-blue'
                      : 'from-sutra-cyan to-sutra-green'
                  }`}
                  style={{
                    width: `${Math.round(
                      (plan.value /
                        (stats.revenue_starter + stats.revenue_creator + stats.revenue_empire)) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Commissions, Prizes, Net */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass p-6 space-y-2">
            <span className="text-white/50 text-sm">Total Commissions</span>
            <p className="text-2xl font-orbitron font-bold text-sutra-rose">
              -{fmt(stats.total_commissions)}
            </p>
          </div>
          <div className="glass p-6 space-y-2">
            <span className="text-white/50 text-sm">Total Prix concours</span>
            <p className="text-2xl font-orbitron font-bold text-sutra-rose">
              -{fmt(stats.total_prizes)}
            </p>
          </div>
          <div className="glass p-6 space-y-2 border-sutra-green/30">
            <span className="text-white/50 text-sm">Profit net</span>
            <p className="text-2xl font-orbitron font-bold text-sutra-green">{fmt(netProfit)}</p>
          </div>
        </div>

        {/* Summary bar */}
        <div className="glass p-6">
          <h4 className="font-orbitron text-sm text-white/60 mb-4">Répartition du CA</h4>
          <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
            {[
              {
                value: stats.revenue_starter,
                className: 'bg-gradient-to-r from-sutra-cyan to-sutra-green',
              },
              {
                value: stats.revenue_creator,
                className: 'bg-gradient-to-r from-sutra-violet to-sutra-blue',
              },
              {
                value: stats.revenue_empire,
                className: 'bg-gradient-to-r from-sutra-gold to-sutra-rose',
              },
            ].map((seg, i) => {
              const total =
                stats.revenue_starter + stats.revenue_creator + stats.revenue_empire;
              return (
                <div
                  key={i}
                  className={`${seg.className} transition-all duration-500`}
                  style={{ width: `${(seg.value / total) * 100}%` }}
                />
              );
            })}
          </div>
          <div className="flex items-center gap-6 mt-3 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sutra-cyan" /> Starter
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sutra-violet" /> Créateur
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sutra-gold" /> Empire
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  // ===================================================================
  // RENDER
  // ===================================================================
  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'users':
        return renderUsers();
      case 'referrals':
        return renderReferrals();
      case 'influencers':
        return renderInfluencers();
      case 'contests':
        return renderContests();
      case 'finances':
        return renderFinances();
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sutra-violet to-sutra-rose">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-orbitron font-bold gradient-text">
              SUTRA Admin
            </h1>
            <p className="text-white/40 text-sm">Super Admin Dashboard</p>
          </div>
        </div>
        <button
          onClick={() => {
            switch (activeTab) {
              case 'overview':
              case 'finances':
                fetchStats();
                break;
              case 'users':
                fetchUsers();
                break;
              case 'referrals':
                fetchReferrals();
                break;
              case 'influencers':
                fetchInfluencers();
                break;
              case 'contests':
                fetchContests();
                break;
            }
          }}
          className="btn-glow flex items-center gap-2 text-sm w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </motion.div>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-sutra-violet to-sutra-blue text-white shadow-lg shadow-sutra-violet/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <div key={activeTab}>{renderTab()}</div>
      </AnimatePresence>
    </div>
  );
}
