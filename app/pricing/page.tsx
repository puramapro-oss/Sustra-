'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import { Check, ArrowLeft } from 'lucide-react';

const plans = [
  {
    name: 'Free', price: '0', priceAnnual: '0', desc: 'Pour d\u00e9couvrir SUTRA', popular: false, limits: '15 questions/jour',
    features: ['15 questions IA/jour', 'Mod\u00e8le Haiku', 'Acc\u00e8s communaut\u00e9', 'Templates basiques'],
  },
  {
    name: 'Starter', price: '9.99', priceAnnual: '6.69', desc: 'Pour d\u00e9marrer', popular: false, limits: '100 questions/jour',
    features: ['100 questions IA/jour', 'Mod\u00e8le Sonnet', 'Voix IA multiples', 'Export HD', 'Support email'],
  },
  {
    name: 'Pro', price: '29.99', priceAnnual: '20.09', desc: 'Pour les cr\u00e9ateurs s\u00e9rieux', popular: true, limits: '500 questions/jour',
    features: ['500 questions IA/jour', 'Mod\u00e8le Sonnet avanc\u00e9', 'Clonage vocal', 'Autopilot', 'Templates premium', 'Rendu prioritaire', 'Support prioritaire'],
  },
  {
    name: 'Enterprise', price: '79.99', priceAnnual: '53.59', desc: 'Pour les \u00e9quipes', popular: false, limits: 'Illimit\u00e9',
    features: ['Questions illimit\u00e9es', 'Tous les mod\u00e8les', 'API acc\u00e8s', 'Multi-plateformes', 'Marque blanche', 'Manager d\u00e9di\u00e9', 'SLA garanti'],
  },
];

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-7xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold font-syne text-white">Tarifs</h1>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">Choisis le plan adapt\u00e9 \u00e0 tes ambitions.</p>
        </motion.div>

        <div className="flex items-center justify-center gap-4 mb-12">
          <span className={`text-sm ${!annual ? 'text-white' : 'text-white/40'}`}>Mensuel</span>
          <button onClick={() => setAnnual(!annual)} className={`w-14 h-7 rounded-full p-1 transition-colors ${annual ? 'bg-violet-600' : 'bg-white/20'}`}>
            <motion.div className="w-5 h-5 rounded-full bg-white" animate={{ x: annual ? 28 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
          </button>
          <span className={`text-sm ${annual ? 'text-white' : 'text-white/40'}`}>Annuel <span className="text-violet-400 font-bold">-33%</span></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Glass glow={plan.popular ? 'violet' : undefined} className={`relative p-8 h-full flex flex-col ${plan.popular ? 'lg:-translate-y-4' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full text-xs font-bold font-syne uppercase tracking-wider text-white">
                    Populaire
                  </div>
                )}
                <h3 className="text-xl font-bold font-syne text-white">{plan.name}</h3>
                <p className="text-sm text-white/40 mt-1">{plan.desc}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold font-syne gradient-text">{annual ? plan.priceAnnual : plan.price}\u20ac</span>
                  <span className="text-white/40 text-sm">/mois</span>
                </div>
                <p className="text-xs text-violet-400 mt-1">{plan.limits}</p>
                <ul className="mt-8 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                      <Check size={16} className="text-violet-400 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/signup">
                    <GlowBtn variant={plan.popular ? 'primary' : 'secondary'} size="lg" className="w-full">
                      {plan.price === '0' ? 'Commencer gratuitement' : 'Choisir ce plan'}
                    </GlowBtn>
                  </Link>
                </div>
              </Glass>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
