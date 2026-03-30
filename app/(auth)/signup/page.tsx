'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import StarField from '@/components/layout/StarField';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import Input from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { Sparkles } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Check URL for referral code
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      // Validate the referral code
      fetch(`/api/referrals/validate-code?code=${encodeURIComponent(ref)}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid && data.referrerName) {
            setReferrerName(data.referrerName);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Create profile in profiles table
      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          full_name: name,
          plan: 'free',
          credits_used_photos: 0,
          credits_used_shorts: 0,
          credits_used_longs: 0,
          onboarding_complete: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
      }

      router.push('/dashboard');
    } catch {
      setError('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    setError('');
    setGoogleLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError('Une erreur inattendue est survenue.');
      setGoogleLoading(false);
    }
  }

  return (
    <>
      <StarField />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <Glass glow="violet" className="p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-violet-500 to-cyan-400 bg-clip-text text-transparent">
              SUTRA
            </h1>
            <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mt-1">
              Crée ton compte gratuitement
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-[family-name:var(--font-exo2)]"
            >
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Nom"
              type="text"
              placeholder="Ton nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="ton@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Mot de passe"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helper="Minimum 8 caractères"
            />

            <Input
              label="Code parrain (optionnel)"
              type="text"
              placeholder="SUTRA-XXXX-0000"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
            />

            {referrerName && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-sutra-green/10 border border-sutra-green/20 text-sutra-green text-sm"
              >
                -50% sur ton premier mois grâce à {referrerName} !
              </motion.div>
            )}

            <GlowBtn
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Créer mon compte
            </GlowBtn>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Google */}
          <GlowBtn
            variant="secondary"
            className="w-full"
            size="lg"
            icon={<GoogleIcon />}
            loading={googleLoading}
            onClick={handleGoogleSignup}
          >
            Continuer avec Google
          </GlowBtn>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-white/40 font-[family-name:var(--font-exo2)]">
            Déjà un compte ?{' '}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              Se connecter
            </Link>
          </p>
        </Glass>
      </motion.div>
    </>
  );
}
