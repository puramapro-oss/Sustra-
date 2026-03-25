import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ConfigureRequestBody {
  niche: string;
  frequency: string;
  formats: string[];
  networks: string[];
  voice_style: string;
  visual_style: string;
  publish_mode: string;
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

    const body: ConfigureRequestBody = await request.json();

    if (!body.niche || typeof body.niche !== 'string') {
      return NextResponse.json(
        { error: 'niche is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.frequency || typeof body.frequency !== 'string') {
      return NextResponse.json(
        { error: 'frequency is required and must be a string' },
        { status: 400 }
      );
    }

    if (!body.publish_mode || typeof body.publish_mode !== 'string') {
      return NextResponse.json(
        { error: 'publish_mode is required and must be a string' },
        { status: 400 }
      );
    }

    const styleConfig = {
      formats: body.formats || [],
      networks: body.networks || [],
      voice_style: body.voice_style || 'default',
      visual_style: body.visual_style || 'default',
    };

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        autopilot_niche: body.niche,
        autopilot_frequency: body.frequency,
        autopilot_style: styleConfig,
        autopilot_mode: body.publish_mode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('[Autopilot Configure] Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to save configuration: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Autopilot configuration saved',
      config: {
        niche: data.autopilot_niche,
        frequency: data.autopilot_frequency,
        style: data.autopilot_style,
        mode: data.autopilot_mode,
      },
    });
  } catch (error) {
    console.error('[Autopilot Configure] Error:', error);

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
