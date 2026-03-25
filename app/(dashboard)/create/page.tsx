'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, FileText, Mic, Palette, Music, Film, Sparkles,
  PlaySquare, Smartphone, MonitorPlay, Image, BookOpen, Headphones, Eye,
  ChevronRight, RefreshCw, Download, Share2, Edit3, Zap,
  Globe, Clock, LayoutGrid
} from 'lucide-react';

type VideoFormat = 'youtube' | 'short' | 'tiktok' | 'story' | 'pub' | 'docu' | 'podcast' | 'faceless';
type PipelineStep = 'idle' | 'script' | 'voice' | 'visuals' | 'music' | 'render' | 'done' | 'error';

interface ViralScore {
  hook: number;
  retention: number;
  cta: number;
  seo: number;
  total: number;
  suggestions: string[];
}

const FORMATS: { id: VideoFormat; name: string; desc: string; icon: React.ReactNode; ratio: string }[] = [
  { id: 'youtube', name: 'YouTube Long', desc: '8-15 min, 16:9', icon: <PlaySquare size={24} />, ratio: '16:9' },
  { id: 'short', name: 'Short / Reel', desc: '15-60s, 9:16', icon: <Smartphone size={24} />, ratio: '9:16' },
  { id: 'tiktok', name: 'TikTok', desc: '15-60s, 9:16', icon: <Zap size={24} />, ratio: '9:16' },
  { id: 'story', name: 'Story', desc: '15s, 9:16', icon: <Image size={24} />, ratio: '9:16' },
  { id: 'pub', name: 'Publicité', desc: '15-30s, multi', icon: <MonitorPlay size={24} />, ratio: '16:9' },
  { id: 'docu', name: 'Mini-Doc', desc: '5-10 min, 16:9', icon: <BookOpen size={24} />, ratio: '16:9' },
  { id: 'podcast', name: 'Podcast → Vidéo', desc: 'Variable, 16:9', icon: <Headphones size={24} />, ratio: '16:9' },
  { id: 'faceless', name: 'Mode Faceless', desc: '8-15 min, 16:9', icon: <Eye size={24} />, ratio: '16:9' },
];

const VOICE_STYLES = [
  { id: 'narrateur-pro', name: 'Narrateur Pro' },
  { id: 'energique', name: 'Énergique' },
  { id: 'calme', name: 'Calme' },
  { id: 'mysterieux', name: 'Mystérieux' },
  { id: 'humoristique', name: 'Humoristique' },
  { id: 'feminin', name: 'Féminin' },
  { id: 'clone', name: 'Ma Voix Clonée' },
];

const VISUAL_STYLES = [
  { id: 'cinematique', name: 'Cinématique' },
  { id: 'moderne', name: 'Moderne' },
  { id: 'vintage', name: 'Vintage' },
  { id: 'neon', name: 'Néon' },
  { id: 'nature', name: 'Nature' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'cartoon', name: 'Cartoon' },
  { id: 'minimaliste', name: 'Minimaliste' },
];

const PIPELINE_STEPS = [
  { key: 'script', label: 'Script', icon: FileText, sublabel: 'Claude AI' },
  { key: 'voice', label: 'Voix', icon: Mic, sublabel: 'ElevenLabs' },
  { key: 'visuals', label: 'Visuels', icon: Palette, sublabel: 'fal.ai + Pexels' },
  { key: 'music', label: 'Musique', icon: Music, sublabel: 'ElevenLabs' },
  { key: 'render', label: 'Montage', icon: Film, sublabel: 'Shotstack' },
];

const SUGGESTIONS = [
  'Les 5 habitudes des millionnaires',
  'Comment créer une app en 2024',
  "L'histoire secrète de l'Égypte ancienne",
  '10 astuces productivité que personne ne connaît',
  "L'IA va-t-elle remplacer les humains ?",
  'Les secrets du marketing digital',
];

export default function CreatePage() {
  const [format, setFormat] = useState<VideoFormat | null>(null);
  const [topic, setTopic] = useState('');
  const [voiceStyle, setVoiceStyle] = useState('narrateur-pro');
  const [visualStyle, setVisualStyle] = useState('cinematique');
  const [language, setLanguage] = useState('fr');
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>('idle');
  const [statusText, setStatusText] = useState('');
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [resultTitle, setResultTitle] = useState('');
  const [resultDescription, setResultDescription] = useState('');
  const [resultHashtags, setResultHashtags] = useState<string[]>([]);
  const [viralScore, setViralScore] = useState<ViralScore | null>(null);
  const [error, setError] = useState('');

  const canGenerate = format && topic.trim().length > 5;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;

    setError('');
    setPipelineStep('script');
    setStatusText('Génération du script en cours...');
    setResultVideo(null);

    try {
      const response = await fetch('/api/generate/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          format,
          voiceStyle,
          visualStyle,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error('Pipeline failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.step) setPipelineStep(data.step as PipelineStep);
              if (data.status) setStatusText(data.status);
              if (data.videoUrl) setResultVideo(data.videoUrl);
              if (data.title) setResultTitle(data.title);
              if (data.description) setResultDescription(data.description);
              if (data.hashtags) setResultHashtags(data.hashtags);
              if (data.viralScore) setViralScore(data.viralScore);
              if (data.error) throw new Error(data.error);
            } catch (e) {
              if (e instanceof Error && e.message !== 'Pipeline failed') {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      setPipelineStep('done');
      setStatusText('Vidéo prête !');
    } catch (err) {
      setPipelineStep('error');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      setStatusText('Erreur lors de la génération');
    }
  }, [canGenerate, topic, format, voiceStyle, visualStyle, language]);

  const getStepStatus = (stepKey: string): 'waiting' | 'active' | 'done' | 'error' => {
    const stepOrder = ['script', 'voice', 'visuals', 'music', 'render'];
    const currentIdx = stepOrder.indexOf(pipelineStep);
    const stepIdx = stepOrder.indexOf(stepKey);

    if (pipelineStep === 'error') return stepIdx <= currentIdx ? 'error' : 'waiting';
    if (pipelineStep === 'done') return 'done';
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'waiting';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-3 rounded-xl bg-gradient-to-br from-sutra-violet/20 to-sutra-blue/20 border border-sutra-violet/30">
          <Sparkles className="text-sutra-violet" size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-orbitron font-bold gradient-text">Créer une vidéo</h1>
          <p className="text-white/50 text-sm">L&apos;IA génère tout pour toi</p>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {pipelineStep === 'idle' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Step 1: Format Selection */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-sutra-violet/20 text-sutra-violet text-sm flex items-center justify-center font-bold">1</span>
                Choisis le format
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={`glass p-4 text-left transition-all duration-300 hover:bg-white/10 ${
                      format === f.id
                        ? 'border-sutra-violet/60 glow-violet bg-sutra-violet/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`mb-2 ${format === f.id ? 'text-sutra-violet' : 'text-white/50'}`}>
                      {f.icon}
                    </div>
                    <div className="font-semibold text-sm">{f.name}</div>
                    <div className="text-xs text-white/40 mt-1">{f.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Topic Input */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-sutra-blue/20 text-sutra-blue text-sm flex items-center justify-center font-bold">2</span>
                Décris ta vidéo
              </h2>
              <div className="glass p-1">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ex: Les 5 habitudes des millionnaires, Comment créer une app en 2024, L'histoire secrète de l'Égypte..."
                  className="w-full bg-transparent border-none outline-none text-white placeholder-white/30 p-4 min-h-[120px] resize-none text-lg"
                  maxLength={500}
                />
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="text-xs text-white/30">{topic.length}/500</div>
                </div>
              </div>
              {/* Suggestions */}
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTopic(s)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 hover:bg-sutra-violet/20 hover:border-sutra-violet/30 hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Options */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-sutra-cyan/20 text-sutra-cyan text-sm flex items-center justify-center font-bold">3</span>
                Options
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Voice Style */}
                <div className="glass p-4 space-y-2">
                  <label className="text-sm text-white/50 flex items-center gap-2">
                    <Mic size={14} /> Style de voix
                  </label>
                  <select
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-sutra-violet/50"
                  >
                    {VOICE_STYLES.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#1a1a2e]">{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Visual Style */}
                <div className="glass p-4 space-y-2">
                  <label className="text-sm text-white/50 flex items-center gap-2">
                    <Palette size={14} /> Style visuel
                  </label>
                  <select
                    value={visualStyle}
                    onChange={(e) => setVisualStyle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-sutra-violet/50"
                  >
                    {VISUAL_STYLES.map((v) => (
                      <option key={v.id} value={v.id} className="bg-[#1a1a2e]">{v.name}</option>
                    ))}
                  </select>
                </div>

                {/* Language */}
                <div className="glass p-4 space-y-2">
                  <label className="text-sm text-white/50 flex items-center gap-2">
                    <Globe size={14} /> Langue
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-sutra-violet/50"
                  >
                    <option value="fr" className="bg-[#1a1a2e]">Français</option>
                    <option value="en" className="bg-[#1a1a2e]">English</option>
                    <option value="es" className="bg-[#1a1a2e]">Español</option>
                    <option value="de" className="bg-[#1a1a2e]">Deutsch</option>
                    <option value="pt" className="bg-[#1a1a2e]">Português</option>
                    <option value="it" className="bg-[#1a1a2e]">Italiano</option>
                    <option value="ar" className="bg-[#1a1a2e]">العربية</option>
                    <option value="ja" className="bg-[#1a1a2e]">日本語</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <motion.div className="flex justify-center pt-4">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="btn-glow text-lg px-10 py-4 flex items-center gap-3 font-orbitron disabled:opacity-30"
              >
                <Rocket size={22} />
                Générer ma vidéo
                <ChevronRight size={18} />
              </button>
            </motion.div>

            {error && (
              <div className="glass border-red-500/30 bg-red-500/10 p-4 text-center text-red-400">
                {error}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="pipeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Pipeline Progress */}
            <div className="glass p-8">
              <div className="flex items-center justify-between mb-8">
                {PIPELINE_STEPS.map((step, idx) => {
                  const status = getStepStatus(step.key);
                  const Icon = step.icon;
                  return (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-500 ${
                            status === 'done'
                              ? 'bg-sutra-green/20 border border-sutra-green/50 text-sutra-green'
                              : status === 'active'
                              ? 'bg-sutra-violet/20 border border-sutra-violet/50 text-sutra-violet animate-pulse-glow'
                              : status === 'error'
                              ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                              : 'bg-white/5 border border-white/10 text-white/30'
                          }`}
                        >
                          <Icon size={24} />
                        </div>
                        <div className="mt-2 text-center">
                          <div className={`text-xs font-semibold ${status === 'active' ? 'text-sutra-violet' : status === 'done' ? 'text-sutra-green' : 'text-white/40'}`}>
                            {step.label}
                          </div>
                          <div className="text-[10px] text-white/30">{step.sublabel}</div>
                        </div>
                      </div>
                      {idx < PIPELINE_STEPS.length - 1 && (
                        <div className={`w-12 md:w-20 h-0.5 mx-2 mt-[-20px] transition-all duration-500 ${
                          getStepStatus(PIPELINE_STEPS[idx + 1].key) !== 'waiting'
                            ? 'bg-gradient-to-r from-sutra-violet to-sutra-blue'
                            : 'bg-white/10'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Text */}
              <div className="text-center">
                <p className={`text-lg ${pipelineStep === 'error' ? 'text-red-400' : pipelineStep === 'done' ? 'text-sutra-green' : 'text-white/70'}`}>
                  {statusText}
                </p>
                {pipelineStep !== 'done' && pipelineStep !== 'error' && (
                  <div className="mt-4 flex justify-center">
                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-sutra-violet to-sutra-cyan rounded-full"
                        animate={{ x: ['-100%', '100%'] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Result */}
            {pipelineStep === 'done' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Video Preview */}
                <div className="glass p-6">
                  <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
                    {resultVideo ? (
                      <video src={resultVideo} controls className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30">
                        <Film size={48} />
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold">{resultTitle || 'Vidéo sans titre'}</h2>
                    <p className="text-white/60 text-sm">{resultDescription}</p>
                    <div className="flex flex-wrap gap-2">
                      {resultHashtags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-sutra-violet/20 text-sutra-violet">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Viral Score */}
                {viralScore && (
                  <div className="glass p-6">
                    <h3 className="font-orbitron text-lg mb-4 flex items-center gap-2">
                      <Zap className="text-sutra-gold" size={20} />
                      Viral Score
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'Hook', score: viralScore.hook, max: 30, color: 'sutra-violet' },
                        { label: 'Rétention', score: viralScore.retention, max: 30, color: 'sutra-blue' },
                        { label: 'CTA', score: viralScore.cta, max: 20, color: 'sutra-cyan' },
                        { label: 'SEO', score: viralScore.seo, max: 20, color: 'sutra-green' },
                        { label: 'Total', score: viralScore.total, max: 100, color: 'sutra-gold' },
                      ].map((item) => (
                        <div key={item.label} className="text-center">
                          <div className={`text-2xl font-orbitron font-bold text-${item.color}`}>
                            {item.score}
                          </div>
                          <div className="text-xs text-white/40">/{item.max}</div>
                          <div className="text-sm text-white/60">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <a href="/editor" className="btn-glow flex items-center gap-2">
                    <Edit3 size={18} /> Modifier dans l&apos;éditeur
                  </a>
                  <button className="btn-glow-secondary flex items-center gap-2">
                    <Share2 size={18} /> Publier
                  </button>
                  <button className="btn-glow-secondary flex items-center gap-2">
                    <Download size={18} /> Télécharger
                  </button>
                  <button
                    onClick={() => { setPipelineStep('idle'); setResultVideo(null); }}
                    className="btn-glow-secondary flex items-center gap-2"
                  >
                    <RefreshCw size={18} /> Remix IA
                  </button>
                </div>
              </motion.div>
            )}

            {/* Error State */}
            {pipelineStep === 'error' && (
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleGenerate}
                  className="btn-glow flex items-center gap-2"
                >
                  <RefreshCw size={18} /> Réessayer
                </button>
                <button
                  onClick={() => setPipelineStep('idle')}
                  className="btn-glow-secondary flex items-center gap-2"
                >
                  Modifier les options
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
