'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Glass from '@/components/ui/Glass';
import GlowBtn from '@/components/ui/GlowBtn';
import Input from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import Skeleton from '@/components/ui/Skeleton';
import { supabase } from '@/lib/supabase';
import { PLAN_DEFINITIONS, VOICE_STYLES, VISUAL_STYLES, VIDEO_FORMATS } from '@/lib/constants';
import type { Profile, PlanType, VoiceStyle, VisualStyle, VideoFormat } from '@/lib/types';
import {
  User,
  CreditCard,
  Palette,
  Mic,
  Share2,
  SlidersHorizontal,
  Upload,
  Trash2,
  Check,
  ExternalLink,
  PlaySquare,
  Camera,
  Save,
  Loader2,
  AlertCircle,
  Square,
  Circle,
} from 'lucide-react';

/* ─── Section Header ─── */
function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)]">
          {title}
        </h2>
        <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ─── Color Picker ─── */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg border border-white/20 cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xs text-white/50 font-[family-name:var(--font-exo2)]">{label}</span>
        <span className="text-xs text-white/30 font-mono">{value}</span>
      </div>
    </div>
  );
}

/* ─── Voice Item ─── */
function VoiceItem({
  name,
  onDelete,
  deleting,
}: {
  name: string;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
          <Mic size={14} className="text-cyan-400" />
        </div>
        <span className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">{name}</span>
      </div>
      <button
        onClick={onDelete}
        disabled={deleting}
        className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
        aria-label={`Supprimer ${name}`}
      >
        {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );
}

/* ─── Social Connection ─── */
function SocialConnection({
  name,
  icon,
  connected,
  onConnect,
  onDisconnect,
  loading,
}: {
  name: string;
  icon: React.ReactNode;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/[0.03] border border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <span className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">{name}</span>
          <p className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">
            {connected ? 'Connecté' : 'Non connecté'}
          </p>
        </div>
      </div>
      <GlowBtn
        variant={connected ? 'danger' : 'secondary'}
        size="sm"
        onClick={connected ? onDisconnect : onConnect}
        loading={loading}
      >
        {connected ? 'Déconnecter' : 'Connecter'}
      </GlowBtn>
    </div>
  );
}

/* ─── Main Settings Page ─── */
export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Brand Kit
  const [brandLogo, setBrandLogo] = useState<File | null>(null);
  const [brandLogoPreview, setBrandLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#8b5cf6');
  const [secondaryColor, setSecondaryColor] = useState('#3b82f6');
  const [accentColor, setAccentColor] = useState('#06b6d4');
  const [brandFont, setBrandFont] = useState('Orbitron');
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandSuccess, setBrandSuccess] = useState(false);

  // Voices
  const [clonedVoices, setClonedVoices] = useState<{ id: string; name: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [deletingVoiceId, setDeletingVoiceId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Socials
  const [youtubeConnected, setPlaySquareConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [instagramConnected, setCameraConnected] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  // Preferences
  const [defaultVoice, setDefaultVoice] = useState<VoiceStyle>('cinematic_male');
  const [defaultVisual, setDefaultVisual] = useState<VisualStyle>('cinematic');
  const [defaultFormat, setDefaultFormat] = useState<VideoFormat>('short');
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSuccess, setPrefsSuccess] = useState(false);

  // Error
  const [error, setError] = useState('');

  // Load data
  useEffect(() => {
    async function loadSettings() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          const p = profileData as Profile;
          setProfile(p);
          setName(p.full_name || '');
          setEmail(p.email || '');
          setAvatarPreview(p.avatar_url);
          setPlaySquareConnected(!!p.youtube_channel_id);
        }

        // Load cloned voices
        const { data: voicesData } = await supabase
          .from('cloned_voices')
          .select('id, name')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (voicesData) {
          setClonedVoices(voicesData as { id: string; name: string }[]);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  // ─── Profile Save ───
  const handleProfileSave = useCallback(async () => {
    setProfileSaving(true);
    setProfileSuccess(false);
    setError('');

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      let avatarUrl = profile?.avatar_url || null;

      // Upload avatar if changed
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${session.user.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });

        if (!uploadErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = publicUrl;
        }
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          full_name: name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateErr) throw updateErr;

      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde du profil.');
      console.error(err);
    } finally {
      setProfileSaving(false);
    }
  }, [avatarFile, name, profile]);

  // ─── Avatar Change ───
  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // ─── Brand Kit Save ───
  const handleBrandSave = useCallback(async () => {
    setBrandSaving(true);
    setBrandSuccess(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      let logoUrl = null;
      if (brandLogo) {
        const ext = brandLogo.name.split('.').pop();
        const path = `brand/${session.user.id}/logo.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('brand')
          .upload(path, brandLogo, { upsert: true });

        if (!uploadErr) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('brand').getPublicUrl(path);
          logoUrl = publicUrl;
        }
      }

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          brand_kit: {
            logo_url: logoUrl,
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            accent_color: accentColor,
            font: brandFont,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateErr) throw updateErr;

      setBrandSuccess(true);
      setTimeout(() => setBrandSuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde du brand kit.');
      console.error(err);
    } finally {
      setBrandSaving(false);
    }
  }, [brandLogo, primaryColor, secondaryColor, accentColor, brandFont]);

  // ─── Voice Recording ───
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());

        if (!voiceName.trim()) return;

        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (!session) return;

          // Upload voice sample
          const path = `voices/${session.user.id}/${Date.now()}.webm`;
          await supabase.storage.from('voices').upload(path, audioBlob);

          const {
            data: { publicUrl },
          } = supabase.storage.from('voices').getPublicUrl(path);

          // Clone voice via API
          const res = await fetch('/api/clone-voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: voiceName,
              sample_url: publicUrl,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            setClonedVoices((prev) => [
              { id: data.voice_id || Date.now().toString(), name: voiceName },
              ...prev,
            ]);
            setVoiceName('');
          }
        } catch (err) {
          console.error('Voice clone error:', err);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Accès au microphone refusé.');
    }
  }, [voiceName]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const deleteVoice = useCallback(async (voiceId: string) => {
    setDeletingVoiceId(voiceId);
    try {
      await supabase.from('cloned_voices').delete().eq('id', voiceId);
      setClonedVoices((prev) => prev.filter((v) => v.id !== voiceId));
    } catch (err) {
      console.error('Delete voice error:', err);
    } finally {
      setDeletingVoiceId(null);
    }
  }, []);

  // ─── Social Connections ───
  const handleSocialConnect = useCallback(async (platform: string) => {
    setSocialLoading(platform);
    // In production, this would redirect to OAuth flow
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (platform === 'youtube') setPlaySquareConnected(true);
    if (platform === 'tiktok') setTiktokConnected(true);
    if (platform === 'instagram') setCameraConnected(true);

    setSocialLoading(null);
  }, []);

  const handleSocialDisconnect = useCallback(async (platform: string) => {
    setSocialLoading(platform);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (platform === 'youtube') setPlaySquareConnected(false);
    if (platform === 'tiktok') setTiktokConnected(false);
    if (platform === 'instagram') setCameraConnected(false);

    setSocialLoading(null);
  }, []);

  // ─── Preferences Save ───
  const handlePrefsSave = useCallback(async () => {
    setPrefsSaving(true);
    setPrefsSuccess(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({
          preferences: {
            default_voice: defaultVoice,
            default_visual: defaultVisual,
            default_format: defaultFormat,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.user.id);

      if (updateErr) throw updateErr;

      setPrefsSuccess(true);
      setTimeout(() => setPrefsSuccess(false), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des préférences.');
      console.error(err);
    } finally {
      setPrefsSaving(false);
    }
  }, [defaultVoice, defaultVisual, defaultFormat]);

  // ─── Stripe Portal ───
  const handleManageSubscription = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Stripe portal error:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton variant="text" width="200px" height={32} />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="card" height={250} />
        ))}
      </div>
    );
  }

  const currentPlan = PLAN_DEFINITIONS[profile?.plan || 'free'];

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-orbitron)] text-white">
          Paramètres
        </h1>
        <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mt-1">
          Gérez votre compte et vos préférences
        </p>
      </motion.div>

      {/* Global error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
          >
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400 font-[family-name:var(--font-exo2)]">{error}</p>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400/50 hover:text-red-400 transition-colors"
            >
              &times;
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PROFILE ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<User size={20} className="text-violet-400" />}
            title="Profil"
            description="Vos informations personnelles"
          />

          <div className="space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-white">
                      {name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <Upload size={18} className="text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              </div>
              <div>
                <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">
                  Photo de profil
                </p>
                <p className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">
                  JPG, PNG max 2MB
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
              <Input
                label="Email"
                value={email}
                disabled
                placeholder="votre@email.com"
                helper="L'email ne peut pas être modifié"
              />
            </div>

            <div className="flex justify-end">
              <GlowBtn
                onClick={handleProfileSave}
                loading={profileSaving}
                icon={profileSuccess ? <Check size={16} /> : <Save size={16} />}
              >
                {profileSuccess ? 'Sauvegardé' : 'Sauvegarder'}
              </GlowBtn>
            </div>
          </div>
        </Glass>
      </motion.div>

      {/* ─── SUBSCRIPTION ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<CreditCard size={20} className="text-blue-400" />}
            title="Abonnement"
            description="Gérez votre plan et votre facturation"
          />

          <div className="space-y-5">
            {/* Current plan */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-white font-[family-name:var(--font-orbitron)]">
                    {currentPlan.name}
                  </span>
                  <Badge plan={profile?.plan || 'free'} size="sm" />
                </div>
                <p className="text-sm text-white/40 font-[family-name:var(--font-exo2)] mt-1">
                  {currentPlan.description}
                </p>
              </div>
              <div className="ml-auto text-right">
                <span className="text-2xl font-bold font-[family-name:var(--font-orbitron)] bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  {currentPlan.price_label}
                </span>
                <span className="text-sm text-white/40 font-[family-name:var(--font-exo2)]">/mois</span>
              </div>
            </div>

            {/* Upgrade options */}
            {profile?.plan !== 'empire' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(Object.values(PLAN_DEFINITIONS) as typeof PLAN_DEFINITIONS[PlanType][])
                  .filter(
                    (p) =>
                      p.price_cents > (currentPlan?.price_cents || 0) &&
                      p.type !== 'free'
                  )
                  .map((p) => (
                    <button
                      key={p.type}
                      className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left"
                      onClick={handleManageSubscription}
                    >
                      <div>
                        <span className="text-sm font-bold text-white font-[family-name:var(--font-orbitron)]">
                          {p.name}
                        </span>
                        <p className="text-xs text-white/40 font-[family-name:var(--font-exo2)]">
                          {p.price_label}/mois
                        </p>
                      </div>
                      <ExternalLink size={14} className="text-white/30" />
                    </button>
                  ))}
              </div>
            )}

            {profile?.stripe_subscription_id && (
              <div className="flex justify-end">
                <GlowBtn
                  variant="secondary"
                  onClick={handleManageSubscription}
                  icon={<ExternalLink size={16} />}
                >
                  Gérer l&apos;abonnement
                </GlowBtn>
              </div>
            )}
          </div>
        </Glass>
      </motion.div>

      {/* ─── BRAND KIT ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<Palette size={20} className="text-cyan-400" />}
            title="Brand Kit"
            description="Personnalisez l'identité visuelle de vos vidéos"
          />

          <div className="space-y-5">
            {/* Logo upload */}
            <div className="flex items-center gap-4">
              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-violet-500/30 hover:bg-violet-500/5 transition-all overflow-hidden">
                {brandLogoPreview ? (
                  <img src={brandLogoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <>
                    <Upload size={20} className="text-white/30 mb-1" />
                    <span className="text-[10px] text-white/30 font-[family-name:var(--font-exo2)]">Logo</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setBrandLogo(file);
                    const reader = new FileReader();
                    reader.onload = () => setBrandLogoPreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <div>
                <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)]">Logo de marque</p>
                <p className="text-xs text-white/30 font-[family-name:var(--font-exo2)]">
                  PNG transparent recommandé
                </p>
              </div>
            </div>

            {/* Colors */}
            <div>
              <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] mb-3">
                Couleurs de marque
              </p>
              <div className="flex flex-wrap gap-6">
                <ColorPicker label="Primaire" value={primaryColor} onChange={setPrimaryColor} />
                <ColorPicker label="Secondaire" value={secondaryColor} onChange={setSecondaryColor} />
                <ColorPicker label="Accent" value={accentColor} onChange={setAccentColor} />
              </div>
            </div>

            {/* Font */}
            <div>
              <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] mb-2">
                Police de titre
              </p>
              <div className="flex gap-2">
                {['Orbitron', 'Exo 2', 'Montserrat', 'Poppins', 'Inter'].map((font) => (
                  <button
                    key={font}
                    onClick={() => setBrandFont(font)}
                    className={`px-3 py-2 rounded-lg text-xs font-[family-name:var(--font-exo2)] border transition-all ${
                      brandFont === font
                        ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                        : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <GlowBtn
                onClick={handleBrandSave}
                loading={brandSaving}
                icon={brandSuccess ? <Check size={16} /> : <Save size={16} />}
              >
                {brandSuccess ? 'Sauvegardé' : 'Sauvegarder'}
              </GlowBtn>
            </div>
          </div>
        </Glass>
      </motion.div>

      {/* ─── CLONED VOICES ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<Mic size={20} className="text-rose-400" />}
            title="Voix Clonées"
            description="Clonez votre voix pour la narration"
          />

          <div className="space-y-4">
            {/* Voice list */}
            {clonedVoices.length > 0 && (
              <div className="space-y-2">
                {clonedVoices.map((voice) => (
                  <VoiceItem
                    key={voice.id}
                    name={voice.name}
                    onDelete={() => deleteVoice(voice.id)}
                    deleting={deletingVoiceId === voice.id}
                  />
                ))}
              </div>
            )}

            {clonedVoices.length === 0 && (
              <p className="text-sm text-white/30 text-center py-4 font-[family-name:var(--font-exo2)]">
                Aucune voix clonée. Enregistrez votre voix ci-dessous.
              </p>
            )}

            {/* Record new voice */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5 space-y-3">
              <Input
                label="Nom de la voix"
                placeholder="Ma voix"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              />
              <div className="flex gap-3">
                {!isRecording ? (
                  <GlowBtn
                    onClick={startRecording}
                    disabled={!voiceName.trim()}
                    icon={<Circle size={14} className="text-red-400" />}
                  >
                    Enregistrer
                  </GlowBtn>
                ) : (
                  <GlowBtn
                    variant="danger"
                    onClick={stopRecording}
                    icon={<Square size={14} />}
                  >
                    Arrêter l&apos;enregistrement
                  </GlowBtn>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-400 font-[family-name:var(--font-exo2)]">
                  <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Enregistrement en cours...
                </div>
              )}
            </div>
          </div>
        </Glass>
      </motion.div>

      {/* ─── SOCIAL CONNECTIONS ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<Share2 size={20} className="text-green-400" />}
            title="Réseaux connectés"
            description="Connectez vos comptes pour la publication automatique"
          />

          <div className="space-y-3">
            <SocialConnection
              name="YouTube"
              icon={<PlaySquare size={16} className="text-red-400" />}
              connected={youtubeConnected}
              onConnect={() => handleSocialConnect('youtube')}
              onDisconnect={() => handleSocialDisconnect('youtube')}
              loading={socialLoading === 'youtube'}
            />
            <SocialConnection
              name="TikTok"
              icon={<Camera size={16} className="text-white" />}
              connected={tiktokConnected}
              onConnect={() => handleSocialConnect('tiktok')}
              onDisconnect={() => handleSocialDisconnect('tiktok')}
              loading={socialLoading === 'tiktok'}
            />
            <SocialConnection
              name="Camera"
              icon={<Camera size={16} className="text-pink-400" />}
              connected={instagramConnected}
              onConnect={() => handleSocialConnect('instagram')}
              onDisconnect={() => handleSocialDisconnect('instagram')}
              loading={socialLoading === 'instagram'}
            />
          </div>
        </Glass>
      </motion.div>

      {/* ─── PREFERENCES ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Glass className="p-6">
          <SectionHeader
            icon={<SlidersHorizontal size={20} className="text-amber-400" />}
            title="Préférences"
            description="Configurez les paramètres par défaut"
          />

          <div className="space-y-5">
            {/* Default Voice */}
            <div>
              <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] mb-2">
                Style de voix par défaut
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VOICE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setDefaultVoice(style.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-[family-name:var(--font-exo2)] border transition-all text-left ${
                      defaultVoice === style.id
                        ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                        : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Visual Style */}
            <div>
              <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] mb-2">
                Style visuel par défaut
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VISUAL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setDefaultVisual(style.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-[family-name:var(--font-exo2)] border transition-all text-left ${
                      defaultVisual === style.id
                        ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300'
                        : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Format */}
            <div>
              <p className="text-sm text-white/70 font-[family-name:var(--font-exo2)] mb-2">
                Format par défaut
              </p>
              <div className="flex gap-2">
                {VIDEO_FORMATS.map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setDefaultFormat(fmt.id)}
                    className={`px-4 py-2 rounded-lg text-xs font-[family-name:var(--font-exo2)] border transition-all ${
                      defaultFormat === fmt.id
                        ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                        : 'bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20'
                    }`}
                  >
                    {fmt.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <GlowBtn
                onClick={handlePrefsSave}
                loading={prefsSaving}
                icon={prefsSuccess ? <Check size={16} /> : <Save size={16} />}
              >
                {prefsSuccess ? 'Sauvegardé' : 'Sauvegarder'}
              </GlowBtn>
            </div>
          </div>
        </Glass>
      </motion.div>
    </div>
  );
}
