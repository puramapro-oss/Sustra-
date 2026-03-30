'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import { CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface StatusData {
  status: string;
  app: string;
  version: string;
}

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError(true));
  }, []);

  const isOk = data?.status === 'ok';

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      <StarField />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Glass className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-syne text-white mb-2">Statut SUTRA</h1>

          {!data && !error && <div className="shimmer h-20 rounded-xl mt-6" />}

          {isOk && (
            <div className="mt-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle size={24} className="text-emerald-400" />
              <div className="text-left">
                <p className="text-sm font-bold text-emerald-400">Tous les syst\u00e8mes op\u00e9rationnels</p>
                <p className="text-xs text-white/40">Version {data.version}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle size={24} className="text-red-400" />
              <p className="text-sm text-red-400">Service indisponible</p>
            </div>
          )}

          <Link href="/" className="inline-block mt-6 text-sm text-violet-400 hover:text-violet-300 transition-colors">
            Retour \u00e0 l&apos;accueil
          </Link>
        </Glass>
      </motion.div>
    </div>
  );
}
