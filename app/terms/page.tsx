'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold font-syne text-white mb-4">Conditions d&apos;utilisation</h1>
          <p className="text-xs text-white/40 mb-8">Derni\u00e8re mise \u00e0 jour : 30 mars 2026</p>
        </motion.div>
        <Glass className="p-8 space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">1. Acceptation</h2>
            <p>En utilisant SUTRA, vous acceptez les pr\u00e9sentes conditions g\u00e9n\u00e9rales d&apos;utilisation.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">2. Service</h2>
            <p>SUTRA est une plateforme de cr\u00e9ation vid\u00e9o assist\u00e9e par intelligence artificielle. Le service est fourni en l&apos;\u00e9tat.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">3. Abonnements</h2>
            <p>Les abonnements sont factur\u00e9s mensuellement ou annuellement via Stripe. R\u00e9siliation possible \u00e0 tout moment.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">4. Propri\u00e9t\u00e9 intellectuelle</h2>
            <p>Les vid\u00e9os g\u00e9n\u00e9r\u00e9es vous appartiennent. La plateforme et son code restent la propri\u00e9t\u00e9 de Purama.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">5. Responsabilit\u00e9</h2>
            <p>L&apos;utilisateur est responsable du contenu g\u00e9n\u00e9r\u00e9 et de sa conformit\u00e9 avec les lois en vigueur.</p>
          </section>
        </Glass>
      </div>
    </div>
  );
}
