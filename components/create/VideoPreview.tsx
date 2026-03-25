'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
  Film,
} from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface VideoPreviewProps {
  src?: string;
  thumbnail?: string;
  title?: string;
  className?: string;
}

export default function VideoPreview({ src, thumbnail, title, className }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [started, setStarted] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout>>();

  const hideControlsAfterDelay = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    if (playing) {
      controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    return () => {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current || !src) return;
    if (!started) setStarted(true);

    if (playing) {
      videoRef.current.pause();
      setPlaying(false);
    } else {
      videoRef.current.play();
      setPlaying(true);
    }
    hideControlsAfterDelay();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = ratio * duration;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!src) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-2xl overflow-hidden',
          'bg-white/[0.03] border border-white/10',
          'flex flex-col items-center justify-center gap-3',
          className
        )}
      >
        {thumbnail ? (
          <img src={thumbnail} alt={title || ''} className="w-full h-full object-cover opacity-50" />
        ) : (
          <>
            <Film size={48} className="text-white/10" />
            <p className="text-sm text-white/30 font-[family-name:var(--font-exo2)]">
              Aperçu non disponible
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-video rounded-2xl overflow-hidden bg-black group',
        'border border-white/10',
        className
      )}
      onMouseMove={hideControlsAfterDelay}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail}
        className="w-full h-full object-contain"
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        playsInline
      />

      {/* Thumbnail overlay before play */}
      <AnimatePresence>
        {!started && thumbnail && (
          <motion.div
            className="absolute inset-0 bg-black"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <img src={thumbnail} alt="" className="w-full h-full object-cover" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={40} className="text-violet-400 animate-spin" />
        </div>
      )}

      {/* Large center play button (when not started or paused) */}
      {!playing && !loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <motion.div
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20 hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play size={28} className="text-white ml-1" fill="white" />
          </motion.div>
        </button>
      )}

      {/* Glass controls overlay */}
      <AnimatePresence>
        {showControls && started && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Progress bar */}
            <div
              className="w-full h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/progress"
              onClick={seek}
            >
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(139,92,246,0.6)] opacity-0 group-hover/progress:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                  aria-label={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                  aria-label={muted ? 'Unmute' : 'Mute'}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className="text-xs text-white/60 font-mono">
                  {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {title && (
                  <span className="text-xs text-white/50 font-[family-name:var(--font-exo2)] mr-2 hidden sm:inline">
                    {title}
                  </span>
                )}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg text-white hover:bg-white/10 transition-colors"
                  aria-label="Fullscreen"
                >
                  <Maximize size={18} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
