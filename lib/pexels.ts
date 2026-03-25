import { API_ENDPOINTS } from './constants';

// ============================================================================
// Types
// ============================================================================

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  alt: string;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: PexelsVideoFile[];
  video_pictures: { id: number; picture: string; nr: number }[];
}

export interface PexelsVideoFile {
  id: number;
  quality: 'hd' | 'sd' | 'uhd';
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

interface PexelsPhotoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  next_page?: string;
}

interface PexelsVideoSearchResponse {
  total_results: number;
  page: number;
  per_page: number;
  videos: PexelsVideo[];
  next_page?: string;
}

// ============================================================================
// Helpers
// ============================================================================

const API_KEY = () => {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error('PEXELS_API_KEY environment variable is not set');
  return key;
};

async function pexelsFetch(url: string): Promise<Response> {
  const response = await fetch(url, {
    headers: {
      Authorization: API_KEY(),
    },
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`Pexels API error (${response.status}): ${errorBody}`);
  }

  return response;
}

// ============================================================================
// Photo Search
// ============================================================================

export async function searchPhotos(
  query: string,
  perPage: number = 15,
  page: number = 1
): Promise<PexelsPhotoSearchResponse> {
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(perPage, 80)),
    page: String(page),
  });

  const response = await pexelsFetch(
    `${API_ENDPOINTS.PEXELS_PHOTOS}/search?${params}`
  );
  return response.json();
}

// ============================================================================
// Video Search
// ============================================================================

export async function searchVideos(
  query: string,
  perPage: number = 15,
  page: number = 1
): Promise<PexelsVideoSearchResponse> {
  const params = new URLSearchParams({
    query,
    per_page: String(Math.min(perPage, 80)),
    page: String(page),
  });

  const response = await pexelsFetch(
    `${API_ENDPOINTS.PEXELS_VIDEOS}/search?${params}`
  );
  return response.json();
}

// ============================================================================
// Get Single Photo
// ============================================================================

export async function getPhoto(id: number): Promise<PexelsPhoto> {
  const response = await pexelsFetch(
    `${API_ENDPOINTS.PEXELS_PHOTOS}/photos/${id}`
  );
  return response.json();
}

// ============================================================================
// Get Single Video
// ============================================================================

export async function getVideo(id: number): Promise<PexelsVideo> {
  const response = await pexelsFetch(
    `${API_ENDPOINTS.PEXELS_VIDEOS}/videos/${id}`
  );
  return response.json();
}

// ============================================================================
// Helpers
// ============================================================================

export function getBestVideoFile(
  video: PexelsVideo,
  preferredQuality: 'hd' | 'sd' = 'hd',
  maxWidth?: number
): PexelsVideoFile | null {
  const files = video.video_files
    .filter((f) => f.file_type === 'video/mp4')
    .sort((a, b) => b.width - a.width);

  if (maxWidth) {
    const filtered = files.filter((f) => f.width <= maxWidth);
    if (filtered.length > 0) return filtered[0];
  }

  const preferred = files.find((f) => f.quality === preferredQuality);
  if (preferred) return preferred;

  return files[0] || null;
}
