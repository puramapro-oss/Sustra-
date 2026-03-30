'use client';

import { motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Glass className="p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <WifiOff size={32} className="text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold font-syne text-white mb-2">Hors ligne</h1>
          <p className="text-sm text-white/50 mb-6">Tu sembles \u00eatre hors ligne. V\u00e9rifie ta connexion internet et r\u00e9essaie.</p>
          <GlowBtn onClick={() => window.location.reload()} className="w-full" size="lg">
            R\u00e9essayer
          </GlowBtn>
        </Glass>
      </motion.div>
    </div>
  );
}
