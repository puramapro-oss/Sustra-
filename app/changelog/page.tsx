'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { ArrowLeft } from 'lucide-react';

const entries = [
  { date: '30 mars 2026', version: '1.0.0', title: 'Lancement public', items: ['Cr\u00e9ation vid\u00e9o IA compl\u00e8te', 'Autopilot de publication', '\u00c9diteur timeline', 'Marketplace de templates', 'Syst\u00e8me de parrainage'] },
];

export default function ChangelogPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl sm:text-5xl font-bold font-syne text-white mb-4">Changelog</h1>
          <p className="text-white/50 mb-12">Historique des mises \u00e0 jour de SUTRA.</p>
        </motion.div>
        <div className="space-y-8">
          {entries.map((e, i) => (
            <motion.div key={e.version} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Glass className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full font-syne">v{e.version}</span>
                  <span className="text-xs text-white/40">{e.date}</span>
                </div>
                <h3 className="text-lg font-bold text-white font-syne mb-3">{e.title}</h3>
                <ul className="space-y-2">
                  {e.items.map((item) => (
                    <li key={item} className="text-sm text-white/60 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" /> {item}
                    </li>
                  ))}
                </ul>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
