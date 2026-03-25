import { API_ENDPOINTS, DEFAULT_VOICE_MODEL } from './constants';

// ============================================================================
// Types
// ============================================================================

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string | null;
  preview_url: string;
  labels: Record<string, string>;
}

interface VoiceTimestamp {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TTSResult {
  audioBuffer: ArrayBuffer;
  timestamps: VoiceTimestamp | null;
}

// ============================================================================
// Helpers
// ============================================================================

const API_KEY = () => {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error('ELEVENLABS_API_KEY environment variable is not set');
  return key;
};

async function elevenLabsFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'xi-api-key': API_KEY(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `ElevenLabs API error (${response.status}): ${errorBody}`
    );
  }

  return response;
}

// ============================================================================
// Text to Speech
// ============================================================================

export async function textToSpeech(
  text: string,
  voiceId: string,
  model: string = DEFAULT_VOICE_MODEL
): Promise<TTSResult> {
  const url = `${API_ENDPOINTS.ELEVENLABS_TTS}/${voiceId}/with-timestamps`;

  const response = await elevenLabsFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  const data = await response.json();

  // Decode base64 audio
  const audioBytes = Uint8Array.from(atob(data.audio_base64), (c) =>
    c.charCodeAt(0)
  );

  const timestamps: VoiceTimestamp | null = data.alignment
    ? {
        characters: data.alignment.characters,
        character_start_times_seconds: data.alignment.character_start_times_seconds,
        character_end_times_seconds: data.alignment.character_end_times_seconds,
      }
    : null;

  return {
    audioBuffer: audioBytes.buffer,
    timestamps,
  };
}

// ============================================================================
// Text to Speech (simple, no timestamps)
// ============================================================================

export async function textToSpeechSimple(
  text: string,
  voiceId: string,
  model: string = DEFAULT_VOICE_MODEL
): Promise<ArrayBuffer> {
  const url = `${API_ENDPOINTS.ELEVENLABS_TTS}/${voiceId}`;

  const response = await elevenLabsFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true,
      },
    }),
  });

  return response.arrayBuffer();
}

// ============================================================================
// List Voices
// ============================================================================

export async function getVoices(): Promise<ElevenLabsVoice[]> {
  const response = await elevenLabsFetch(API_ENDPOINTS.ELEVENLABS_VOICES);
  const data = await response.json();
  return data.voices as ElevenLabsVoice[];
}

// ============================================================================
// Voice Cloning
// ============================================================================

export async function cloneVoice(
  name: string,
  audioFile: Blob,
  description?: string
): Promise<{ voice_id: string }> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('files', audioFile, 'sample.mp3');
  if (description) {
    formData.append('description', description);
  }
  formData.append('labels', JSON.stringify({ source: 'sustra_clone' }));

  const response = await elevenLabsFetch(API_ENDPOINTS.ELEVENLABS_VOICE_CLONE, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  return { voice_id: data.voice_id };
}

// ============================================================================
// Sound Effects
// ============================================================================

export async function generateSoundEffect(
  prompt: string,
  durationSeconds?: number
): Promise<ArrayBuffer> {
  const body: Record<string, unknown> = {
    text: prompt,
  };

  if (durationSeconds) {
    body.duration_seconds = durationSeconds;
  }

  const response = await elevenLabsFetch(API_ENDPOINTS.ELEVENLABS_SOUND_EFFECTS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return response.arrayBuffer();
}

// ============================================================================
// Music Generation
// ============================================================================

export async function generateMusic(
  prompt: string,
  durationSeconds: number = 30
): Promise<ArrayBuffer> {
  const response = await elevenLabsFetch(API_ENDPOINTS.ELEVENLABS_MUSIC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      duration_seconds: durationSeconds,
      mode: 'quality',
    }),
  });

  return response.arrayBuffer();
}
