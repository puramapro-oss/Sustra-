'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BootLine {
  text: string;
  status: 'pending' | 'loading' | 'ok' | 'error';
}

const SERVICES = [
  'Supabase Database',
  'Claude AI Engine',
  'ElevenLabs Voice API',
  'fal.ai Visual Engine',
  'Shotstack Renderer',
  'Pexels Media Library',
];

export default function BootScreen({ onComplete }: { onComplete?: () => void }) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const addLine = useCallback((text: string, status: BootLine['status']) => {
    setLines((prev) => [...prev, { text, status }]);
  }, []);

  const updateLastLine = useCallback((status: BootLine['status']) => {
    setLines((prev) => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = { ...copy[copy.length - 1], status };
      }
      return copy;
    });
  }, []);

  useEffect(() => {
    // Initial header lines
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => {
      addLine('SUTRA OS v2.0 — Initializing...', 'ok');
      setCurrentIndex(0);
    }, 200));

    timers.push(setTimeout(() => {
      addLine('Loading kernel modules...', 'ok');
      setProgress(5);
    }, 500));

    // Connect to each service
    SERVICES.forEach((service, i) => {
      const baseDelay = 700 + i * 400;

      timers.push(setTimeout(() => {
        addLine(`Connecting to ${service}...`, 'loading');
        setProgress(10 + ((i + 1) / SERVICES.length) * 80);
        setCurrentIndex(i + 1);
      }, baseDelay));

      timers.push(setTimeout(() => {
        updateLastLine('ok');
      }, baseDelay + 300));
    });

    // Finalize
    const finalDelay = 700 + SERVICES.length * 400 + 400;
    timers.push(setTimeout(() => {
      addLine('All systems operational. Launching SUTRA...', 'ok');
      setProgress(100);
    }, finalDelay));

    timers.push(setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, finalDelay + 600));

    return () => timers.forEach(clearTimeout);
  }, [addLine, updateLastLine, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] bg-[#0A0A0F] flex flex-col items-center justify-center p-8"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        >
          {/* Logo */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-orbitron)] tracking-widest">
              <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                SUTRA
              </span>
            </h1>
          </motion.div>

          {/* Terminal output */}
          <div className="w-full max-w-xl bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-xl p-5 font-mono text-sm space-y-1.5 mb-6 min-h-[280px]">
            {lines.map((line, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-white/30 select-none">{'>'}</span>
                <span className="text-white/70 flex-1">{line.text}</span>
                {line.status === 'loading' && (
                  <motion.span
                    className="text-yellow-400 text-xs"
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                  >
                    [...]
                  </motion.span>
                )}
                {line.status === 'ok' && (
                  <span className="text-emerald-400 text-xs font-bold">[OK]</span>
                )}
                {line.status === 'error' && (
                  <span className="text-red-400 text-xs font-bold">[ERR]</span>
                )}
              </motion.div>
            ))}
            {/* Blinking cursor */}
            <motion.span
              className="inline-block w-2 h-4 bg-violet-400 ml-4"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-xl">
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-white/30 font-mono">
                {currentIndex >= 0 ? `${Math.min(currentIndex + 1, SERVICES.length)}/${SERVICES.length} services` : 'Starting...'}
              </span>
              <span className="text-xs text-white/30 font-mono">{Math.round(progress)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
