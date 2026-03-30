'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold font-syne text-white mb-4">Politique de confidentialit\u00e9</h1>
          <p className="text-xs text-white/40 mb-8">Derni\u00e8re mise \u00e0 jour : 30 mars 2026</p>
        </motion.div>
        <Glass className="p-8 space-y-6 text-sm text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">1. Donn\u00e9es collect\u00e9es</h2>
            <p>Nous collectons les donn\u00e9es n\u00e9cessaires au fonctionnement du service : email, nom, donn\u00e9es d&apos;utilisation et informations de paiement via Stripe.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">2. Utilisation des donn\u00e9es</h2>
            <p>Vos donn\u00e9es sont utilis\u00e9es pour fournir le service, am\u00e9liorer l&apos;exp\u00e9rience utilisateur et communiquer avec vous. Elles ne sont jamais vendues \u00e0 des tiers.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">3. Stockage et s\u00e9curit\u00e9</h2>
            <p>Les donn\u00e9es sont stock\u00e9es de mani\u00e8re s\u00e9curis\u00e9e sur nos serveurs avec chiffrement en transit et au repos. Les paiements sont g\u00e9r\u00e9s par Stripe (PCI DSS).</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">4. Vos droits (RGPD)</h2>
            <p>Vous disposez d&apos;un droit d&apos;acc\u00e8s, de rectification, de suppression et de portabilit\u00e9 de vos donn\u00e9es. Contact : contact@purama.dev</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-white font-syne mb-3">5. Cookies</h2>
            <p>Nous utilisons des cookies essentiels au fonctionnement et des cookies analytiques (PostHog) avec votre consentement.</p>
          </section>
        </Glass>
      </div>
    </div>
  );
}
