'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Copy, Share2, Gift, Trophy, Wallet,
  ArrowUpRight, ArrowDownRight, CheckCircle, Clock,
  Star, Target, ChevronRight, X, ExternalLink,
  DollarSign, TrendingUp, Link2
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Referral {
  id: string;
  referred_user_id: string;
  status: 'pending' | 'active' | 'cancelled';
  commission_earned: number;
  created_at: string;
  referred_profile: {
    full_name: string | null;
    plan: string | null;
    subscription_status: string | null;
  } | null;
}

interface ReferralStats {
  referral_code: string;
  referral_count: number;
  wallet_balance: number;
  wallet_total_earned: number;
  referrals: Referral[];
  active_count: number;
  pending_count: number;
  monthly_revenue: number;
}

interface Milestone {
  count: number;
  reward: number;
  label: string;
  icon: React.ReactNode;
}

const MILESTONES: Milestone[] = [
  { count: 10, reward: 111, label: 'Starter', icon: <Star size={16} /> },
  { count: 20, reward: 222, label: 'Builder', icon: <Star size={16} /> },
  { count: 30, reward: 333, label: 'Leader', icon: <Trophy size={16} /> },
  { count: 50, reward: 555, label: 'Champion', icon: <Trophy size={16} /> },
  { count: 100, reward: 2000, label: 'Legend', icon: <Gift size={16} /> },
  { count: 1000, reward: 11100, label: 'Galactic', icon: <Gift size={16} /> },
];

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawIban, setWithdrawIban] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/referrals/stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const referralLink = stats?.referral_code
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${stats.referral_code}`
    : '';

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'Rejoins SUTRA by Purama',
        text: 'Crée des vidéos virales avec l\'IA ! Utilise mon lien pour un bonus exclusif.',
        url: referralLink,
      });
    } else {
      handleCopy(referralLink);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawIban) return;
    setWithdrawing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          iban: withdrawIban,
        }),
      });

      if (res.ok) {
        setWithdrawSuccess(true);
        setTimeout(() => {
          setShowWithdraw(false);
          setWithdrawSuccess(false);
          setWithdrawAmount('');
          setWithdrawIban('');
          fetchStats();
        }, 2000);
      }
    } catch (err) {
      console.error('Withdraw failed:', err);
    } finally {
      setWithdrawing(false);
    }
  };

  const currentMilestoneIndex = MILESTONES.findIndex(
    (m) => (stats?.referral_count ?? 0) < m.count
  );
  const nextMilestone = currentMilestoneIndex >= 0 ? MILESTONES[currentMilestoneIndex] : null;
  const prevMilestoneCount = currentMilestoneIndex > 0 ? MILESTONES[currentMilestoneIndex - 1].count : 0;
  const progressPercent = nextMilestone
    ? ((stats?.referral_count ?? 0) - prevMilestoneCount) / (nextMilestone.count - prevMilestoneCount) * 100
    : 100;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-sutra-violet border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="font-orbitron text-3xl md:text-4xl font-bold gradient-text">
          SUTRA Family
        </h1>
        <p className="text-white/60 text-lg">
          Parraine tes amis et gagne des commissions sur chaque abonnement.
        </p>
      </motion.div>

      {/* Referral Code & Share */}
      <motion.div variants={itemVariants} className="glass p-6 space-y-4">
        <h2 className="font-orbitron text-lg font-semibold text-white flex items-center gap-2">
          <Link2 className="text-sutra-violet" size={20} />
          Ton lien de parrainage
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Code */}
          <div className="flex-1 flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <span className="font-mono text-sutra-cyan text-lg tracking-wider flex-1 truncate">
              {stats?.referral_code || '---'}
            </span>
            <button
              onClick={() => handleCopy(stats?.referral_code || '')}
              className="text-white/60 hover:text-sutra-violet transition-colors"
            >
              {copied ? <CheckCircle size={20} className="text-sutra-green" /> : <Copy size={20} />}
            </button>
          </div>

          {/* Share Buttons */}
          <button onClick={() => handleCopy(referralLink)} className="btn-glow flex items-center justify-center gap-2">
            <Copy size={16} />
            Copier le lien
          </button>
          <button onClick={handleShare} className="btn-glow-secondary flex items-center justify-center gap-2">
            <Share2 size={16} />
            Partager
          </button>
        </div>

        {/* Link preview */}
        <div className="text-xs text-white/30 truncate">
          {referralLink}
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Filleuls actifs',
            value: stats?.active_count ?? 0,
            icon: <Users size={20} />,
            color: 'text-sutra-violet',
            bg: 'from-sutra-violet/20',
          },
          {
            label: 'En attente',
            value: stats?.pending_count ?? 0,
            icon: <Clock size={20} />,
            color: 'text-sutra-gold',
            bg: 'from-sutra-gold/20',
          },
          {
            label: 'Revenu total',
            value: `${(stats?.wallet_total_earned ?? 0).toFixed(2)}€`,
            icon: <TrendingUp size={20} />,
            color: 'text-sutra-green',
            bg: 'from-sutra-green/20',
          },
          {
            label: 'Ce mois',
            value: `${(stats?.monthly_revenue ?? 0).toFixed(2)}€`,
            icon: <DollarSign size={20} />,
            color: 'text-sutra-cyan',
            bg: 'from-sutra-cyan/20',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-hover p-4 space-y-2"
          >
            <div className={`${stat.color} flex items-center gap-2 text-sm`}>
              {stat.icon}
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </motion.div>

      {/* Milestone Progress */}
      <motion.div variants={itemVariants} className="glass p-6 space-y-6">
        <h2 className="font-orbitron text-lg font-semibold text-white flex items-center gap-2">
          <Target className="text-sutra-violet" size={20} />
          Paliers de bonus
        </h2>

        {/* Progress bar */}
        {nextMilestone && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">
                {stats?.referral_count ?? 0} / {nextMilestone.count} filleuls
              </span>
              <span className="text-sutra-violet font-semibold">
                Prochain bonus : {nextMilestone.reward}€
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-sutra-violet to-sutra-cyan rounded-full"
              />
            </div>
          </div>
        )}

        {/* Milestone cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {MILESTONES.map((milestone) => {
            const achieved = (stats?.referral_count ?? 0) >= milestone.count;
            return (
              <div
                key={milestone.count}
                className={`relative p-4 rounded-xl border text-center space-y-2 transition-all ${
                  achieved
                    ? 'bg-sutra-violet/10 border-sutra-violet/50 shadow-lg shadow-sutra-violet/20'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                {achieved && (
                  <div className="absolute -top-2 -right-2">
                    <CheckCircle size={16} className="text-sutra-green" />
                  </div>
                )}
                <div className={`text-2xl font-bold ${achieved ? 'text-sutra-violet' : 'text-white/40'}`}>
                  {milestone.count}
                </div>
                <div className={`text-xs ${achieved ? 'text-white/80' : 'text-white/40'}`}>
                  {milestone.label}
                </div>
                <div className={`text-lg font-semibold ${achieved ? 'text-sutra-green' : 'text-white/30'}`}>
                  {milestone.reward}€
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Wallet + Withdraw */}
      <motion.div variants={itemVariants} className="glass p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-orbitron text-lg font-semibold text-white flex items-center gap-2">
            <Wallet className="text-sutra-cyan" size={20} />
            Portefeuille
          </h2>
          <button
            onClick={() => setShowWithdraw(true)}
            className="btn-glow text-sm !px-4 !py-2"
            disabled={!stats?.wallet_balance || stats.wallet_balance < 10}
          >
            <ArrowUpRight size={14} className="inline mr-1" />
            Retirer
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-sm text-white/60 mb-1">Solde disponible</div>
            <div className="text-3xl font-bold text-sutra-green">
              {(stats?.wallet_balance ?? 0).toFixed(2)}€
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="text-sm text-white/60 mb-1">Total gagné</div>
            <div className="text-3xl font-bold text-white">
              {(stats?.wallet_total_earned ?? 0).toFixed(2)}€
            </div>
          </div>
        </div>

        <p className="text-xs text-white/30">
          Retrait minimum : 10€. Virement sous 3-5 jours ouvrés.
        </p>
      </motion.div>

      {/* Referral List */}
      <motion.div variants={itemVariants} className="glass p-6 space-y-4">
        <h2 className="font-orbitron text-lg font-semibold text-white flex items-center gap-2">
          <Users className="text-sutra-blue" size={20} />
          Tes filleuls ({stats?.referrals?.length ?? 0})
        </h2>

        {!stats?.referrals?.length ? (
          <div className="text-center py-12 text-white/40 space-y-2">
            <Users size={48} className="mx-auto opacity-30" />
            <p>Aucun filleul pour le moment.</p>
            <p className="text-sm">Partage ton lien pour commencer a gagner !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    referral.status === 'active'
                      ? 'bg-sutra-green/20 text-sutra-green'
                      : referral.status === 'pending'
                      ? 'bg-sutra-gold/20 text-sutra-gold'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {(referral.referred_profile?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">
                      {referral.referred_profile?.full_name || 'Utilisateur'}
                    </div>
                    <div className="text-xs text-white/40">
                      {new Date(referral.created_at).toLocaleDateString('fr-FR')} · {referral.referred_profile?.plan || 'Free'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    referral.status === 'active'
                      ? 'bg-sutra-green/20 text-sutra-green'
                      : referral.status === 'pending'
                      ? 'bg-sutra-gold/20 text-sutra-gold'
                      : 'bg-white/10 text-white/40'
                  }`}>
                    {referral.status === 'active' ? 'Actif' : referral.status === 'pending' ? 'En attente' : 'Annulé'}
                  </span>
                  <span className="text-sm font-semibold text-sutra-green">
                    +{referral.commission_earned.toFixed(2)}€
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setShowWithdraw(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass p-6 max-w-md w-full space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-orbitron text-xl font-bold text-white">Retrait</h3>
                <button onClick={() => setShowWithdraw(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              {withdrawSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <CheckCircle size={48} className="text-sutra-green mx-auto" />
                  <p className="text-sutra-green font-semibold">Demande envoyée !</p>
                  <p className="text-sm text-white/60">Virement sous 3-5 jours ouvrés.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <div className="text-sm text-white/60">Solde disponible</div>
                    <div className="text-2xl font-bold text-sutra-green">
                      {(stats?.wallet_balance ?? 0).toFixed(2)}€
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60 mb-1">Montant (min. 10€)</label>
                      <input
                        type="number"
                        min={10}
                        max={stats?.wallet_balance ?? 0}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="50.00"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-sutra-violet/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60 mb-1">IBAN</label>
                      <input
                        type="text"
                        value={withdrawIban}
                        onChange={(e) => setWithdrawIban(e.target.value)}
                        placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:border-sutra-violet/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount || !withdrawIban || parseFloat(withdrawAmount) < 10}
                    className="btn-glow w-full flex items-center justify-center gap-2"
                  >
                    {withdrawing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <ArrowUpRight size={16} />
                        Demander le retrait
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
