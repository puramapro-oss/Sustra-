'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { ArrowLeft } from 'lucide-react';

const apps = [
  { name: 'SUTRA', desc: 'Cr\u00e9ation vid\u00e9o IA', color: '#8B5CF6', current: true },
  { name: 'KA\u00cfA', desc: 'Coach bien-\u00eatre IA', color: '#06B6D4' },
  { name: 'VIDA', desc: 'Sant\u00e9 & nutrition IA', color: '#10B981' },
  { name: 'Lingora', desc: 'Apprentissage langues IA', color: '#3B82F6' },
  { name: 'KASH', desc: 'Finance personnelle IA', color: '#F59E0B' },
  { name: 'DONA', desc: 'Caritatif intelligent', color: '#EC4899' },
  { name: 'VOYA', desc: 'Voyage IA', color: '#38BDF8' },
  { name: 'JurisPurama', desc: 'Assistant juridique IA', color: '#6D28D9' },
  { name: 'EntreprisePilot', desc: 'Gestion d\u2019entreprise IA', color: '#6366F1' },
  { name: 'Impact OS', desc: "Mesure d'impact IA", color: '#14B8A6' },
  { name: 'Purama AI', desc: 'Assistant IA g\u00e9n\u00e9raliste', color: '#8B5CF6' },
  { name: 'Purama Social', desc: 'R\u00e9seau social IA', color: '#F97316' },
];

export default function EcosystemPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold font-syne text-white">\u00c9cosyst\u00e8me Purama</h1>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">Toutes les apps de l&apos;\u00e9cosyst\u00e8me. Code CROSS33 = -33% sur toutes les apps.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app, i) => (
            <motion.div key={app.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Glass variant="hover" className={`p-6 h-full ${app.current ? 'border-violet-500/30' : ''}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold font-syne text-sm" style={{ background: `${app.color}20`, border: `1px solid ${app.color}40` }}>
                    {app.name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-white font-syne">{app.name}</p>
                    {app.current && <span className="text-xs text-violet-400">Application actuelle</span>}
                  </div>
                </div>
                <p className="text-sm text-white/50">{app.desc}</p>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
