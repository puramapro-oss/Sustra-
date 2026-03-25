import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ============================================================================
// Class Names
// ============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Formatting
// ============================================================================

export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatCurrency(cents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString('en-US');
}

// ============================================================================
// String Utilities
// ============================================================================

export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  const id = `${timestamp}${random}`;
  return prefix ? `${prefix}_${id}` : id;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

export function truncate(text: string, maxLength: number, suffix: string = '...'): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length).trimEnd() + suffix;
}

// ============================================================================
// Cost Estimation
// ============================================================================

const COST_PER_UNIT_CENTS = {
  claude_input_1k_tokens: 0.3,
  claude_output_1k_tokens: 1.5,
  elevenlabs_per_char: 0.018,
  fal_flux_pro_per_image: 5,
  fal_kling_per_second: 8,
  fal_sora_per_second: 15,
  fal_runway_per_second: 10,
  shotstack_per_render: 5,
  elevenlabs_music_per_second: 0.5,
  elevenlabs_sfx_per_generation: 2,
} as const;

export function calculateCost(params: {
  scriptChars?: number;
  imageCount?: number;
  videoSeconds?: number;
  videoModel?: string;
  musicSeconds?: number;
  sfxCount?: number;
  renderCount?: number;
}): number {
  let totalCents = 0;

  if (params.scriptChars) {
    const estimatedInputTokens = params.scriptChars / 4;
    const estimatedOutputTokens = params.scriptChars / 2;
    totalCents += (estimatedInputTokens / 1000) * COST_PER_UNIT_CENTS.claude_input_1k_tokens;
    totalCents += (estimatedOutputTokens / 1000) * COST_PER_UNIT_CENTS.claude_output_1k_tokens;
  }

  if (params.scriptChars) {
    totalCents += params.scriptChars * COST_PER_UNIT_CENTS.elevenlabs_per_char;
  }

  if (params.imageCount) {
    totalCents += params.imageCount * COST_PER_UNIT_CENTS.fal_flux_pro_per_image;
  }

  if (params.videoSeconds) {
    const model = params.videoModel || 'kling';
    if (model.includes('sora')) {
      totalCents += params.videoSeconds * COST_PER_UNIT_CENTS.fal_sora_per_second;
    } else if (model.includes('runway')) {
      totalCents += params.videoSeconds * COST_PER_UNIT_CENTS.fal_runway_per_second;
    } else {
      totalCents += params.videoSeconds * COST_PER_UNIT_CENTS.fal_kling_per_second;
    }
  }

  if (params.musicSeconds) {
    totalCents += params.musicSeconds * COST_PER_UNIT_CENTS.elevenlabs_music_per_second;
  }

  if (params.sfxCount) {
    totalCents += params.sfxCount * COST_PER_UNIT_CENTS.elevenlabs_sfx_per_generation;
  }

  if (params.renderCount) {
    totalCents += params.renderCount * COST_PER_UNIT_CENTS.shotstack_per_render;
  }

  return Math.ceil(totalCents);
}

// ============================================================================
// Function Helpers
// ============================================================================

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}
