'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import {
  FileText,
  Mic,
  ImageIcon,
  Scissors,
  Upload,
  Sparkles,
  Check,
  ArrowRight,
  Star,
} from 'lucide-react';

/* ─── Animated section wrapper ─── */
function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Feature data ─── */
const features = [
  {
    icon: <FileText size={28} />,
    title: 'Script IA',
    desc: "Génération automatique de scripts optimisés pour l'engagement et la viralité.",
    color: 'text-violet-400',
  },
  {
    icon: <Mic size={28} />,
    title: 'Voix IA',
    desc: 'Voix off naturelles avec clonage vocal et styles multiples.',
    color: 'text-blue-400',
  },
  {
    icon: <ImageIcon size={28} />,
    title: 'Visuels IA',
    desc: 'Images et vidéos générées par IA ou sourced depuis des banques stock.',
    color: 'text-cyan-400',
  },
  {
    icon: <Scissors size={28} />,
    title: 'Montage Auto',
    desc: 'Assemblage intelligent avec transitions, musique et sous-titres.',
    color: 'text-violet-400',
  },
  {
    icon: <Upload size={28} />,
    title: 'Publication Auto',
    desc: 'Publication automatique sur YouTube, TikTok et Instagram.',
    color: 'text-blue-400',
  },
  {
    icon: <Sparkles size={28} />,
    title: 'Éditeur Pro',
    desc: 'Timeline drag-and-drop pour un contrôle créatif total.',
    color: 'text-cyan-400',
  },
];

/* ─── Pricing data ─── */
const plans = [
  {
    name: 'Starter',
    price: '9€',
    period: '/mois',
    desc: 'Parfait pour démarrer avec la vidéo IA',
    popular: false,
    features: [
      '15 photos IA/mois',
      '3 vidéos courtes/mois',
      'Tous les styles de voix',
      'Flux Pro + banque stock',
      'Accès Marketplace',
    ],
  },
  {
    name: 'Créateur',
    price: '29€',
    period: '/mois',
    desc: 'Pour les créateurs de contenu sérieux',
    popular: true,
    features: [
      'Photos IA illimitées',
      '20 vidéos courtes/mois',
      '2 vidéos longues/mois',
      'Clonage de voix',
      'Templates personnalisés',
      'Rendu prioritaire',
      "Jusqu'à 3 membres",
    ],
  },
  {
    name: 'Empire',
    price: '99€',
    period: '/mois',
    desc: 'Construis ton empire de contenu',
    popular: false,
    features: [
      'Photos IA illimitées',
      'Vidéos courtes illimitées',
      '8 vidéos longues/mois',
      'Autopilot & planification',
      'Accès API',
      'Clonage de voix',
      'Templates personnalisés',
      'Rendu prioritaire',
      "Jusqu'à 10 membres",
    ],
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <StarField />

      {/* ─── HERO ─── */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-400 bg-clip-text text-transparent leading-tight">
            SUTRA
          </h1>
          <p className="mt-2 text-lg sm:text-xl text-white/60 font-[family-name:var(--font-exo2)]">
            by Purama
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-8 text-xl sm:text-2xl md:text-3xl text-white/90 max-w-3xl font-[family-name:var(--font-exo2)] font-light"
        >
          {"Génère des vidéos complètes automatiquement grâce à l'IA"}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-4 text-base sm:text-lg text-white/50 max-w-2xl font-[family-name:var(--font-exo2)]"
        >
          {"Donne un sujet. L'IA fait le reste. Script, voix, visuels, montage, publication — tout automatique."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-10 flex flex-col sm:flex-row gap-4"
        >
          <Link href="/signup">
            <GlowBtn size="lg" icon={<ArrowRight size={18} />}>
              Commencer gratuitement
            </GlowBtn>
          </Link>
          <GlowBtn variant="secondary" size="lg" icon={<Star size={18} />}>
            Voir une démo
          </GlowBtn>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-orbitron)] text-white">
              Tout est automatisé
            </h2>
            <p className="mt-4 text-white/50 max-w-xl mx-auto font-[family-name:var(--font-exo2)]">
              De l&apos;idée à la publication, SUTRA gère chaque étape de la création vidéo.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <AnimatedSection key={f.title} delay={i * 0.1}>
                <Glass variant="hover" className="p-6 h-full">
                  <div className={`mb-4 ${f.color}`}>{f.icon}</div>
                  <h3 className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)] mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-white/50 font-[family-name:var(--font-exo2)]">
                    {f.desc}
                  </p>
                </Glass>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-orbitron)] text-white">
              Tarifs simples
            </h2>
            <p className="mt-4 text-white/50 max-w-xl mx-auto font-[family-name:var(--font-exo2)]">
              Choisis le plan adapté à tes ambitions.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <AnimatedSection key={plan.name} delay={i * 0.15}>
                <Glass
                  glow={plan.popular ? 'violet' : undefined}
                  className={`relative p-8 h-full flex flex-col ${plan.popular ? 'md:-translate-y-4' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full text-xs font-bold font-[family-name:var(--font-orbitron)] uppercase tracking-wider">
                      le plus populaire
                    </div>
                  )}
                  <h3 className="text-xl font-bold font-[family-name:var(--font-orbitron)] text-white">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-white/40 mt-1 font-[family-name:var(--font-exo2)]">
                    {plan.desc}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                      {plan.price}
                    </span>
                    <span className="text-white/40 text-sm font-[family-name:var(--font-exo2)]">
                      {plan.period}
                    </span>
                  </div>
                  <ul className="mt-8 space-y-3 flex-1">
                    {plan.features.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-3 text-sm text-white/70 font-[family-name:var(--font-exo2)]"
                      >
                        <Check size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/signup">
                      <GlowBtn
                        variant={plan.popular ? 'primary' : 'secondary'}
                        size="lg"
                        className="w-full"
                      >
                        Commencer
                      </GlowBtn>
                    </Link>
                  </div>
                </Glass>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold font-[family-name:var(--font-orbitron)] text-white/80 tracking-wider">
              SUTRA
            </span>
            <span className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">
              by Purama
            </span>
          </div>
          <p className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">
            &copy; {new Date().getFullYear()} Purama. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
