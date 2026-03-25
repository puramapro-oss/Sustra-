import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

interface OptimalTimeSlot {
  day: string;
  hour: number;
  score: number;
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase configuration missing');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(url, key);
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
    const { niche, platform, country } = body;

    if (!niche || typeof niche !== 'string') {
      return NextResponse.json(
        { error: 'niche is required' },
        { status: 400 }
      );
    }

    if (!platform || typeof platform !== 'string') {
      return NextResponse.json(
        { error: 'platform is required' },
        { status: 400 }
      );
    }

    if (!country || typeof country !== 'string') {
      return NextResponse.json(
        { error: 'country is required' },
        { status: 400 }
      );
    }

    const prompt = `You are a social media analytics expert. Analyze the optimal posting times for content in the "${niche}" niche on ${platform} targeting an audience in ${country}.

Return a JSON array of the top 10 optimal posting time slots. Each slot should have:
- "day": day of the week (e.g., "Monday", "Tuesday")
- "hour": hour in 24h format (0-23) in the local timezone of ${country}
- "score": engagement score from 0.0 to 1.0 (1.0 being the best)

Consider:
1. Peak usage hours for ${platform} in ${country}
2. Content consumption patterns for the "${niche}" niche
3. Competition levels at different times
4. Audience behavior patterns

Return ONLY the JSON array, no other text. Example format:
[{"day": "Monday", "hour": 18, "score": 0.95}]`;

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    // Extract text content from response
    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Failed to get recommendation from AI' },
        { status: 500 }
      );
    }

    let optimalTimes: OptimalTimeSlot[];
    try {
      // Parse the JSON response, handling potential markdown code blocks
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      optimalTimes = JSON.parse(jsonText);
    } catch {
      console.error('[Autopilot Optimal Times] Failed to parse AI response:', textContent.text);
      return NextResponse.json(
        { error: 'Failed to parse AI recommendation' },
        { status: 500 }
      );
    }

    // Validate the parsed data
    if (!Array.isArray(optimalTimes)) {
      return NextResponse.json(
        { error: 'Invalid AI response format' },
        { status: 500 }
      );
    }

    // Store optimal times in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        optimal_posting_times: optimalTimes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Autopilot Optimal Times] Update error:', updateError);
      // Still return the times even if storage fails
    }

    return NextResponse.json({
      optimal_times: optimalTimes,
      niche,
      platform,
      country,
    });
  } catch (error) {
    console.error('[Autopilot Optimal Times] Error:', error);

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
