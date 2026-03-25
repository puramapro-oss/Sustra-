import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
}

const SUGGESTIONS_PROMPT = `You are the SUTRA AI creative director. Based on the user's style profile, generate fresh video suggestions.

Each suggestion should be tailored to the creator's style, strengths, and best-performing topics while also pushing them to try new angles and trending formats.

Return a JSON array of suggestion objects with this structure:
[
  {
    "title": "video title",
    "description": "brief concept description (2-3 sentences)",
    "format": "shorts|longform|carousel",
    "hook": "suggested opening hook line",
    "estimated_viral_score": 0.0-1.0,
    "reasoning": "why this video would work for this creator"
  }
]

Generate exactly 5 suggestions. Return ONLY the JSON array, no markdown or explanation.`;

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    // Check for existing non-expired, pending suggestions
    const { data: existingSuggestions, error: suggestionsError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false });

    if (suggestionsError) {
      return NextResponse.json(
        { error: `Failed to fetch suggestions: ${suggestionsError.message}` },
        { status: 500 }
      );
    }

    // If we have enough suggestions, return them
    if (existingSuggestions && existingSuggestions.length >= 3) {
      return NextResponse.json({ suggestions: existingSuggestions });
    }

    // Check if user has a style profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('style_profile')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.style_profile) {
      return NextResponse.json({
        suggestions: existingSuggestions || [],
        message: 'No style profile found. Run style analysis first to get personalized suggestions.',
      });
    }

    // Generate new suggestions via Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SUGGESTIONS_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Here is the creator's style profile:\n\n${JSON.stringify(profile.style_profile, null, 2)}`,
        },
      ],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({
        suggestions: existingSuggestions || [],
        message: 'Failed to generate new suggestions',
      });
    }

    // Parse suggestions
    let newSuggestions: {
      title: string;
      description: string;
      format: string;
      hook: string;
      estimated_viral_score: number;
      reasoning: string;
    }[];

    try {
      const jsonText = textContent.text.trim();
      newSuggestions = JSON.parse(jsonText);
    } catch {
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return NextResponse.json({
          suggestions: existingSuggestions || [],
          message: 'Failed to parse AI suggestions',
        });
      }
      newSuggestions = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(newSuggestions)) {
      return NextResponse.json({
        suggestions: existingSuggestions || [],
        message: 'Invalid suggestions format from AI',
      });
    }

    // Save new suggestions to the database
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days from now

    const suggestionRows = newSuggestions.map((s) => ({
      user_id: user.id,
      title: s.title,
      description: s.description,
      format: s.format,
      hook: s.hook || null,
      estimated_viral_score: s.estimated_viral_score,
      reasoning: s.reasoning || null,
      status: 'pending',
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    }));

    const { data: insertedSuggestions, error: insertError } = await supabase
      .from('ai_suggestions')
      .insert(suggestionRows)
      .select();

    if (insertError) {
      console.error('[Mirror Suggestions] Failed to save suggestions:', insertError);
      // Still return the generated suggestions even if save fails
      return NextResponse.json({
        suggestions: [...(existingSuggestions || []), ...suggestionRows],
        message: 'Suggestions generated but failed to persist',
      });
    }

    const allSuggestions = [...(existingSuggestions || []), ...(insertedSuggestions || [])];

    return NextResponse.json({ suggestions: allSuggestions });
  } catch (error) {
    console.error('[Mirror Suggestions] Error:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const { suggestion_id, video_id } = body;

    if (!suggestion_id || typeof suggestion_id !== 'string') {
      return NextResponse.json(
        { error: 'suggestion_id is required' },
        { status: 400 }
      );
    }

    // Verify the suggestion belongs to the user
    const { data: suggestion, error: fetchError } = await supabase
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found' },
        { status: 404 }
      );
    }

    if (suggestion.status !== 'pending') {
      return NextResponse.json(
        { error: `Suggestion is already ${suggestion.status}` },
        { status: 400 }
      );
    }

    // Accept the suggestion
    const updateData: Record<string, string> = {
      status: 'accepted',
      updated_at: new Date().toISOString(),
    };

    if (video_id) {
      updateData.linked_video_id = video_id;
    }

    const { data: updated, error: updateError } = await supabase
      .from('ai_suggestions')
      .update(updateData)
      .eq('id', suggestion_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to accept suggestion: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Suggestion accepted',
      suggestion: updated,
    });
  } catch (error) {
    console.error('[Mirror Suggestions Accept] Error:', error);

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
