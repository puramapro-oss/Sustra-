'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, Maximize,
  MousePointer, Type, Scissors, Layers, Sliders, Clock,
  Volume1, Crop, Sparkles, Image, Palette, Monitor,
  ZoomIn, ZoomOut, Plus, Save, Download, Wand2, Undo, Redo,
  Film, Mic, Music, FileText, Star
} from 'lucide-react';

interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  start: number;
  duration: number;
  color: string;
  type: 'video' | 'audio' | 'music' | 'text' | 'overlay';
}

interface Track {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  clips: TimelineClip[];
}

type ToolId = 'select' | 'text' | 'cut' | 'transition' | 'filter' | 'speed' | 'audio' | 'crop' | 'effects' | 'overlay' | 'color' | 'chromakey';

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string }[] = [
  { id: 'select', icon: <MousePointer size={18} />, label: 'Sélection' },
  { id: 'text', icon: <Type size={18} />, label: 'Texte' },
  { id: 'cut', icon: <Scissors size={18} />, label: 'Couper' },
  { id: 'transition', icon: <Layers size={18} />, label: 'Transitions' },
  { id: 'filter', icon: <Sliders size={18} />, label: 'Filtres' },
  { id: 'speed', icon: <Clock size={18} />, label: 'Vitesse' },
  { id: 'audio', icon: <Volume1 size={18} />, label: 'Audio' },
  { id: 'crop', icon: <Crop size={18} />, label: 'Recadrer' },
  { id: 'effects', icon: <Sparkles size={18} />, label: 'Effets' },
  { id: 'overlay', icon: <Image size={18} />, label: 'Overlay' },
  { id: 'color', icon: <Palette size={18} />, label: 'Couleurs' },
  { id: 'chromakey', icon: <Monitor size={18} />, label: 'ChromaKey' },
];

const TRANSITIONS = [
  'fade', 'fadeBlack', 'fadeWhite', 'slideLeft', 'slideRight',
  'slideUp', 'slideDown', 'carouselLeft', 'carouselRight',
  'zoom', 'reveal', 'wipeRight'
];

const FILTERS = [
  'boost', 'contrast', 'darken', 'greyscale', 'lighten', 'muted', 'invert', 'negative'
];

const INITIAL_TRACKS: Track[] = [
  {
    id: 'video', name: 'Vidéo', icon: <Film size={14} />, color: '#8b5cf6',
    clips: [
      { id: 'v1', trackId: 'video', name: 'Intro', start: 0, duration: 3, color: '#8b5cf6', type: 'video' },
      { id: 'v2', trackId: 'video', name: 'Scène 1', start: 3, duration: 5, color: '#7c3aed', type: 'video' },
      { id: 'v3', trackId: 'video', name: 'Scène 2', start: 8, duration: 4, color: '#6d28d9', type: 'video' },
      { id: 'v4', trackId: 'video', name: 'Scène 3', start: 12, duration: 5, color: '#5b21b6', type: 'video' },
      { id: 'v5', trackId: 'video', name: 'Outro', start: 17, duration: 3, color: '#4c1d95', type: 'video' },
    ],
  },
  {
    id: 'voix', name: 'Voix', icon: <Mic size={14} />, color: '#3b82f6',
    clips: [
      { id: 'a1', trackId: 'voix', name: 'Narration', start: 0.5, duration: 19, color: '#3b82f6', type: 'audio' },
    ],
  },
  {
    id: 'musique', name: 'Musique', icon: <Music size={14} />, color: '#06b6d4',
    clips: [
      { id: 'm1', trackId: 'musique', name: 'BGM - Motivant', start: 0, duration: 20, color: '#06b6d4', type: 'music' },
    ],
  },
  {
    id: 'texte', name: 'Texte', icon: <FileText size={14} />, color: '#f59e0b',
    clips: [
      { id: 't1', trackId: 'texte', name: 'Titre', start: 0, duration: 3, color: '#f59e0b', type: 'text' },
      { id: 't2', trackId: 'texte', name: 'Sous-titre 1', start: 3, duration: 5, color: '#d97706', type: 'text' },
      { id: 't3', trackId: 'texte', name: 'Sous-titre 2', start: 8, duration: 4, color: '#b45309', type: 'text' },
      { id: 't4', trackId: 'texte', name: 'CTA', start: 17, duration: 3, color: '#f59e0b', type: 'text' },
    ],
  },
  {
    id: 'overlay', name: 'Overlay', icon: <Star size={14} />, color: '#ec4899',
    clips: [
      { id: 'o1', trackId: 'overlay', name: 'Logo', start: 0, duration: 20, color: '#ec4899', type: 'overlay' },
    ],
  },
];

export default function EditorPage() {
  const [activeTool, setActiveTool] = useState<ToolId>('select');
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(40); // pixels per second
  const [totalDuration] = useState(20);
  const [volume, setVolume] = useState(0.8);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  const selectedClipData = tracks.flatMap(t => t.clips).find(c => c.id === selectedClip);

  // Playback animation
  useEffect(() => {
    if (isPlaying) {
      const start = performance.now();
      const startPlayhead = playhead;
      const animate = (time: number) => {
        const elapsed = (time - start) / 1000;
        const newPlayhead = startPlayhead + elapsed;
        if (newPlayhead >= totalDuration) {
          setPlayhead(0);
          setIsPlaying(false);
          return;
        }
        setPlayhead(newPlayhead);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }
  }, [isPlaying, playhead, totalDuration]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / zoom;
    setPlayhead(Math.max(0, Math.min(time, totalDuration)));
  }, [zoom, totalDuration]);

  const handleRemix = async () => {
    // Build shotstack JSON from current tracks and send to remix API
    const shotstackJson = { tracks: tracks.map(t => ({ ...t })) };
    try {
      const res = await fetch('/api/remix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shotstackJson }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.newShotstackJson?.tracks) {
          setTracks(data.newShotstackJson.tracks);
        }
      }
    } catch (err) {
      console.error('Remix failed:', err);
    }
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-2">
      {/* Top Bar */}
      <div className="glass px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-orbitron text-lg gradient-text">Sutra Studio</h1>
          <div className="h-5 w-px bg-white/10" />
          <input
            type="text"
            defaultValue="Ma vidéo"
            className="bg-transparent border-none outline-none text-white/80 text-sm font-medium w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors">
            <Undo size={16} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors">
            <Redo size={16} />
          </button>
          <div className="h-5 w-px bg-white/10" />
          <button className="btn-glow-secondary text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Save size={14} /> Sauvegarder
          </button>
          <button
            onClick={handleRemix}
            className="btn-glow text-xs px-3 py-1.5 flex items-center gap-1.5 bg-gradient-to-r from-sutra-rose to-sutra-violet"
          >
            <Wand2 size={14} /> Remix IA
          </button>
          <button className="btn-glow text-xs px-3 py-1.5 flex items-center gap-1.5">
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex gap-2 min-h-0">
        {/* Left Tools Panel */}
        <div className="glass w-14 flex flex-col items-center py-2 gap-1 overflow-y-auto">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all group relative ${
                activeTool === tool.id
                  ? 'bg-sutra-violet/20 text-sutra-violet glow-violet'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
              title={tool.label}
            >
              {tool.icon}
              <span className="absolute left-full ml-2 px-2 py-1 bg-[#1a1a2e] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                {tool.label}
              </span>
            </button>
          ))}
        </div>

        {/* Center Preview */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Video Preview */}
          <div className="glass flex-1 flex items-center justify-center relative overflow-hidden">
            <div className="aspect-video w-full max-w-[90%] max-h-[90%] bg-black rounded-lg flex items-center justify-center relative">
              <Film className="text-white/10" size={64} />
              {/* Playhead time overlay */}
              <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-white/70">
                {formatTime(playhead)} / {formatTime(totalDuration)}
              </div>
            </div>
          </div>

          {/* Video Controls */}
          <div className="glass px-4 py-2 flex items-center justify-center gap-4">
            <button
              onClick={() => setPlayhead(0)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-sutra-violet/20 border border-sutra-violet/40 flex items-center justify-center text-sutra-violet hover:bg-sutra-violet/30 transition-all"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={() => setPlayhead(totalDuration)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <SkipForward size={18} />
            </button>
            <div className="h-5 w-px bg-white/10" />
            <span className="text-xs font-mono text-white/50">
              {formatTime(playhead)}
            </span>
            <div className="h-5 w-px bg-white/10" />
            <Volume2 size={14} className="text-white/40" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 accent-sutra-violet"
            />
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="glass w-64 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white/60 mb-4">Propriétés</h3>
          {selectedClipData ? (
            <div className="space-y-4">
              <div className="glass p-3 space-y-2">
                <div className="text-xs text-white/40">Nom</div>
                <div className="text-sm font-medium">{selectedClipData.name}</div>
              </div>
              <div className="glass p-3 space-y-2">
                <div className="text-xs text-white/40">Début</div>
                <div className="text-sm font-mono">{formatTime(selectedClipData.start)}</div>
              </div>
              <div className="glass p-3 space-y-2">
                <div className="text-xs text-white/40">Durée</div>
                <div className="text-sm font-mono">{formatTime(selectedClipData.duration)}</div>
              </div>
              {selectedClipData.type === 'video' && (
                <>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Vitesse</div>
                    <input type="range" min="0.25" max="4" step="0.25" defaultValue="1" className="w-full accent-sutra-violet" />
                  </div>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Opacité</div>
                    <input type="range" min="0" max="1" step="0.1" defaultValue="1" className="w-full accent-sutra-violet" />
                  </div>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Filtre</div>
                    <select className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none">
                      <option value="" className="bg-[#1a1a2e]">Aucun</option>
                      {FILTERS.map((f) => (
                        <option key={f} value={f} className="bg-[#1a1a2e]">{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Transition</div>
                    <select className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none">
                      <option value="" className="bg-[#1a1a2e]">Aucune</option>
                      {TRANSITIONS.map((t) => (
                        <option key={t} value={t} className="bg-[#1a1a2e]">{t}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {selectedClipData.type === 'text' && (
                <>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Texte</div>
                    <textarea defaultValue={selectedClipData.name} className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white outline-none resize-none h-20" />
                  </div>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Taille</div>
                    <input type="range" min="12" max="72" defaultValue="24" className="w-full accent-sutra-violet" />
                  </div>
                  <div className="glass p-3 space-y-2">
                    <div className="text-xs text-white/40">Couleur</div>
                    <input type="color" defaultValue="#ffffff" className="w-8 h-8 rounded cursor-pointer" />
                  </div>
                </>
              )}
              {(selectedClipData.type === 'audio' || selectedClipData.type === 'music') && (
                <div className="glass p-3 space-y-2">
                  <div className="text-xs text-white/40">Volume</div>
                  <input type="range" min="0" max="1" step="0.05" defaultValue="0.8" className="w-full accent-sutra-violet" />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-white/30 text-sm mt-10">
              <MousePointer size={32} className="mx-auto mb-3 opacity-50" />
              Sélectionne un élément dans la timeline pour voir ses propriétés
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass h-60 flex flex-col overflow-hidden">
        {/* Timeline Controls */}
        <div className="flex items-center justify-between px-4 py-1.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button className="text-xs text-white/40 hover:text-white flex items-center gap-1 transition-colors">
              <Plus size={12} /> Piste
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(Math.max(20, zoom - 10))} className="text-white/40 hover:text-white">
              <ZoomOut size={14} />
            </button>
            <span className="text-xs text-white/40 w-12 text-center">{zoom}px/s</span>
            <button onClick={() => setZoom(Math.min(100, zoom + 10))} className="text-white/40 hover:text-white">
              <ZoomIn size={14} />
            </button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Track Labels */}
          <div className="w-28 flex-shrink-0 border-r border-white/5">
            <div className="h-6" /> {/* Ruler space */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-10 flex items-center gap-2 px-3 border-b border-white/5 text-xs"
              >
                <span style={{ color: track.color }}>{track.icon}</span>
                <span className="text-white/50">{track.name}</span>
              </div>
            ))}
          </div>

          {/* Timeline Tracks */}
          <div
            ref={timelineRef}
            className="flex-1 overflow-x-auto overflow-y-hidden relative cursor-crosshair"
            onClick={handleTimelineClick}
          >
            {/* Time Ruler */}
            <div className="h-6 border-b border-white/10 relative" style={{ width: `${totalDuration * zoom}px` }}>
              {Array.from({ length: Math.ceil(totalDuration) + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 flex flex-col items-start"
                  style={{ left: `${i * zoom}px` }}
                >
                  <div className="w-px h-3 bg-white/20" />
                  <span className="text-[9px] text-white/30 ml-1">{i}s</span>
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-10 border-b border-white/5 relative"
                style={{ width: `${totalDuration * zoom}px` }}
              >
                {track.clips.map((clip) => (
                  <motion.div
                    key={clip.id}
                    className={`absolute top-1 bottom-1 rounded-md cursor-pointer flex items-center px-2 overflow-hidden transition-all ${
                      selectedClip === clip.id ? 'ring-2 ring-white/50 brightness-110' : 'hover:brightness-110'
                    }`}
                    style={{
                      left: `${clip.start * zoom}px`,
                      width: `${clip.duration * zoom}px`,
                      backgroundColor: clip.color + '40',
                      borderLeft: `3px solid ${clip.color}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClip(clip.id === selectedClip ? null : clip.id);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="text-[10px] text-white/70 truncate">{clip.name}</span>
                  </motion.div>
                ))}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
              style={{ left: `${playhead * zoom}px` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -ml-[5px] -mt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
