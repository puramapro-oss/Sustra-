'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import CinematicIntro from '@/components/landing/CinematicIntro';
import CursorGlow from '@/components/landing/CursorGlow';
import ScrollFillText from '@/components/landing/ScrollFillText';
import AnimatedCounter from '@/components/landing/AnimatedCounter';
import MagneticButton from '@/components/landing/MagneticButton';
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
  ChevronDown,
  Play,
  Zap,
  Users,
  Video,
  ThumbsUp,
  LayoutGrid,
  Brain,
} from 'lucide-react';

const Hero3D = dynamic(() => import('@/components/landing/Hero3D'), { ssr: false });

/* ========================================================================= */
/*  Shared                                                                    */
/* ========================================================================= */

function Section({
  children,
  className,
  delay = 0,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center mb-16">
      <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-syne text-white">{title}</h2>
      {subtitle && <p className="mt-4 text-white/50 max-w-xl mx-auto">{subtitle}</p>}
    </div>
  );
}

function Card3D({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{ rotateX: -3, rotateY: 3, scale: 1.02 }}
      style={{ perspective: 800, transformStyle: 'preserve-3d' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ========================================================================= */
/*  Data                                                                      */
/* ========================================================================= */

const features = [
  { icon: <FileText size={28} />, title: 'Script IA', desc: "G\u00e9n\u00e9ration automatique de scripts optimis\u00e9s pour l'engagement et la viralit\u00e9.", color: 'text-violet-400' },
  { icon: <Mic size={28} />, title: 'Voix IA', desc: 'Voix off naturelles avec clonage vocal et styles multiples.', color: 'text-blue-400' },
  { icon: <ImageIcon size={28} />, title: 'Visuels IA', desc: "Images et vid\u00e9os g\u00e9n\u00e9r\u00e9es par IA ou sourc\u00e9es depuis des banques stock.", color: 'text-cyan-400' },
  { icon: <Scissors size={28} />, title: 'Montage Auto', desc: 'Assemblage intelligent avec transitions, musique et sous-titres.', color: 'text-violet-400' },
  { icon: <Upload size={28} />, title: 'Publication Auto', desc: 'Publication automatique sur YouTube, TikTok et Instagram.', color: 'text-blue-400' },
  { icon: <Sparkles size={28} />, title: '\u00c9diteur Pro', desc: 'Timeline drag-and-drop pour un contr\u00f4le cr\u00e9atif total.', color: 'text-cyan-400' },
];

const stats = [
  { value: 2000, suffix: '+', label: 'Cr\u00e9ateurs actifs', icon: <Users size={24} /> },
  { value: 50000, suffix: '+', label: 'Vid\u00e9os g\u00e9n\u00e9r\u00e9es', icon: <Video size={24} /> },
  { value: 98, suffix: '%', label: 'Satisfaction', icon: <ThumbsUp size={24} /> },
  { value: 12, suffix: '', label: 'Niches support\u00e9es', icon: <LayoutGrid size={24} /> },
];

const howItWorks = [
  { step: '01', title: 'D\u00e9cris ta vid\u00e9o', desc: "Donne un sujet, un style et une dur\u00e9e. L'IA comprend tes intentions.", icon: <Brain size={32} /> },
  { step: '02', title: "L'IA cr\u00e9e tout", desc: 'Script, voix off, visuels, musique et montage sont g\u00e9n\u00e9r\u00e9s automatiquement.', icon: <Zap size={32} /> },
  { step: '03', title: 'Publie en un clic', desc: 'V\u00e9rifie, ajuste si besoin et publie directement sur tes plateformes.', icon: <Upload size={32} /> },
];

const testimonials = [
  { name: 'Sophie L.', role: 'Cr\u00e9atrice TikTok', text: "SUTRA a r\u00e9volutionn\u00e9 ma production de contenu. Je fais en 5 minutes ce qui me prenait 3 heures.", avatar: 'S' },
  { name: 'Maxime D.', role: 'YouTuber', text: "La qualit\u00e9 des scripts et des voix est bluffante. Mes abonn\u00e9s ne voient pas la diff\u00e9rence.", avatar: 'M' },
  { name: 'Camille R.', role: 'E-commerçante', text: "J'utilise SUTRA pour mes vid\u00e9os produit. Le ROI est incroyable.", avatar: 'C' },
  { name: 'Thomas P.', role: 'Coach fitness', text: "L'autopilot est un game-changer. Mes vid\u00e9os se publient toutes seules.", avatar: 'T' },
  { name: 'Lina M.', role: 'Blogueuse voyage', text: "Les visuels g\u00e9n\u00e9r\u00e9s par IA sont magnifiques. Mes followers adorent.", avatar: 'L' },
  { name: 'Julien B.', role: 'Entrepreneur', text: "La meilleure d\u00e9cision business de l'ann\u00e9e. 10x plus de contenu pour 3x moins de travail.", avatar: 'J' },
];

const plans = [
  {
    name: 'Free',
    price: '0',
    priceAnnual: '0',
    period: '/mois',
    desc: 'Pour d\u00e9couvrir SUTRA',
    popular: false,
    limits: '15 questions/jour',
    features: ['15 questions IA/jour', 'Mod\u00e8le Haiku', 'Acc\u00e8s communaut\u00e9', 'Templates basiques'],
  },
  {
    name: 'Starter',
    price: '9.99',
    priceAnnual: '6.69',
    period: '/mois',
    desc: 'Pour d\u00e9marrer la cr\u00e9ation vid\u00e9o',
    popular: false,
    limits: '100 questions/jour',
    features: ['100 questions IA/jour', 'Mod\u00e8le Sonnet', 'Voix IA multiples', 'Export HD', 'Support email'],
  },
  {
    name: 'Pro',
    price: '29.99',
    priceAnnual: '20.09',
    period: '/mois',
    desc: 'Pour les cr\u00e9ateurs s\u00e9rieux',
    popular: true,
    limits: '500 questions/jour',
    features: ['500 questions IA/jour', 'Mod\u00e8le Sonnet avanc\u00e9', 'Clonage vocal', 'Autopilot', 'Templates premium', 'Rendu prioritaire', 'Support prioritaire'],
  },
  {
    name: 'Enterprise',
    price: '79.99',
    priceAnnual: '53.59',
    period: '/mois',
    desc: 'Pour les \u00e9quipes et agences',
    popular: false,
    limits: 'Illimit\u00e9',
    features: ['Questions illimit\u00e9es', 'Tous les mod\u00e8les', 'API acc\u00e8s', 'Multi-plateformes', 'Marque blanche', 'Manager d\u00e9di\u00e9', 'SLA garanti', 'Facturation custom'],
  },
];

const faqItems = [
  { q: "Qu'est-ce que SUTRA ?", a: "SUTRA est une plateforme de cr\u00e9ation vid\u00e9o aliment\u00e9e par l'IA. Donne un sujet et l'IA g\u00e9n\u00e8re automatiquement le script, la voix off, les visuels, le montage et peut m\u00eame publier pour toi." },
  { q: 'Ai-je besoin de comp\u00e9tences en montage ?', a: "Non, z\u00e9ro comp\u00e9tence requise. L'IA fait tout. Si tu veux ajuster, un \u00e9diteur simple est disponible." },
  { q: 'Quels formats de vid\u00e9o sont support\u00e9s ?', a: 'Shorts (9:16), YouTube (16:9), carr\u00e9 (1:1), Stories et plus encore.' },
  { q: 'Puis-je cloner ma voix ?', a: "Oui, \u00e0 partir du plan Pro. Enregistre un \u00e9chantillon et l'IA reproduit ta voix fid\u00e8lement." },
  { q: "Comment fonctionne l'autopilot ?", a: "L'autopilot g\u00e9n\u00e8re et publie des vid\u00e9os automatiquement selon ton calendrier. Tu approuves ou laisses faire." },
  { q: 'Quels r\u00e9seaux sociaux sont support\u00e9s ?', a: 'YouTube, TikTok et Instagram pour le moment. Plus de plateformes arrivent bient\u00f4t.' },
  { q: 'Y a-t-il un essai gratuit ?', a: "Oui, le plan Free te donne 15 questions IA par jour, gratuit et sans carte bancaire." },
  { q: 'Comment fonctionne le parrainage ?', a: "Partage ton code et ton filleul b\u00e9n\u00e9ficie de -50% sur son premier mois. Toi, tu gagnes 50% du premier paiement + 10% r\u00e9current." },
];

const puramApps = [
  { name: 'KA\u00cfA', desc: 'Coach bien-\u00eatre IA', color: '#06B6D4', slug: 'kaia' },
  { name: 'VIDA', desc: 'Sant\u00e9 & nutrition IA', color: '#10B981', slug: 'vida' },
  { name: 'Lingora', desc: 'Apprentissage langues IA', color: '#3B82F6', slug: 'lingora' },
  { name: 'KASH', desc: 'Finance personnelle IA', color: '#F59E0B', slug: 'kash' },
  { name: 'DONA', desc: 'Caritatif intelligent', color: '#EC4899', slug: 'dona' },
  { name: 'VOYA', desc: 'Voyage IA', color: '#38BDF8', slug: 'voya' },
  { name: 'JurisPurama', desc: 'Assistant juridique IA', color: '#6D28D9', slug: 'jurispurama' },
  { name: 'Impact OS', desc: "Mesure d'impact IA", color: '#14B8A6', slug: 'impactos' },
];

/* ========================================================================= */
/*  Page                                                                      */
/* ========================================================================= */

export default function LandingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0A0F] bg-grid">
      <CinematicIntro />
      <CursorGlow />
      <StarField />

      {/* ─── 1. HERO ─── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center"
      >
        <Hero3D />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative z-10"
        >
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold font-syne gradient-text leading-tight">
            SUTRA
          </h1>
          <p className="mt-2 text-lg sm:text-xl text-white/50">by Purama</p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative z-10 mt-8 text-xl sm:text-2xl md:text-3xl text-white/90 max-w-3xl font-light"
        >
          {"G\u00e9n\u00e8re des vid\u00e9os compl\u00e8tes automatiquement gr\u00e2ce \u00e0 l'IA"}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="relative z-10 mt-4 text-base sm:text-lg text-white/40 max-w-2xl"
        >
          {"Donne un sujet. L'IA fait le reste. Script, voix, visuels, montage, publication."}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="relative z-10 mt-10 flex flex-col sm:flex-row gap-4"
        >
          <Link href="/signup">
            <MagneticButton className="btn-glow px-8 py-4 text-lg rounded-2xl font-semibold text-white inline-flex items-center gap-2">
              Commencer gratuitement <ArrowRight size={18} />
            </MagneticButton>
          </Link>
          <Link href="#demo">
            <GlowBtn variant="secondary" size="lg" icon={<Play size={18} />}>
              Voir une d\u00e9mo
            </GlowBtn>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ─── 2. STATS ─── */}
      <Section className="relative z-10 py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <Card3D key={s.label} delay={i * 0.1}>
              <Glass variant="hover" className="p-6 text-center">
                <div className="text-violet-400 mb-3 flex justify-center">{s.icon}</div>
                <div className="text-3xl sm:text-4xl font-bold font-syne gradient-text">
                  <AnimatedCounter end={s.value} suffix={s.suffix} />
                </div>
                <p className="mt-2 text-sm text-white/50">{s.label}</p>
              </Glass>
            </Card3D>
          ))}
        </div>
      </Section>

      {/* ─── 3. FEATURES ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="Tout est automatis\u00e9" subtitle="De l'id\u00e9e \u00e0 la publication, SUTRA g\u00e8re chaque \u00e9tape de la cr\u00e9ation vid\u00e9o." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <Card3D key={f.title} delay={i * 0.08}>
                <Glass variant="hover" className="p-6 h-full">
                  <div className={`mb-4 ${f.color}`}>{f.icon}</div>
                  <h3 className="text-lg font-bold text-white font-syne mb-2">{f.title}</h3>
                  <p className="text-sm text-white/50">{f.desc}</p>
                </Glass>
              </Card3D>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 4. DEMO ─── */}
      <Section id="demo" className="relative z-10 py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="Cr\u00e9ation en 3 clics" subtitle="De l'id\u00e9e \u00e0 la vid\u00e9o finale en quelques secondes." />
          <Glass className="p-8 sm:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: <FileText size={32} />, label: '\u00c9cris ton id\u00e9e', sub: '"Une vid\u00e9o sur le machine learning pour d\u00e9butants"' },
                { icon: <Zap size={32} />, label: "L'IA g\u00e9n\u00e8re", sub: 'Script, voix, visuels et montage automatiques' },
                { icon: <Play size={32} />, label: 'R\u00e9sultat final', sub: 'Vid\u00e9o pr\u00eate \u00e0 publier en HD' },
              ].map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-white/10 flex items-center justify-center mx-auto mb-4 text-violet-400">
                    {step.icon}
                  </div>
                  <h4 className="font-bold text-white font-syne mb-2">{step.label}</h4>
                  <p className="text-sm text-white/40">{step.sub}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-10 aspect-video rounded-xl bg-gradient-to-br from-violet-900/20 to-cyan-900/20 border border-white/10 flex items-center justify-center">
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-20 h-20 rounded-full bg-violet-600/30 border border-violet-400/30 flex items-center justify-center cursor-pointer"
              >
                <Play size={32} className="text-violet-300 ml-1" />
              </motion.div>
            </div>
          </Glass>
        </div>
      </Section>

      {/* ─── 5. SCROLL TEXT ─── */}
      <div className="relative z-10">
        <ScrollFillText text="L'IA qui transforme vos id\u00e9es en vid\u00e9os virales" />
      </div>

      {/* ─── 6. HOW IT WORKS ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="Comment \u00e7a marche" subtitle="3 \u00e9tapes pour cr\u00e9er ta vid\u00e9o" />
          <div className="space-y-12">
            {howItWorks.map((item, i) => (
              <Card3D key={item.step} delay={i * 0.15}>
                <Glass variant="hover" className="p-8 flex flex-col md:flex-row items-start gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 text-white">
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-bold font-syne text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full">{item.step}</span>
                      <h3 className="text-xl font-bold font-syne text-white">{item.title}</h3>
                    </div>
                    <p className="text-white/50">{item.desc}</p>
                  </div>
                </Glass>
              </Card3D>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 7. TESTIMONIALS ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="Ce que disent nos cr\u00e9ateurs" subtitle="Rejoins des milliers de cr\u00e9ateurs satisfaits." />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Card3D key={t.name} delay={i * 0.08}>
                <Glass variant="hover" className="p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-sm font-bold text-white">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-white/40">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-white/60 flex-1">&laquo; {t.text} &raquo;</p>
                </Glass>
              </Card3D>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 8. PRICING ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <SectionTitle title="Tarifs simples et transparents" subtitle="Choisis le plan adapt\u00e9 \u00e0 tes ambitions." />

          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${!annual ? 'text-white' : 'text-white/40'}`}>Mensuel</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`w-14 h-7 rounded-full p-1 transition-colors ${annual ? 'bg-violet-600' : 'bg-white/20'}`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white"
                animate={{ x: annual ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            </button>
            <span className={`text-sm ${annual ? 'text-white' : 'text-white/40'}`}>
              Annuel <span className="text-violet-400 font-bold">-33%</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {plans.map((plan, i) => (
              <Card3D key={plan.name} delay={i * 0.1}>
                <Glass
                  glow={plan.popular ? 'violet' : undefined}
                  className={`relative p-8 h-full flex flex-col ${plan.popular ? 'lg:-translate-y-4' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-violet-600 to-blue-600 rounded-full text-xs font-bold font-syne uppercase tracking-wider text-white">
                      Populaire
                    </div>
                  )}
                  <h3 className="text-xl font-bold font-syne text-white">{plan.name}</h3>
                  <p className="text-sm text-white/40 mt-1">{plan.desc}</p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold font-syne gradient-text">
                      {annual ? plan.priceAnnual : plan.price}\u20ac
                    </span>
                    <span className="text-white/40 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-xs text-violet-400 mt-1">{plan.limits}</p>
                  <ul className="mt-8 space-y-3 flex-1">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm text-white/70">
                        <Check size={16} className="text-violet-400 shrink-0 mt-0.5" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <Link href="/signup">
                      <GlowBtn variant={plan.popular ? 'primary' : 'secondary'} size="lg" className="w-full">
                        {plan.price === '0' ? "Commencer gratuitement" : "Choisir ce plan"}
                      </GlowBtn>
                    </Link>
                  </div>
                </Glass>
              </Card3D>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 9. FAQ ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-3xl mx-auto">
          <SectionTitle title="Questions fr\u00e9quentes" subtitle="Tout ce que tu dois savoir sur SUTRA." />
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <motion.div
                key={i}
                initial={false}
              >
                <Glass
                  className={`overflow-hidden transition-all ${openFaq === i ? 'border-violet-500/30' : ''}`}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <span className="font-semibold text-white font-syne text-sm sm:text-base">{item.q}</span>
                    <motion.div
                      animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={18} className="text-white/40" />
                    </motion.div>
                  </button>
                  <motion.div
                    initial={false}
                    animate={{ height: openFaq === i ? 'auto' : 0, opacity: openFaq === i ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-sm text-white/50">{item.a}</p>
                  </motion.div>
                </Glass>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 10. CTA ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-4xl mx-auto">
          <Glass className="relative overflow-hidden p-12 sm:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-cyan-600/10" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-syne text-white mb-4">
                Pr\u00eat \u00e0 cr\u00e9er ?
              </h2>
              <p className="text-white/50 max-w-lg mx-auto mb-8">
                Rejoins des milliers de cr\u00e9ateurs qui utilisent SUTRA pour automatiser leur production vid\u00e9o.
              </p>
              <Link href="/signup">
                <MagneticButton className="btn-glow px-10 py-4 text-lg rounded-2xl font-semibold text-white inline-flex items-center gap-2">
                  Commencer gratuitement <ArrowRight size={20} />
                </MagneticButton>
              </Link>
              <p className="mt-4 text-xs text-white/30">Gratuit, sans carte bancaire</p>
            </div>
          </Glass>
        </div>
      </Section>

      {/* ─── 11. CROSS PROMO ─── */}
      <Section className="relative z-10 py-32 px-4">
        <div className="max-w-6xl mx-auto">
          <SectionTitle title="\u00c9cosyst\u00e8me Purama" subtitle="D\u00e9couvre toutes les apps de l'\u00e9cosyst\u00e8me Purama. Code CROSS33 = -33%." />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {puramApps.map((app, i) => (
              <Card3D key={app.name} delay={i * 0.05}>
                <Glass variant="hover" className="p-4 text-center h-full">
                  <div
                    className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold font-syne text-sm"
                    style={{ background: `linear-gradient(135deg, ${app.color}40, ${app.color}20)`, border: `1px solid ${app.color}30` }}
                  >
                    {app.name[0]}
                  </div>
                  <p className="font-bold text-white text-sm font-syne">{app.name}</p>
                  <p className="text-xs text-white/40 mt-1">{app.desc}</p>
                </Glass>
              </Card3D>
            ))}
          </div>
        </div>
      </Section>

      {/* ─── 12. FOOTER ─── */}
      <footer className="relative z-10 border-t border-white/5">
        {/* SVG Wave */}
        <svg viewBox="0 0 1440 60" className="w-full -mb-1 text-[#0A0A0F]" preserveAspectRatio="none">
          <path d="M0,30 C360,60 720,0 1080,30 C1260,45 1380,20 1440,30 L1440,60 L0,60 Z" fill="rgba(139,92,246,0.05)" />
        </svg>

        <div className="max-w-6xl mx-auto py-16 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <span className="text-sm font-bold font-syne text-white tracking-wider">SUTRA</span>
                <span className="text-xs text-white/30">by Purama</span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                Plateforme de cr\u00e9ation vid\u00e9o IA. Micro-entreprise, TVA non applicable, art. 293B du CGI.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm font-syne mb-4">Produit</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Tarifs', href: '/pricing' },
                  { label: 'Comment \u00e7a marche', href: '/how-it-works' },
                  { label: '\u00c9cosyst\u00e8me', href: '/ecosystem' },
                  { label: 'Changelog', href: '/changelog' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-white/40 hover:text-white/70 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm font-syne mb-4">L\u00e9gal</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Confidentialit\u00e9', href: '/privacy' },
                  { label: "Conditions d'utilisation", href: '/terms' },
                  { label: 'Mentions l\u00e9gales', href: '/legal' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-white/40 hover:text-white/70 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm font-syne mb-4">Support</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Statut', href: '/status' },
                  { label: 'Contact', href: 'mailto:contact@purama.dev' },
                ].map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-xs text-white/40 hover:text-white/70 transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} Purama. Tous droits r\u00e9serv\u00e9s.</p>
            <p className="text-xs text-white/20">Fait avec passion en France</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
