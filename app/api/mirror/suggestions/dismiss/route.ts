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
    const { suggestion_id } = body;

    if (!suggestion_id || typeof suggestion_id !== 'string') {
      return NextResponse.json(
        { error: 'suggestion_id is required' },
        { status: 400 }
      );
    }

    // Verify the suggestion belongs to the user
    const { data: suggestion, error: fetchError } = await supabase
      .from('ai_suggestions')
      .select('id, status, user_id')
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

    // Dismiss the suggestion
    const { data: updated, error: updateError } = await supabase
      .from('ai_suggestions')
      .update({
        status: 'dismissed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', suggestion_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to dismiss suggestion: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Suggestion dismissed',
      suggestion: updated,
    });
  } catch (error) {
    console.error('[Mirror Suggestions Dismiss] Error:', error);

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
