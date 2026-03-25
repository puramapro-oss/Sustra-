import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const enabled = Boolean(body.enabled);

    // Fetch current profile to check config exists when turning on
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('autopilot_niche, autopilot_frequency, autopilot_mode, autopilot_enabled')
      .eq('id', user.id)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Validate config exists if turning on
    if (enabled) {
      if (!profile.autopilot_niche || !profile.autopilot_frequency || !profile.autopilot_mode) {
        return NextResponse.json(
          {
            error: 'Autopilot configuration is incomplete. Please configure autopilot settings before enabling.',
            missing: {
              niche: !profile.autopilot_niche,
              frequency: !profile.autopilot_frequency,
              mode: !profile.autopilot_mode,
            },
          },
          { status: 400 }
        );
      }
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        autopilot_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[Autopilot Toggle] Update error:', updateError);
      return NextResponse.json(
        { error: `Failed to toggle autopilot: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Autopilot ${enabled ? 'enabled' : 'disabled'}`,
      autopilot_enabled: enabled,
    });
  } catch (error) {
    console.error('[Autopilot Toggle] Error:', error);

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
