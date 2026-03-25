'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

interface Suggestion {
  id: string;
  topic: string;
  description: string;
}

interface AISuggestionsProps {
  suggestions: Suggestion[];
  onSelect?: (topic: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export default function AISuggestions({
  suggestions,
  onSelect,
  onRefresh,
  loading = false,
  className,
}: AISuggestionsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div
      className={cn(
        'bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 flex items-center justify-center">
            <Sparkles size={16} className="text-violet-400" />
          </div>
          <h3 className="text-sm font-bold text-white font-[family-name:var(--font-orbitron)]">
            Suggestions IA
          </h3>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className={cn(
            'p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all duration-200',
            loading && 'animate-spin'
          )}
          aria-label="Refresh suggestions"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, i) => (
            <motion.button
              key={suggestion.id}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl border transition-all duration-200',
                'font-[family-name:var(--font-exo2)]',
                hoveredId === suggestion.id
                  ? 'bg-violet-500/10 border-violet-500/30'
                  : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
              )}
              onClick={() => onSelect?.(suggestion.topic)}
              onMouseEnter={() => setHoveredId(suggestion.id)}
              onMouseLeave={() => setHoveredId(null)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              layout
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {suggestion.topic}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1">
                    {suggestion.description}
                  </p>
                </div>
                <ArrowRight
                  size={14}
                  className={cn(
                    'shrink-0 transition-all duration-200',
                    hoveredId === suggestion.id
                      ? 'text-violet-400 translate-x-0 opacity-100'
                      : 'text-white/20 -translate-x-1 opacity-0'
                  )}
                />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {suggestions.length === 0 && !loading && (
          <p className="text-sm text-white/30 text-center py-6 font-[family-name:var(--font-exo2)]">
            Cliquez sur rafraîchir pour obtenir des suggestions
          </p>
        )}

        {loading && suggestions.length === 0 && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-white/[0.02] animate-pulse"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
