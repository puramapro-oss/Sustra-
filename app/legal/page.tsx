'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { ArrowLeft } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold font-syne text-white mb-4">Mentions l\u00e9gales</h1>
        </motion.div>
        <Glass className="p-8 space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">\u00c9diteur</h2>
            <p>Purama - Micro-entreprise<br />
            TVA non applicable, article 293B du Code G\u00e9n\u00e9ral des Imp\u00f4ts.<br />
            Email : contact@purama.dev</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">H\u00e9bergement</h2>
            <p>Vercel Inc.<br />
            340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">Directeur de la publication</h2>
            <p>Tissma, fondateur de Purama.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">Propri\u00e9t\u00e9 intellectuelle</h2>
            <p>Tous les contenus du site (textes, images, logos, code) sont la propri\u00e9t\u00e9 de Purama et sont prot\u00e9g\u00e9s par le droit de la propri\u00e9t\u00e9 intellectuelle.</p>
          </section>
        </Glass>
      </div>
    </div>
  );
}
