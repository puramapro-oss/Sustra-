'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scissors, Upload, Link2, Play, Download, Zap,
  Clock, Settings, ChevronDown, ChevronUp, Film,
  Sparkles, TrendingUp, BarChart3, RefreshCw,
  CheckCircle, AlertCircle, Loader2, X, Copy,
  Subtitles, Palette
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface ShortResult {
  id: string;
  title: string;
  thumbnail_url: string;
  video_url: string;
  duration: number;
  viral_score: number;
  hook: string;
  status: 'rendering' | 'ready' | 'failed';
}

interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 45, label: '45s' },
  { value: 60, label: '60s' },
];

const SUBTITLE_STYLES = [
  { value: 'bold', label: 'Bold Center', preview: 'Gras centré' },
  { value: 'karaoke', label: 'Karaoke', preview: 'Mot par mot' },
  { value: 'minimal', label: 'Minimal', preview: 'Discret' },
  { value: 'none', label: 'Aucun', preview: 'Sans sous-titres' },
];

export default function ShortsPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [numShorts, setNumShorts] = useState(5);
  const [duration, setDuration] = useState(30);
  const [subtitleStyle, setSubtitleStyle] = useState('bold');
  const [generating, setGenerating] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineStep[]>([]);
  const [results, setResults] = useState<ShortResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setUploadedFile(file);
      setYoutubeUrl('');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setYoutubeUrl('');
    }
  };

  const handleGenerate = async () => {
    if (!youtubeUrl && !uploadedFile) return;
    setGenerating(true);
    setError(null);
    setResults([]);

    const initialPipeline: PipelineStep[] = [
      { id: 'download', label: 'Téléchargement vidéo', status: 'pending' },
      { id: 'transcribe', label: 'Transcription audio', status: 'pending' },
      { id: 'analyze', label: 'Analyse IA des moments viraux', status: 'pending' },
      { id: 'render', label: 'Rendu des shorts', status: 'pending' },
    ];
    setPipeline(initialPipeline);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const body: Record<string, unknown> = {
        num_shorts: numShorts,
        duration,
        subtitle_style: subtitleStyle,
      };

      if (youtubeUrl) {
        body.youtube_url = youtubeUrl;
      } else if (uploadedFile) {
        // Upload file first
        const formData = new FormData();
        formData.append('file', uploadedFile);
        const uploadRes = await fetch('/api/shorts/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        });
        if (!uploadRes.ok) throw new Error('Échec de l\'upload');
        const uploadData = await uploadRes.json();
        body.file_url = uploadData.url;
      }

      const res = await fetch('/api/shorts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Erreur lors de la génération');
      if (!res.body) throw new Error('Pas de stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const event = JSON.parse(data);

            if (event.type === 'step') {
              setPipeline((prev) =>
                prev.map((s) =>
                  s.id === event.step_id
                    ? { ...s, status: event.status, detail: event.detail }
                    : s
                )
              );
            } else if (event.type === 'result') {
              setResults((prev) => [...prev, event.short]);
            } else if (event.type === 'error') {
              setError(event.message);
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setGenerating(false);
    }
  };

  const getViralColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getViralBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/20';
    if (score >= 60) return 'bg-yellow-500/20';
    if (score >= 40) return 'bg-orange-500/20';
    return 'bg-red-500/20';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <Scissors className="text-cyan-400" size={28} />
          <h1 className="text-3xl font-bold font-orbitron gradient-text">Video to Shorts</h1>
        </div>
        <p className="text-white/60">
          Transforme n&apos;importe quelle vidéo en shorts viraux grâce à l&apos;IA.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass p-6 space-y-6"
      >
        {/* YouTube URL */}
        <div className="space-y-2">
          <label className="text-sm text-white/60 flex items-center gap-2">
            <Link2 size={14} /> URL YouTube
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={youtubeUrl}
              onChange={(e) => { setYoutubeUrl(e.target.value); setUploadedFile(null); }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all"
              disabled={generating}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-sm">ou</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* File Upload Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !generating && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-violet-500 bg-violet-500/10'
              : uploadedFile
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={generating}
          />
          {uploadedFile ? (
            <div className="space-y-2">
              <CheckCircle className="mx-auto text-green-400" size={40} />
              <p className="text-white/90 font-medium">{uploadedFile.name}</p>
              <p className="text-white/40 text-sm">
                {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                className="text-red-400/70 hover:text-red-400 text-sm inline-flex items-center gap-1"
              >
                <X size={14} /> Retirer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className={`mx-auto ${dragActive ? 'text-violet-400' : 'text-white/20'}`} size={40} />
              <p className="text-white/60">
                Glisse ta vidéo ici ou <span className="text-violet-400 underline">parcourir</span>
              </p>
              <p className="text-white/30 text-xs">MP4, MOV, WebM - Max 500 MB</p>
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            <Settings size={16} />
            Options avancées
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  {/* Number of Shorts */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60">Nombre de shorts</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={3}
                        max={10}
                        value={numShorts}
                        onChange={(e) => setNumShorts(parseInt(e.target.value))}
                        className="flex-1 accent-violet-500"
                      />
                      <span className="text-white font-bold w-8 text-center font-orbitron">{numShorts}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60 flex items-center gap-1">
                      <Clock size={14} /> Durée max
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDuration(opt.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            duration === opt.value
                              ? 'bg-violet-500/20 border border-violet-500/50 text-violet-300'
                              : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subtitle Style */}
                  <div className="space-y-2">
                    <label className="text-sm text-white/60 flex items-center gap-1">
                      <Subtitles size={14} /> Style sous-titres
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SUBTITLE_STYLES.map((style) => (
                        <button
                          key={style.value}
                          onClick={() => setSubtitleStyle(style.value)}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            subtitleStyle === style.value
                              ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300'
                              : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/20'
                          }`}
                        >
                          {style.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={generating || (!youtubeUrl && !uploadedFile)}
          className="btn-glow w-full flex items-center justify-center gap-2 py-4 text-lg"
        >
          {generating ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RefreshCw size={20} />
              </motion.div>
              Génération en cours...
            </>
          ) : (
            <>
              <Zap size={20} />
              Générer les Shorts
            </>
          )}
        </button>
      </motion.div>

      {/* Progress Pipeline */}
      <AnimatePresence>
        {pipeline.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass p-6 space-y-4"
          >
            <h2 className="text-lg font-bold font-orbitron text-white/90">Pipeline</h2>
            <div className="space-y-3">
              {pipeline.map((step, i) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step.status === 'done' ? 'bg-green-500/20 text-green-400' :
                    step.status === 'active' ? 'bg-violet-500/20 text-violet-400' :
                    step.status === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-white/5 text-white/20'
                  }`}>
                    {step.status === 'done' ? <CheckCircle size={16} /> :
                     step.status === 'active' ? (
                       <motion.div
                         animate={{ rotate: 360 }}
                         transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                       >
                         <Loader2 size={16} />
                       </motion.div>
                     ) :
                     step.status === 'error' ? <AlertCircle size={16} /> :
                     <Clock size={16} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      step.status === 'active' ? 'text-white' :
                      step.status === 'done' ? 'text-white/70' :
                      'text-white/40'
                    }`}>
                      {step.label}
                    </p>
                    {step.detail && (
                      <p className="text-xs text-white/40 mt-0.5">{step.detail}</p>
                    )}
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className={`hidden sm:block w-8 h-px ${
                      step.status === 'done' ? 'bg-green-500/30' : 'bg-white/10'
                    }`} />
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass p-4 border-red-500/30 flex items-center gap-3"
          >
            <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
            <p className="text-red-300 text-sm">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-white/40 hover:text-white">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Grid */}
      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-orbitron text-white/90 flex items-center gap-2">
              <Sparkles className="text-yellow-400" size={20} />
              Résultats ({results.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((short, i) => (
              <motion.div
                key={short.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                className="glass-hover overflow-hidden group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-[9/16] bg-white/5">
                  {short.thumbnail_url ? (
                    <img src={short.thumbnail_url} alt={short.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="text-white/10" size={48} />
                    </div>
                  )}

                  {/* Viral Score Badge */}
                  <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg ${getViralBg(short.viral_score)} backdrop-blur-sm`}>
                    <div className="flex items-center gap-1">
                      <TrendingUp size={12} className={getViralColor(short.viral_score)} />
                      <span className={`text-sm font-bold font-orbitron ${getViralColor(short.viral_score)}`}>
                        {short.viral_score}
                      </span>
                    </div>
                  </div>

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm">
                    <span className="text-xs text-white/80">{short.duration}s</span>
                  </div>

                  {/* Status overlay */}
                  {short.status === 'rendering' && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 className="text-violet-400" size={32} />
                      </motion.div>
                    </div>
                  )}

                  {/* Play overlay */}
                  {short.status === 'ready' && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Play className="text-white" size={40} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold text-white/90 text-sm line-clamp-2">{short.title}</h3>
                  {short.hook && (
                    <p className="text-xs text-white/40 italic line-clamp-2">&quot;{short.hook}&quot;</p>
                  )}
                  <div className="flex items-center gap-2">
                    {short.status === 'ready' && (
                      <>
                        <a
                          href={short.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 btn-glow text-xs py-2 flex items-center justify-center gap-1"
                        >
                          <Download size={14} /> Télécharger
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(short.video_url)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                        >
                          <Copy size={14} className="text-white/50" />
                        </button>
                      </>
                    )}
                    {short.status === 'rendering' && (
                      <span className="text-xs text-white/40 flex items-center gap-1">
                        <Loader2 size={12} className="animate-spin" /> Rendu en cours...
                      </span>
                    )}
                    {short.status === 'failed' && (
                      <span className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle size={12} /> Échec du rendu
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
