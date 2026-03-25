'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointerClick, UserPlus, CreditCard, Wallet,
  Copy, Check, Share2, ExternalLink, TrendingUp,
  Calendar, RefreshCw, Download,
  Link2, PlaySquare, Camera, ChevronLeft, ChevronRight,
  Banknote, Building2, AlertCircle, Landmark, Shield,
  BarChart3, DollarSign, FileText
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InfluencerProfile {
  id: string;
  user_id: string;
  display_name: string;
  platform: string;
  channel_url: string;
  custom_link_slug: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface Contract {
  id: string;
  start_date: string;
  end_date: string;
  commission_rate: number;
  status: string;
}

interface Stats {
  profile: InfluencerProfile;
  total_clicks: number;
  total_signups: number;
  total_subscriptions: number;
  total_earnings: number;
  pending_earnings: number;
  contract: Contract | null;
}

interface ChartDataPoint {
  date: string;
  clicks: number;
}

interface Conversion {
  id: string;
  type: 'signup' | 'subscription';
  plan: string | null;
  amount: number;
  commission: number;
  status: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  method: string;
  created_at: string;
  processed_at: string | null;
}

interface EarningsData {
  available_balance: number;
  total_earned: number;
  total_withdrawn: number;
  pending_withdrawals: number;
  withdrawals: Withdrawal[];
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function InfluencerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [convPage, setConvPage] = useState(1);
  const [convTotalPages, setConvTotalPages] = useState(1);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'stripe_connect' | 'bank_transfer'>('bank_transfer');
  const [savingBank, setSavingBank] = useState(false);
  const [bankSaved, setBankSaved] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [bankError, setBankError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }, [supabase]);

  const fetchStats = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/influencer/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [getToken]);

  const fetchClicks = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/influencer/clicks?days=7', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChartData(data.chart_data || []);
      }
    } catch (err) {
      console.error('Failed to fetch clicks:', err);
    }
  }, [getToken]);

  const fetchConversions = useCallback(async (page = 1) => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`/api/influencer/conversions?page=${page}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversions(data.conversions || []);
        setConvTotalPages(data.pagination?.total_pages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch conversions:', err);
    }
  }, [getToken]);

  const fetchEarnings = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/influencer/earnings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEarningsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    }
  }, [getToken]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchClicks(),
        fetchConversions(1),
        fetchEarnings(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchClicks, fetchConversions, fetchEarnings]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const copyLink = () => {
    if (!stats?.profile?.custom_link_slug) return;
    navigator.clipboard.writeText(`https://sutra.purama.app/go/${stats.profile.custom_link_slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = (platform: string) => {
    if (!stats?.profile?.custom_link_slug) return;
    const url = encodeURIComponent(`https://sutra.purama.app/go/${stats.profile.custom_link_slug}`);
    const text = encodeURIComponent('Rejoins SUTRA et cree du contenu incroyable !');
    const urls: Record<string, string> = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
    };
    if (urls[platform]) window.open(urls[platform], '_blank');
  };

  const saveBankDetails = async () => {
    setSavingBank(true);
    setBankError('');
    setBankSaved(false);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/influencer/bank', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iban, bic, payout_method: payoutMethod }),
      });
      const data = await res.json();
      if (res.ok) {
        setBankSaved(true);
        setTimeout(() => setBankSaved(false), 3000);
      } else {
        setBankError(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      setBankError('Erreur reseau');
    } finally {
      setSavingBank(false);
    }
  };

  const requestWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 5) {
      setWithdrawError('Montant minimum : 5€');
      return;
    }
    setWithdrawing(true);
    setWithdrawError('');
    setWithdrawSuccess(false);
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch('/api/influencer/earnings', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok) {
        setWithdrawSuccess(true);
        setWithdrawAmount('');
        fetchEarnings();
        setTimeout(() => setWithdrawSuccess(false), 3000);
      } else {
        setWithdrawError(data.error || 'Erreur lors du retrait');
      }
    } catch {
      setWithdrawError('Erreur reseau');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleConvPageChange = (page: number) => {
    setConvPage(page);
    fetchConversions(page);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const maxClicks = Math.max(...chartData.map(d => d.clicks), 1);

  // ─── Loading State ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw className="w-8 h-8 text-purple-400" />
        </motion.div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* ──────── Header ──────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-orbitron font-bold">
            <span className="gradient-text">SUTRA Partner</span>
          </h1>
          <p className="text-white/60 mt-1">
            {stats?.profile?.display_name || 'Influenceur'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              stats?.profile?.status === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {stats?.profile?.status === 'active' ? 'Actif' : 'Inactif'}
          </span>
          {stats?.profile?.platform && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 glass rounded-full text-sm text-white/70">
              {stats.profile.platform === 'youtube' && <PlaySquare size={14} />}
              {stats.profile.platform === 'instagram' && <Camera size={14} />}
              {stats.profile.platform === 'tiktok' && <PlaySquare size={14} />}
              {stats.profile.platform}
            </span>
          )}
        </div>
      </motion.div>

      {/* ──────── Stats Row ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            label: 'Total clics',
            value: stats?.total_clicks || 0,
            icon: <MousePointerClick size={20} />,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            label: 'Inscriptions generees',
            value: stats?.total_signups || 0,
            icon: <UserPlus size={20} />,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
          },
          {
            label: 'Abonnements generes',
            value: stats?.total_subscriptions || 0,
            icon: <CreditCard size={20} />,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
          },
          {
            label: 'Gains totaux',
            value: `${(stats?.total_earnings || 0).toFixed(2)}€`,
            icon: <Wallet size={20} />,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="glass glass-hover p-5 rounded-2xl"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/50 text-sm">{stat.label}</span>
              <div className={`p-2 rounded-xl ${stat.bg}`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
            </div>
            <p className="text-2xl font-orbitron font-bold text-white">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ──────── Link Section ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <Link2 size={20} className="text-purple-400" />
          <h2 className="text-lg font-orbitron font-semibold text-white">
            Votre lien partenaire
          </h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-purple-300 overflow-x-auto">
            sutra.purama.app/go/{stats?.profile?.custom_link_slug || '...'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="btn-glow px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copie !
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copier
                </>
              )}
            </button>
            <button
              onClick={() => shareLink('twitter')}
              className="p-3 glass glass-hover rounded-xl text-white/60 hover:text-white transition-colors"
              title="Partager sur Twitter"
            >
              <Share2 size={16} />
            </button>
            <button
              onClick={() => shareLink('whatsapp')}
              className="p-3 glass glass-hover rounded-xl text-white/60 hover:text-white transition-colors"
              title="Partager sur WhatsApp"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ──────── Performance Chart ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-400" />
            <h2 className="text-lg font-orbitron font-semibold text-white">
              Performance — 7 derniers jours
            </h2>
          </div>
          <span className="text-sm text-white/40">
            {chartData.reduce((sum, d) => sum + d.clicks, 0)} clics total
          </span>
        </div>
        <div className="flex items-end gap-2 h-48">
          {chartData.map((d, i) => {
            const height = maxClicks > 0 ? (d.clicks / maxClicks) * 100 : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs text-white/50">{d.clicks}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, 4)}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-lg bg-gradient-to-t from-purple-600/80 to-blue-500/80 min-h-[4px] relative group cursor-pointer"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm rounded px-2 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    {d.clicks} clics
                  </div>
                </motion.div>
                <span className="text-[10px] text-white/40">
                  {formatShortDate(d.date)}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ──────── Conversions Table ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-emerald-400" />
          <h2 className="text-lg font-orbitron font-semibold text-white">
            Conversions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/40 border-b border-white/10">
                <th className="text-left py-3 px-2 font-medium">Date</th>
                <th className="text-left py-3 px-2 font-medium">Type</th>
                <th className="text-left py-3 px-2 font-medium">Plan</th>
                <th className="text-right py-3 px-2 font-medium">Montant</th>
                <th className="text-right py-3 px-2 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {conversions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-white/30">
                    Aucune conversion pour le moment
                  </td>
                </tr>
              ) : (
                conversions.map((conv) => (
                  <tr
                    key={conv.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-2 text-white/70">
                      {formatDate(conv.created_at)}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          conv.type === 'signup'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}
                      >
                        {conv.type === 'signup' ? 'Inscription' : 'Abonnement'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-white/70">
                      {conv.plan || '-'}
                    </td>
                    <td className="py-3 px-2 text-right text-white/70">
                      {conv.amount?.toFixed(2) || '0.00'}€
                    </td>
                    <td className="py-3 px-2 text-right text-emerald-400 font-medium">
                      +{conv.commission?.toFixed(2) || '0.00'}€
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {convTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-white/10">
            <button
              onClick={() => handleConvPageChange(convPage - 1)}
              disabled={convPage <= 1}
              className="p-2 glass rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white/60 px-3">
              Page {convPage} / {convTotalPages}
            </span>
            <button
              onClick={() => handleConvPageChange(convPage + 1)}
              disabled={convPage >= convTotalPages}
              className="p-2 glass rounded-lg disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.div>

      {/* ──────── Earnings Section ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <DollarSign size={20} className="text-amber-400" />
          <h2 className="text-lg font-orbitron font-semibold text-white">
            Revenus et contrat
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/40 text-sm mb-1">Periode du contrat</p>
            <p className="text-white font-medium">
              {stats?.contract
                ? `${formatDate(stats.contract.start_date)} — ${formatDate(stats.contract.end_date)}`
                : 'Aucun contrat actif'}
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/40 text-sm mb-1">Taux de commission</p>
            <p className="text-white font-medium text-xl">
              {stats?.contract?.commission_rate || 20}%
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/40 text-sm mb-1">Gains en attente</p>
            <p className="text-amber-400 font-medium text-xl">
              {(stats?.pending_earnings || 0).toFixed(2)}€
            </p>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/40 text-sm mb-1">Prochain versement</p>
            <p className="text-white font-medium flex items-center gap-1.5">
              <Calendar size={14} className="text-purple-400" />
              {stats?.contract?.end_date
                ? formatDate(stats.contract.end_date)
                : '-'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ──────── Bank Details Form ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Landmark size={20} className="text-blue-400" />
          <h2 className="text-lg font-orbitron font-semibold text-white">
            Coordonnees bancaires
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-white/50 mb-1.5">IBAN</label>
            <input
              type="text"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-colors font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-white/50 mb-1.5">BIC / SWIFT</label>
            <input
              type="text"
              value={bic}
              onChange={(e) => setBic(e.target.value)}
              placeholder="BNPAFRPP"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-colors font-mono text-sm"
            />
          </div>
        </div>
        {/* Payout method toggle */}
        <div className="mb-5">
          <label className="block text-sm text-white/50 mb-2">Methode de versement</label>
          <div className="flex gap-3">
            <button
              onClick={() => setPayoutMethod('bank_transfer')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                payoutMethod === 'bank_transfer'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'glass text-white/50 hover:text-white/70'
              }`}
            >
              <Building2 size={16} />
              Virement bancaire
            </button>
            <button
              onClick={() => setPayoutMethod('stripe_connect')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                payoutMethod === 'stripe_connect'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                  : 'glass text-white/50 hover:text-white/70'
              }`}
            >
              <CreditCard size={16} />
              Stripe Connect
            </button>
          </div>
        </div>
        <AnimatePresence>
          {bankError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm mb-3"
            >
              <AlertCircle size={14} />
              {bankError}
            </motion.div>
          )}
          {bankSaved && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-emerald-400 text-sm mb-3"
            >
              <Check size={14} />
              Coordonnees sauvegardees avec succes !
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={saveBankDetails}
          disabled={savingBank || !iban || !bic}
          className="btn-glow px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {savingBank ? (
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw size={16} />
            </motion.div>
          ) : (
            <Shield size={16} />
          )}
          Sauvegarder
        </button>
      </motion.div>

      {/* ──────── Withdrawal Section ──────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass rounded-2xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Banknote size={20} className="text-emerald-400" />
          <h2 className="text-lg font-orbitron font-semibold text-white">
            Retrait de fonds
          </h2>
        </div>

        {/* Balance display */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-5">
          <p className="text-white/40 text-sm mb-1">Solde disponible</p>
          <p className="text-3xl font-orbitron font-bold gradient-text">
            {(earningsData?.available_balance || 0).toFixed(2)}€
          </p>
          <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
            <span>Total gagne : {(earningsData?.total_earned || 0).toFixed(2)}€</span>
            <span>Retire : {(earningsData?.total_withdrawn || 0).toFixed(2)}€</span>
            <span>En attente : {(earningsData?.pending_withdrawals || 0).toFixed(2)}€</span>
          </div>
        </div>

        {/* Withdrawal form */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="number"
              min="5"
              step="0.01"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="Montant (min. 5€)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-colors pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">€</span>
          </div>
          <button
            onClick={requestWithdrawal}
            disabled={withdrawing || !withdrawAmount}
            className="btn-glow px-6 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {withdrawing ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <RefreshCw size={16} />
              </motion.div>
            ) : (
              <Download size={16} />
            )}
            Retirer
          </button>
        </div>
        <AnimatePresence>
          {withdrawError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-red-400 text-sm mb-3"
            >
              <AlertCircle size={14} />
              {withdrawError}
            </motion.div>
          )}
          {withdrawSuccess && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 text-emerald-400 text-sm mb-3"
            >
              <Check size={14} />
              Demande de retrait envoyee avec succes !
            </motion.div>
          )}
        </AnimatePresence>

        {/* Withdrawal history */}
        {earningsData?.withdrawals && earningsData.withdrawals.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10">
            <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
              <FileText size={14} />
              Historique des retraits
            </h3>
            <div className="space-y-2">
              {earningsData.withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/50">{formatDate(w.created_at)}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        w.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : w.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {w.status === 'completed'
                        ? 'Termine'
                        : w.status === 'pending'
                        ? 'En attente'
                        : w.status}
                    </span>
                    <span className="text-white/40 text-xs">
                      {w.method === 'stripe_connect' ? 'Stripe' : 'Virement'}
                    </span>
                  </div>
                  <span className="text-white font-medium">
                    {w.amount.toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
