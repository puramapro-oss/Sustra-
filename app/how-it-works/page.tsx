'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import { ArrowLeft, ArrowRight, FileText, Upload, Brain, Mic, Scissors, ImageIcon } from 'lucide-react';

const steps = [
  { step: '01', title: 'D\u00e9cris ta vid\u00e9o', desc: "Donne un sujet, un style, un ton et une dur\u00e9e. L'IA comprend tes intentions et cr\u00e9e un brief complet.", icon: <Brain size={32} /> },
  { step: '02', title: 'Script intelligent', desc: "L'IA r\u00e9dige un script optimis\u00e9 pour l'engagement, avec structure narrative et hooks.", icon: <FileText size={32} /> },
  { step: '03', title: 'Voix off naturelle', desc: 'Choisis parmi des dizaines de voix ou clone la tienne. R\u00e9sultat indistinguable du r\u00e9el.', icon: <Mic size={32} /> },
  { step: '04', title: 'Visuels g\u00e9n\u00e9r\u00e9s', desc: "Images IA, vid\u00e9os stock ou mixte. L'IA s\u00e9lectionne les meilleurs visuels pour chaque sc\u00e8ne.", icon: <ImageIcon size={32} /> },
  { step: '05', title: 'Montage automatique', desc: 'Transitions, sous-titres anim\u00e9s, musique de fond et effets sonores ajout\u00e9s automatiquement.', icon: <Scissors size={32} /> },
  { step: '06', title: 'Publication', desc: 'Publie directement sur YouTube, TikTok et Instagram en un clic.', icon: <Upload size={32} /> },
];

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen px-4 py-20">
      <StarField />
      <div className="relative z-10 max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
          <ArrowLeft size={16} /> Retour
        </Link>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold font-syne text-white">Comment \u00e7a marche</h1>
          <p className="mt-4 text-white/50 max-w-xl mx-auto">6 \u00e9tapes automatis\u00e9es pour cr\u00e9er ta vid\u00e9o parfaite.</p>
        </motion.div>
        <div className="space-y-8">
          {steps.map((s, i) => (
            <motion.div key={s.step} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Glass variant="hover" className="p-8 flex flex-col sm:flex-row items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 text-white">
                  {s.icon}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold font-syne text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full">{s.step}</span>
                    <h3 className="text-xl font-bold font-syne text-white">{s.title}</h3>
                  </div>
                  <p className="text-white/50">{s.desc}</p>
                </div>
              </Glass>
            </motion.div>
          ))}
        </div>
        <div className="text-center mt-16">
          <Link href="/signup">
            <GlowBtn size="lg" icon={<ArrowRight size={18} />}>Commencer gratuitement</GlowBtn>
          </Link>
        </div>
      </div>
    </div>
  );
}
