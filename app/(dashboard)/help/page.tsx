'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, BookOpen, Video, Mic, Film, Eye, Calendar,
  Palette, Layout, ChevronDown, Clock, MessageCircle,
  Sparkles, Zap, Search
} from 'lucide-react';

const TUTORIALS = [
  { id: 1, title: 'Créer ta première vidéo', duration: '2 min', icon: Video, color: 'sutra-violet', description: 'Apprends à créer une vidéo complète en quelques clics.' },
  { id: 2, title: 'Cloner ta voix', duration: '1 min', icon: Mic, color: 'sutra-blue', description: 'Enregistre 15 secondes et obtiens ton clone vocal IA.' },
  { id: 3, title: "L'éditeur vidéo", duration: '3 min', icon: Film, color: 'sutra-cyan', description: 'Maîtrise Sutra Studio : timeline, transitions, effets.' },
  { id: 4, title: 'Mode Faceless', duration: '2 min', icon: Eye, color: 'sutra-rose', description: 'Crée une chaîne YouTube sans montrer ton visage.' },
  { id: 5, title: 'Auto-Série 30 jours', duration: '2 min', icon: Calendar, color: 'sutra-gold', description: 'Planifie 30 vidéos en une seule fois.' },
  { id: 6, title: 'Autopilot Mode', duration: '3 min', icon: Zap, color: 'sutra-green', description: "L'IA gère ta chaîne automatiquement." },
  { id: 7, title: 'Style DNA', duration: '2 min', icon: Sparkles, color: 'sutra-violet', description: 'Copie le style de ton créateur préféré.' },
  { id: 8, title: 'Brand Kit', duration: '2 min', icon: Layout, color: 'sutra-blue', description: 'Configure ton identité visuelle.' },
];

const FAQ = [
  { q: 'Combien coûte SUTRA ?', a: 'SUTRA propose 3 plans : Starter à 9€/mois (15 photos, 3 vidéos courtes), Créateur à 29€/mois (photos illimitées, 20 vidéos courtes, 2 vidéos longues), et Empire à 99€/mois (tout illimité avec fonctionnalités avancées).' },
  { q: 'Combien de temps pour générer une vidéo ?', a: 'Une vidéo courte (Short/Reel) prend environ 2-5 minutes. Une vidéo longue YouTube (8-15 min) prend environ 10-20 minutes selon la complexité.' },
  { q: 'Puis-je utiliser les vidéos commercialement ?', a: 'Oui ! Toutes les vidéos générées avec SUTRA vous appartiennent. Vous pouvez les utiliser librement pour votre chaîne YouTube, vos réseaux sociaux, ou à des fins commerciales.' },
  { q: 'Comment fonctionne le clone de voix ?', a: "Enregistrez 15 secondes de votre voix via votre micro. Notre IA (ElevenLabs) analyse votre timbre et crée un clone vocal fidèle utilisable pour toutes vos vidéos. La qualité s'améliore avec un enregistrement de 30+ secondes." },
  { q: "Quels formats de vidéo sont supportés ?", a: 'YouTube Long (16:9), YouTube Shorts (9:16), TikTok (9:16), Instagram Reels (9:16), Stories (9:16), Publicités, Mini-Documentaires, et le mode Faceless pour les chaînes sans visage.' },
  { q: "L'autopilot publie-t-il sans mon accord ?", a: "Par défaut, chaque vidéo passe en file d'attente pour votre approbation. Vous pouvez activer la publication automatique si vous le souhaitez, mais ce n'est jamais activé par défaut." },
  { q: 'Puis-je modifier une vidéo après génération ?', a: "Absolument ! L'éditeur Sutra Studio vous permet de modifier chaque aspect : couper, ajouter du texte, changer les transitions, ajuster l'audio, et bien plus. Vous pouvez aussi utiliser le bouton Remix IA pour obtenir une version différente." },
  { q: 'Combien de langues sont supportées ?', a: 'SUTRA supporte plus de 30 langues grâce à ElevenLabs. Les principales : français, anglais, espagnol, allemand, portugais, italien, arabe, japonais, coréen, chinois, etc.' },
  { q: "Qu'est-ce que le Viral Score ?", a: "Le Viral Score analyse votre vidéo avant publication sur 4 critères : Hook (accroche, /30), Rétention estimée (/30), Call-to-Action (/20), et SEO titre+description (/20). Un score total /100 vous indique le potentiel viral." },
  { q: 'Comment annuler mon abonnement ?', a: "Allez dans Paramètres > Abonnement > Gérer mon abonnement. Vous serez redirigé vers le portail Stripe où vous pouvez annuler à tout moment. Votre plan reste actif jusqu'à la fin de la période payée." },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaq = FAQ.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-sutra-violet/20 to-sutra-blue/20 border border-sutra-violet/30 mb-4">
          <HelpCircle className="text-sutra-violet" size={36} />
        </div>
        <h1 className="text-3xl font-orbitron font-bold gradient-text mb-2">Centre d&apos;aide</h1>
        <p className="text-white/50">Tout ce que tu dois savoir sur SUTRA</p>
      </motion.div>

      {/* Tutorials */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen size={20} className="text-sutra-violet" /> Tutoriels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TUTORIALS.map((tuto, idx) => (
            <motion.div
              key={tuto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-hover p-4 flex items-center gap-4 cursor-pointer group"
            >
              <div className={`p-3 rounded-xl bg-${tuto.color}/20 group-hover:bg-${tuto.color}/30 transition-colors`}>
                <tuto.icon size={22} className={`text-${tuto.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{tuto.title}</div>
                <div className="text-xs text-white/40 mt-0.5">{tuto.description}</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-white/30 flex-shrink-0">
                <Clock size={12} /> {tuto.duration}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <MessageCircle size={20} className="text-sutra-blue" /> Questions fréquentes
        </h2>

        <div className="relative mb-4">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher une question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none focus:border-sutra-violet/50"
          />
        </div>

        <div className="space-y-2">
          {filteredFaq.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.03 }}
              className="glass overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <span className="font-medium text-sm pr-4">{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={`text-white/40 transition-transform flex-shrink-0 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <AnimatePresence>
                {openFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="px-4 pb-4 text-sm text-white/60 leading-relaxed border-t border-white/5 pt-3">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 text-center"
      >
        <MessageCircle className="mx-auto mb-3 text-sutra-violet" size={32} />
        <h3 className="text-lg font-semibold mb-2">Besoin d&apos;aide supplémentaire ?</h3>
        <p className="text-white/50 text-sm mb-4">
          Notre chatbot IA est disponible 24/7. Clique sur la bulle en bas à droite pour discuter !
        </p>
        <p className="text-xs text-white/30">
          Ou contacte-nous à support@purama.com
        </p>
      </motion.div>
    </div>
  );
}
