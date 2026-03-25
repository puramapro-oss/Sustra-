import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface StyleProfile {
  themes: string[];
  tone: string;
  preferred_duration: string;
  visual_style: string;
  structure_pattern: string;
  hook_style: string;
  strengths: string[];
  best_performing_topics: string[];
  suggested_improvements: string[];
  next_video_suggestions: {
    title: string;
    description: string;
    format: string;
    estimated_viral_score: number;
  }[];
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

const STYLE_ANALYSIS_PROMPT = `You are an expert video content analyst for the SUTRA AI platform. Analyze the following user's video history and create a comprehensive style profile.

Given the user's last videos (with scripts, formats, visual styles, and performance data), produce a JSON object with exactly this structure:

{
  "themes": ["array of recurring themes/topics"],
  "tone": "overall tone description (e.g., 'energetic and conversational', 'calm and educational')",
  "preferred_duration": "preferred video duration range (e.g., '30-60 seconds', '5-10 minutes')",
  "visual_style": "dominant visual style description",
  "structure_pattern": "common video structure pattern (e.g., 'hook-problem-solution-CTA')",
  "hook_style": "how the creator typically opens videos",
  "strengths": ["array of content strengths"],
  "best_performing_topics": ["topics that got best engagement"],
  "suggested_improvements": ["actionable improvement suggestions"],
  "next_video_suggestions": [
    {
      "title": "suggested video title",
      "description": "brief description of the video concept",
      "format": "shorts|longform|carousel",
      "estimated_viral_score": 0.0-1.0
    }
  ]
}

Provide exactly 5 next_video_suggestions. Base viral scores on the creator's niche, trending topics, and their performance history. Return ONLY the JSON object, no markdown or explanation.`;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid Authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseAdmin();

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's last 10 videos with relevant data
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, description, script, format, visual_style, duration_seconds, status, created_at, published_at')
      .eq('user_id', user.id)
      .in('status', ['completed', 'published'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (videosError) {
      return NextResponse.json(
        { error: `Failed to fetch videos: ${videosError.message}` },
        { status: 500 }
      );
    }

    if (!videos || videos.length === 0) {
      return NextResponse.json(
        { error: 'No completed videos found. Create some videos first to analyze your style.' },
        { status: 400 }
      );
    }

    // Fetch performance data for these videos
    const videoIds = videos.map((v: { id: string }) => v.id);
    const { data: analyticsData } = await supabase
      .from('video_analytics')
      .select('video_id, views, likes, comments, retention')
      .in('video_id', videoIds);

    // Merge analytics into videos
    const analyticsMap = new Map<string, { views: number; likes: number; comments: number; retention: number }>();
    if (analyticsData) {
      for (const a of analyticsData) {
        analyticsMap.set(a.video_id, a);
      }
    }

    const videosWithAnalytics = videos.map((v: {
      id: string;
      title: string;
      description: string | null;
      script: string | null;
      format: string | null;
      visual_style: string | null;
      duration_seconds: number | null;
      status: string;
      created_at: string;
      published_at: string | null;
    }) => ({
      ...v,
      performance: analyticsMap.get(v.id) || { views: 0, likes: 0, comments: 0, retention: 0 },
    }));

    // Send to Claude for analysis
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: STYLE_ANALYSIS_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here are the user's last ${videos.length} videos:\n\n${JSON.stringify(videosWithAnalytics, null, 2)}`,
        },
      ],
    });

    // Extract text content from response
    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to get analysis from AI' },
        { status: 500 }
      );
    }

    // Parse the style profile JSON
    let styleProfile: StyleProfile;
    try {
      const jsonText = textContent.text.trim();
      styleProfile = JSON.parse(jsonText);
    } catch {
      // Try to extract JSON from the response if it contains extra text
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: 'Failed to parse style profile from AI response' },
          { status: 500 }
        );
      }
      styleProfile = JSON.parse(jsonMatch[0]);
    }

    // Save the style profile to the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        style_profile: styleProfile,
        style_last_analyzed: new Date().toISOString(),
        style_video_count: videos.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Mirror Analyze] Failed to save style profile:', updateError);
      return NextResponse.json(
        { error: `Failed to save style profile: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Style profile analyzed successfully',
      style_profile: styleProfile,
      videos_analyzed: videos.length,
      analyzed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Mirror Analyze] Error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
