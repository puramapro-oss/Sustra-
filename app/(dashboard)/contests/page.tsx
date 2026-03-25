'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Clock, Upload, Play, Award, Star,
  ChevronRight, X, CheckCircle, Film, PlaySquare,
  Smartphone, Calendar, Users, Eye, ThumbsUp,
  Crown, Medal
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Submission {
  id: string;
  video_id: string;
  video_title: string;
  video_thumbnail: string;
  category: 'youtube' | 'vertical';
  status: 'pending' | 'approved' | 'winner';
  votes: number;
  created_at: string;
}

interface PastWinner {
  id: string;
  user_name: string;
  user_avatar: string;
  video_title: string;
  video_thumbnail: string;
  category: 'youtube' | 'vertical';
  month: string;
  prize: string;
}

interface LibraryVideo {
  id: string;
  title: string;
  thumbnail_url: string;
  duration: number;
  created_at: string;
}

const CRITERIA = [
  { icon: <Eye size={18} />, label: 'Qualité visuelle', desc: 'Montage soigné, transitions fluides' },
  { icon: <ThumbsUp size={18} />, label: 'Engagement', desc: 'Hook puissant, rétention élevée' },
  { icon: <Star size={18} />, label: 'Créativité', desc: 'Concept original et innovant' },
  { icon: <Users size={18} />, label: 'Impact', desc: 'Message clair, valeur ajoutée' },
];

export default function ContestsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pastWinners, setPastWinners] = useState<PastWinner[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'youtube' | 'vertical'>('youtube');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );

  // Countdown to the 25th of the current/next month
  useEffect(() => {
    const calculateCountdown = () => {
      const now = new Date();
      let target = new Date(now.getFullYear(), now.getMonth(), 25, 23, 59, 59);
      if (now > target) {
        target = new Date(now.getFullYear(), now.getMonth() + 1, 25, 23, 59, 59);
      }
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };

    setCountdown(calculateCountdown());
    const timer = setInterval(() => setCountdown(calculateCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [subsRes, winnersRes, libraryRes] = await Promise.all([
        fetch('/api/contests/submissions', { headers }),
        fetch('/api/contests/winners', { headers }),
        fetch('/api/library/videos', { headers }),
      ]);

      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (winnersRes.ok) setPastWinners(await winnersRes.json());
      if (libraryRes.ok) {
        const data = await libraryRes.json();
        setLibraryVideos(Array.isArray(data) ? data : data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch contest data:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async () => {
    if (!selectedVideo) return;
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/contests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          video_id: selectedVideo,
          category: selectedCategory,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowSubmitModal(false);
          setSubmitSuccess(false);
          setSelectedVideo('');
          fetchData();
        }, 2000);
      }
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const CountdownUnit = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="glass px-4 py-3 min-w-[70px] text-center">
        <span className="text-3xl font-bold font-orbitron gradient-text">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-xs text-white/50 mt-2 uppercase tracking-wider">{label}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-3">
          <Trophy className="text-yellow-400" size={32} />
          <h1 className="text-4xl font-bold font-orbitron gradient-text">SUTRA Awards</h1>
          <Trophy className="text-yellow-400" size={32} />
        </div>
        <p className="text-white/60 max-w-2xl mx-auto">
          Soumets ta meilleure vidéo chaque mois et remporte des prix exclusifs.
          Les gagnants sont annoncés le 25 de chaque mois.
        </p>
      </motion.div>

      {/* Countdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-8 text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-2 text-white/70">
          <Clock size={20} />
          <span className="text-sm uppercase tracking-widest">Temps restant</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <CountdownUnit value={countdown.days} label="Jours" />
          <span className="text-2xl font-bold text-white/30 mt-[-20px]">:</span>
          <CountdownUnit value={countdown.hours} label="Heures" />
          <span className="text-2xl font-bold text-white/30 mt-[-20px]">:</span>
          <CountdownUnit value={countdown.minutes} label="Min" />
          <span className="text-2xl font-bold text-white/30 mt-[-20px]">:</span>
          <CountdownUnit value={countdown.seconds} label="Sec" />
        </div>
        <button
          onClick={() => setShowSubmitModal(true)}
          className="btn-glow mt-4 inline-flex items-center gap-2"
        >
          <Upload size={18} />
          Soumettre une vidéo
        </button>
      </motion.div>

      {/* Criteria */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold font-orbitron text-white/90">Critères de jugement</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CRITERIA.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-hover p-5 space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                {c.icon}
              </div>
              <h3 className="font-semibold text-white/90">{c.label}</h3>
              <p className="text-sm text-white/50">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Current Submissions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-bold font-orbitron text-white/90">Mes soumissions</h2>
        {submissions.length === 0 ? (
          <div className="glass p-12 text-center space-y-3">
            <Film className="mx-auto text-white/20" size={48} />
            <p className="text-white/50">Aucune soumission ce mois-ci</p>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="btn-glow inline-flex items-center gap-2 text-sm"
            >
              <Upload size={16} />
              Soumettre ma première vidéo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {submissions.map((sub, i) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-hover overflow-hidden"
              >
                <div className="relative aspect-video bg-white/5">
                  {sub.video_thumbnail ? (
                    <img src={sub.video_thumbnail} alt={sub.video_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="text-white/20" size={40} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      sub.status === 'winner' ? 'bg-yellow-500/20 text-yellow-400' :
                      sub.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                      'bg-white/10 text-white/60'
                    }`}>
                      {sub.status === 'winner' ? 'Gagnant' : sub.status === 'approved' ? 'Approuvé' : 'En attente'}
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-violet-500/20 text-violet-400 flex items-center gap-1">
                      {sub.category === 'youtube' ? <PlaySquare size={12} /> : <Smartphone size={12} />}
                      {sub.category === 'youtube' ? 'YouTube' : 'Vertical'}
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-white/90 truncate">{sub.video_title}</h3>
                  <div className="flex items-center justify-between text-sm text-white/50">
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={14} /> {sub.votes} votes
                    </span>
                    <span>{new Date(sub.created_at).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Hall of Fame */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-3">
          <Crown className="text-yellow-400" size={24} />
          <h2 className="text-xl font-bold font-orbitron text-white/90">Hall of Fame</h2>
        </div>
        {pastWinners.length === 0 ? (
          <div className="glass p-12 text-center space-y-3">
            <Award className="mx-auto text-yellow-400/30" size={48} />
            <p className="text-white/50">Le Hall of Fame sera bientôt rempli de légendes...</p>
            <p className="text-white/30 text-sm">Sois le premier gagnant !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastWinners.map((winner, i) => (
              <motion.div
                key={winner.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="glass-hover overflow-hidden relative"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-400" />
                <div className="relative aspect-video bg-white/5">
                  {winner.video_thumbnail ? (
                    <img src={winner.video_thumbnail} alt={winner.video_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Trophy className="text-yellow-400/30" size={40} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded-lg text-xs font-bold bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Medal size={12} /> Winner
                    </span>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-white/90 truncate">{winner.video_title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {winner.user_avatar ? (
                        <img src={winner.user_avatar} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-violet-500/30 flex items-center justify-center text-xs text-violet-300">
                          {winner.user_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-sm text-white/70">{winner.user_name}</span>
                    </div>
                    <span className="text-xs text-white/40">{winner.month}</span>
                  </div>
                  <div className="text-sm font-semibold text-yellow-400">{winner.prize}</div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Submit Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowSubmitModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass p-6 max-w-lg w-full space-y-6"
              onClick={(e) => e.stopPropagation()}
            >
              {submitSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                  >
                    <CheckCircle className="mx-auto text-green-400" size={48} />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white">Soumission envoyée !</h3>
                  <p className="text-white/60">Ta vidéo est en cours de validation.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold font-orbitron text-white">Soumettre une vidéo</h3>
                    <button onClick={() => setShowSubmitModal(false)} className="text-white/40 hover:text-white">
                      <X size={20} />
                    </button>
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Catégorie</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setSelectedCategory('youtube')}
                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                          selectedCategory === 'youtube'
                            ? 'border-violet-500/50 bg-violet-500/10 shadow-lg shadow-violet-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <PlaySquare size={24} className={selectedCategory === 'youtube' ? 'text-violet-400' : 'text-white/40'} />
                        <span className={`text-sm font-medium ${selectedCategory === 'youtube' ? 'text-white' : 'text-white/60'}`}>
                          YouTube (16:9)
                        </span>
                      </button>
                      <button
                        onClick={() => setSelectedCategory('vertical')}
                        className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                          selectedCategory === 'vertical'
                            ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                            : 'border-white/10 bg-white/5 hover:border-white/20'
                        }`}
                      >
                        <Smartphone size={24} className={selectedCategory === 'vertical' ? 'text-cyan-400' : 'text-white/40'} />
                        <span className={`text-sm font-medium ${selectedCategory === 'vertical' ? 'text-white' : 'text-white/60'}`}>
                          Vertical (9:16)
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Video Selection from Library */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Sélectionner depuis ta bibliothèque</label>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {libraryVideos.length === 0 ? (
                        <div className="text-center py-6 text-white/40 text-sm">
                          Aucune vidéo dans ta bibliothèque
                        </div>
                      ) : (
                        libraryVideos.map((video) => (
                          <button
                            key={video.id}
                            onClick={() => setSelectedVideo(video.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              selectedVideo === video.id
                                ? 'border-violet-500/50 bg-violet-500/10'
                                : 'border-white/10 bg-white/5 hover:border-white/20'
                            }`}
                          >
                            <div className="w-16 h-10 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                              {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film size={16} className="text-white/20" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white/90 truncate">{video.title}</p>
                              <p className="text-xs text-white/40">
                                {new Date(video.created_at).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            {selectedVideo === video.id && (
                              <CheckCircle size={18} className="text-violet-400 flex-shrink-0" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleSubmit}
                    disabled={!selectedVideo || submitting}
                    className="btn-glow w-full flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        <Upload size={18} />
                        Soumettre
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
