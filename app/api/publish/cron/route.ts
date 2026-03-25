import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

interface PublishResult {
  post_id: string;
  video_id: string;
  platform: string;
  success: boolean;
  error?: string;
}

async function callPublishRoute(
  baseUrl: string,
  platform: string,
  videoId: string,
  title: string,
  description: string,
  authToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `${baseUrl}/api/publish/${platform}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        video_id: videoId,
        title,
        description,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data?.error || `Publish failed (${response.status})` };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown publish error',
    };
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const results: PublishResult[] = [];

    // Fetch all scheduled posts that are due for publishing
    const { data: duePosts, error: fetchError } = await supabase
      .from('scheduled_posts')
      .select(`
        id,
        video_id,
        platform,
        status,
        user_id,
        videos!inner(id, title, description, video_url, user_id),
        profiles!inner(id, autopilot_mode)
      `)
      .lte('scheduled_at', now)
      .in('status', ['approved', 'scheduled'])
      .order('scheduled_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[Publish Cron] Failed to fetch due posts:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch scheduled posts: ${fetchError.message}` },
        { status: 500 }
      );
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        message: 'No posts due for publishing',
        processed: 0,
        results: [],
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`;

    for (const post of duePosts) {
      const postId = post.id as string;
      const videoId = post.video_id as string;
      const platform = post.platform as string;
      const status = post.status as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const videoData = post.videos as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const profileData = post.profiles as any;

      // For scheduled (auto mode) posts, verify the user has autopilot_mode = 'auto'
      if (status === 'scheduled') {
        if (profileData?.autopilot_mode !== 'auto') {
          // Skip: user is in approval mode but this post hasn't been explicitly approved
          results.push({
            post_id: postId,
            video_id: videoId,
            platform,
            success: false,
            error: 'Skipped: user autopilot mode requires approval',
          });
          continue;
        }
      }

      // For approved posts, proceed regardless of autopilot mode
      if (!videoData?.video_url) {
        // Mark as failed - video not ready
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: 'Video has not been rendered yet',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);

        results.push({
          post_id: postId,
          video_id: videoId,
          platform,
          success: false,
          error: 'Video has not been rendered yet',
        });
        continue;
      }

      // Validate platform
      const supportedPlatforms = ['youtube', 'tiktok', 'instagram'];
      if (!supportedPlatforms.includes(platform)) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: `Unsupported platform: ${platform}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);

        results.push({
          post_id: postId,
          video_id: videoId,
          platform,
          success: false,
          error: `Unsupported platform: ${platform}`,
        });
        continue;
      }

      // Mark as processing to prevent duplicate runs
      await supabase
        .from('scheduled_posts')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId);

      // Get a service-level auth token for the user
      // We use the admin client to create a token for internal publish calls
      const { data: sessionData } = await supabase.auth.admin.getUserById(
        post.user_id as string
      );

      if (!sessionData?.user) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: 'User not found',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);

        results.push({
          post_id: postId,
          video_id: videoId,
          platform,
          success: false,
          error: 'User not found',
        });
        continue;
      }

      // Generate a temporary session for the publish call
      const { data: impersonatedSession } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: sessionData.user.email || '',
      });

      // Use the service role key directly for internal API calls
      const publishResult = await callPublishRoute(
        baseUrl,
        platform,
        videoId,
        videoData.title || 'Untitled',
        videoData.description || '',
        impersonatedSession?.properties?.hashed_token || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      if (publishResult.success) {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);
      } else {
        await supabase
          .from('scheduled_posts')
          .update({
            status: 'failed',
            error_message: publishResult.error || 'Unknown error',
            updated_at: new Date().toISOString(),
          })
          .eq('id', postId);
      }

      results.push({
        post_id: postId,
        video_id: videoId,
        platform,
        success: publishResult.success,
        error: publishResult.error,
      });

      // Log the result
      await supabase.from('publish_logs').insert({
        scheduled_post_id: postId,
        video_id: videoId,
        platform,
        status: publishResult.success ? 'success' : 'failed',
        error_message: publishResult.error || null,
        created_at: new Date().toISOString(),
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      message: `Cron job completed. ${successCount} published, ${failCount} failed.`,
      processed: results.length,
      success_count: successCount,
      fail_count: failCount,
      results,
    });
  } catch (error) {
    console.error('[Publish Cron] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
