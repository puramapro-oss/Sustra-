'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store, Search, Star, ShoppingCart, Eye,
  Film, Plus
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  preview_url: string | null;
  price: number;
  rating: number;
  sales_count: number;
  creator_id: string;
  creator_name?: string;
}

const CATEGORIES = ['Tous', 'YouTube', 'Shorts', 'TikTok', 'Motivation', 'Finance', 'Tech', 'Gaming', 'Lifestyle'];

export default function MarketplacePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Tous');

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
        );
        const { data } = await supabase
          .from('templates')
          .select('*')
          .order('sales_count', { ascending: false });
        if (data) setTemplates(data);
      } catch (err) {
        console.error('Error fetching templates:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const filtered = templates.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeCategory !== 'Tous' && t.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-sutra-rose/20 to-sutra-gold/20 border border-sutra-rose/30">
            <Store className="text-sutra-rose" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-orbitron font-bold gradient-text">Marketplace</h1>
            <p className="text-white/50 text-sm">Templates créés par la communauté</p>
          </div>
        </div>
        <button className="btn-glow text-sm flex items-center gap-2">
          <Plus size={16} /> Vendre un template
        </button>
      </motion.div>

      {/* Search + Filters */}
      <div className="glass p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher un template..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white outline-none focus:border-sutra-violet/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat
                  ? 'bg-sutra-violet/20 border border-sutra-violet/50 text-sutra-violet'
                  : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass p-4 animate-pulse">
              <div className="aspect-video bg-white/5 rounded-lg mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass p-12 text-center">
          <Store className="mx-auto mb-4 text-white/20" size={64} />
          <h3 className="text-xl font-semibold mb-2">
            {templates.length === 0 ? 'Marketplace vide' : 'Aucun résultat'}
          </h3>
          <p className="text-white/50 text-sm">
            {templates.length === 0
              ? 'Sois le premier à vendre un template !'
              : 'Essaie une autre recherche ou catégorie.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template, idx) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-hover p-4 group cursor-pointer"
            >
              <div className="aspect-video bg-white/5 rounded-lg mb-3 overflow-hidden relative">
                <div className="w-full h-full flex items-center justify-center text-white/10">
                  <Film size={32} />
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="px-4 py-2 rounded-lg bg-sutra-violet/80 text-white text-sm font-medium">
                    <Eye size={14} className="inline mr-1.5" /> Aperçu
                  </button>
                </div>
                {/* Price badge */}
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-sutra-gold text-xs font-bold px-2 py-1 rounded-lg">
                  {template.price > 0 ? `${template.price}€` : 'Gratuit'}
                </div>
              </div>

              <h3 className="font-medium text-sm mb-1">{template.title}</h3>
              <p className="text-xs text-white/40 mb-2 line-clamp-2">{template.description}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-sutra-gold fill-sutra-gold" />
                  <span className="text-xs text-white/60">{template.rating.toFixed(1)}</span>
                  <span className="text-xs text-white/30 ml-1">
                    {template.sales_count} ventes
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                  {template.category}
                </span>
              </div>

              <button className="w-full mt-3 btn-glow text-xs py-2 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ShoppingCart size={12} /> {template.price > 0 ? 'Acheter' : 'Utiliser'}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
