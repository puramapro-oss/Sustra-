import { create } from 'zustand';
import type {
  Profile,
  Video,
  PipelineConfig,
  PipelineProgress,
  GenerationStatus,
  EditorTimeline,
  EditorTrack,
  EditorClip,
  ChatMessage,
  Script,
} from './types';
import { createClient } from './supabase';

// ============================================================================
// Auth Store
// ============================================================================

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  setUser: (user: { id: string; email: string } | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,

  signIn: async (email, password) => {
    const supabase = createClient();
    set({ loading: true });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ loading: false });
      throw error;
    }

    set({
      user: data.user ? { id: data.user.id, email: data.user.email! } : null,
      loading: false,
    });

    if (data.user) {
      await get().fetchProfile();
    }
  },

  signUp: async (email, password, fullName) => {
    const supabase = createClient();
    set({ loading: true });

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      set({ loading: false });
      throw error;
    }

    set({
      user: data.user ? { id: data.user.id, email: data.user.email! } : null,
      loading: false,
    });
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null, profile: null, loading: false });
  },

  signInWithGoogle: async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      },
    });

    if (error) throw error;
  },

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      set({ profile: null });
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!error && data) {
      set({ profile: data as Profile });
    }
  },
}));

// ============================================================================
// Video Store
// ============================================================================

interface VideoState {
  currentVideo: Video | null;
  videos: Video[];
  loading: boolean;
  setCurrentVideo: (video: Video | null) => void;
  fetchVideos: () => Promise<void>;
  createVideo: (video: Partial<Video>) => Promise<Video>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<void>;
  deleteVideo: (id: string) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set, get) => ({
  currentVideo: null,
  videos: [],
  loading: false,

  setCurrentVideo: (video) => set({ currentVideo: video }),

  fetchVideos: async () => {
    const supabase = createClient();
    set({ loading: true });

    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      set({ loading: false });
      throw error;
    }

    set({ videos: (data as Video[]) || [], loading: false });
  },

  createVideo: async (video) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id: user.id,
        title: video.title || 'Untitled Video',
        description: video.description || null,
        slug: video.slug || `video-${Date.now()}`,
        format: video.format || 'short',
        status: video.status || 'draft',
        ...video,
      })
      .select()
      .single();

    if (error) throw error;

    const newVideo = data as Video;
    set({ videos: [newVideo, ...get().videos] });
    return newVideo;
  },

  updateVideo: async (id, updates) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('videos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    set({
      videos: get().videos.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      currentVideo:
        get().currentVideo?.id === id
          ? { ...get().currentVideo!, ...updates }
          : get().currentVideo,
    });
  },

  deleteVideo: async (id) => {
    const supabase = createClient();

    const { error } = await supabase.from('videos').delete().eq('id', id);

    if (error) throw error;

    set({
      videos: get().videos.filter((v) => v.id !== id),
      currentVideo: get().currentVideo?.id === id ? null : get().currentVideo,
    });
  },
}));

// ============================================================================
// Pipeline Store
// ============================================================================

interface PipelineState {
  status: GenerationStatus;
  progress: PipelineProgress | null;
  currentStep: number;
  config: PipelineConfig | null;
  result: { video_url: string | null; script: Script | null } | null;
  error: string | null;
  startPipeline: (config: PipelineConfig) => Promise<void>;
  cancelPipeline: () => void;
  setProgress: (progress: PipelineProgress) => void;
  reset: () => void;
}

export const usePipelineStore = create<PipelineState>((set, _get) => {
  let abortController: AbortController | null = null;

  return {
    status: 'idle',
    progress: null,
    currentStep: 0,
    config: null,
    result: null,
    error: null,

    startPipeline: async (config) => {
      abortController = new AbortController();

      set({
        status: 'scripting',
        config,
        progress: null,
        currentStep: 1,
        result: null,
        error: null,
      });

      try {
        const response = await fetch('/api/pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Pipeline request failed' }));
          throw new Error(errorData.error || 'Pipeline request failed');
        }

        const result = await response.json();

        set({
          status: result.status === 'failed' ? 'failed' : 'completed',
          result: {
            video_url: result.video_url,
            script: result.script,
          },
          error: result.status === 'failed' ? 'Pipeline failed' : null,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          set({ status: 'idle', error: null });
          return;
        }

        set({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    cancelPipeline: () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      set({ status: 'idle', progress: null, currentStep: 0, error: null });
    },

    setProgress: (progress) => {
      set({ progress, status: progress.status, currentStep: progress.step });
    },

    reset: () => {
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      set({
        status: 'idle',
        progress: null,
        currentStep: 0,
        config: null,
        result: null,
        error: null,
      });
    },
  };
});

// ============================================================================
// Editor Store
// ============================================================================

interface EditorState {
  timeline: EditorTimeline;
  selectedClip: string | null;
  selectedTrack: string | null;
  playhead: number;
  playing: boolean;
  zoom: number;
  duration: number;
  updateTimeline: (timeline: Partial<EditorTimeline>) => void;
  selectClip: (clipId: string | null) => void;
  selectTrack: (trackId: string | null) => void;
  setPlayhead: (time: number) => void;
  setPlaying: (playing: boolean) => void;
  setZoom: (zoom: number) => void;
  addTrack: (track: EditorTrack) => void;
  removeTrack: (trackId: string) => void;
  addClip: (trackId: string, clip: EditorClip) => void;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<EditorClip>) => void;
  reset: () => void;
}

const defaultTimeline: EditorTimeline = {
  tracks: [],
  duration: 0,
  zoom: 1,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  timeline: { ...defaultTimeline },
  selectedClip: null,
  selectedTrack: null,
  playhead: 0,
  playing: false,
  zoom: 1,
  duration: 0,

  updateTimeline: (updates) => {
    set({ timeline: { ...get().timeline, ...updates } });
  },

  selectClip: (clipId) => set({ selectedClip: clipId }),
  selectTrack: (trackId) => set({ selectedTrack: trackId }),
  setPlayhead: (time) => set({ playhead: Math.max(0, time) }),
  setPlaying: (playing) => set({ playing }),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }),

  addTrack: (track) => {
    const timeline = get().timeline;
    set({
      timeline: {
        ...timeline,
        tracks: [...timeline.tracks, track],
      },
    });
  },

  removeTrack: (trackId) => {
    const timeline = get().timeline;
    set({
      timeline: {
        ...timeline,
        tracks: timeline.tracks.filter((t) => t.id !== trackId),
      },
      selectedTrack: get().selectedTrack === trackId ? null : get().selectedTrack,
    });
  },

  addClip: (trackId, clip) => {
    const timeline = get().timeline;
    set({
      timeline: {
        ...timeline,
        tracks: timeline.tracks.map((track) =>
          track.id === trackId
            ? { ...track, clips: [...track.clips, clip] }
            : track
        ),
      },
    });
  },

  removeClip: (clipId) => {
    const timeline = get().timeline;
    set({
      timeline: {
        ...timeline,
        tracks: timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.filter((c) => c.id !== clipId),
        })),
      },
      selectedClip: get().selectedClip === clipId ? null : get().selectedClip,
    });
  },

  updateClip: (clipId, updates) => {
    const timeline = get().timeline;
    set({
      timeline: {
        ...timeline,
        tracks: timeline.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) =>
            clip.id === clipId ? { ...clip, ...updates } : clip
          ),
        })),
      },
    });
  },

  reset: () => {
    set({
      timeline: { ...defaultTimeline },
      selectedClip: null,
      selectedTrack: null,
      playhead: 0,
      playing: false,
      zoom: 1,
      duration: 0,
    });
  },
}));

// ============================================================================
// Chat Store
// ============================================================================

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  toggleChat: () => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isOpen: false,
  isLoading: false,

  sendMessage: async (content) => {
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    set({
      messages: [...get().messages, userMessage],
      isLoading: true,
    });

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...get().messages],
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: Date.now(),
        metadata: {
          action: data.action,
          videoId: data.videoId,
          suggestion: data.suggestion,
        },
      };

      set({
        messages: [...get().messages, assistantMessage],
        isLoading: false,
      });
    } catch (_error) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };

      set({
        messages: [...get().messages, errorMessage],
        isLoading: false,
      });
    }
  },

  toggleChat: () => set({ isOpen: !get().isOpen }),
  clearMessages: () => set({ messages: [] }),
}));

// ============================================================================
// UI Store
// ============================================================================

interface UIState {
  sidebarOpen: boolean;
  bootComplete: boolean;
  activeModal: string | null;
  theme: 'dark' | 'light';
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBootComplete: (complete: boolean) => void;
  setActiveModal: (modal: string | null) => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarOpen: true,
  bootComplete: false,
  activeModal: null,
  theme: 'dark',

  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setBootComplete: (complete) => set({ bootComplete: complete }),
  setActiveModal: (modal) => set({ activeModal: modal }),
}));
