'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CinematicIntro() {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<'logo' | 'pulse' | 'explode' | 'done'>('logo');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = localStorage.getItem('sutra-intro-seen');
    if (seen) {
      setPhase('done');
      return;
    }
    setShow(true);

    const t1 = setTimeout(() => setPhase('pulse'), 1200);
    const t2 = setTimeout(() => setPhase('explode'), 2000);
    const t3 = setTimeout(() => {
      setPhase('done');
      localStorage.setItem('sutra-intro-seen', '1');
      setShow(false);
    }, 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  if (phase === 'done' && !show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="cinematic-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#0A0A0F]"
        >
          {/* SVG Logo with stroke animation */}
          <motion.svg
            viewBox="0 0 200 60"
            className="w-64 sm:w-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <defs>
              <linearGradient id="intro-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#06B6D4" />
              </linearGradient>
            </defs>
            <motion.text
              x="100"
              y="45"
              textAnchor="middle"
              fontSize="48"
              fontFamily="Syne, sans-serif"
              fontWeight="800"
              fill="none"
              stroke="url(#intro-grad)"
              strokeWidth="1.5"
              initial={{ strokeDasharray: 400, strokeDashoffset: 400 }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            >
              SUTRA
            </motion.text>
            {phase !== 'logo' && (
              <motion.text
                x="100"
                y="45"
                textAnchor="middle"
                fontSize="48"
                fontFamily="Syne, sans-serif"
                fontWeight="800"
                fill="url(#intro-grad)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                SUTRA
              </motion.text>
            )}
          </motion.svg>

          {/* Pulse effect */}
          {phase === 'pulse' && (
            <motion.div
              className="absolute w-40 h-40 rounded-full border-2 border-violet-500/50"
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          )}

          {/* Particle explosion */}
          {phase === 'explode' && (
            <>
              {Array.from({ length: 20 }).map((_, i) => {
                const angle = (i / 20) * Math.PI * 2;
                const dist = 150 + Math.random() * 100;
                return (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full bg-violet-400"
                    initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                    animate={{
                      x: Math.cos(angle) * dist,
                      y: Math.sin(angle) * dist,
                      opacity: 0,
                      scale: 0,
                    }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                );
              })}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
