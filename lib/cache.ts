import { createClient } from './supabase';
import type { AssetCache, AssetType, AssetSource } from './types';

// ============================================================================
// Search Cache
// ============================================================================

export async function searchCache(
  type: AssetType,
  tags: string[],
  description?: string,
  limit: number = 10
): Promise<AssetCache[]> {
  const supabase = createClient();

  let query = supabase
    .from('asset_cache')
    .select('*')
    .eq('type', type)
    .order('usage_count', { ascending: false })
    .limit(limit);

  if (tags.length > 0) {
    query = query.overlaps('tags', tags);
  }

  if (description) {
    query = query.ilike('description', `%${description}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Cache search failed: ${error.message}`);
  }

  return (data as AssetCache[]) || [];
}

// ============================================================================
// Add to Cache
// ============================================================================

export async function addToCache(
  type: AssetType,
  tags: string[],
  description: string,
  url: string,
  source: AssetSource,
  metadata: Record<string, unknown> = {}
): Promise<AssetCache> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('asset_cache')
    .insert({
      type,
      tags,
      description,
      url,
      source,
      metadata,
      usage_count: 1,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Cache insert failed: ${error.message}`);
  }

  return data as AssetCache;
}

// ============================================================================
// Increment Usage
// ============================================================================

export async function incrementUsage(assetId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc('increment_asset_usage', {
    asset_id: assetId,
  });

  if (error) {
    // Fallback: manual increment if RPC not available
    const { data: existing } = await supabase
      .from('asset_cache')
      .select('usage_count')
      .eq('id', assetId)
      .single();

    if (existing) {
      await supabase
        .from('asset_cache')
        .update({ usage_count: existing.usage_count + 1 })
        .eq('id', assetId);
    }
  }
}

// ============================================================================
// Find or Create
// ============================================================================

export async function findOrCreate(
  type: AssetType,
  tags: string[],
  description: string,
  generator: () => Promise<{ url: string; source: AssetSource; metadata?: Record<string, unknown> }>
): Promise<AssetCache> {
  // Try to find existing asset
  const cached = await searchCache(type, tags, description, 1);

  if (cached.length > 0) {
    await incrementUsage(cached[0].id);
    return cached[0];
  }

  // Generate new asset
  const result = await generator();

  // Cache it
  return addToCache(type, tags, description, result.url, result.source, result.metadata || {});
}

// ============================================================================
// Delete from Cache
// ============================================================================

export async function deleteFromCache(assetId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('asset_cache')
    .delete()
    .eq('id', assetId);

  if (error) {
    throw new Error(`Cache delete failed: ${error.message}`);
  }
}

// ============================================================================
// Purge Old Cache
// ============================================================================

export async function purgeOldCache(
  olderThanDays: number = 90,
  minUsageCount: number = 0
): Promise<number> {
  const supabase = createClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('asset_cache')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .lte('usage_count', minUsageCount)
    .select('id');

  if (error) {
    throw new Error(`Cache purge failed: ${error.message}`);
  }

  return data?.length ?? 0;
}
