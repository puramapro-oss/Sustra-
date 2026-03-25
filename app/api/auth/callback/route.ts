import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') ?? '/dashboard';
    const errorParam = requestUrl.searchParams.get('error');
    const errorDescription = requestUrl.searchParams.get('error_description');

    // Handle OAuth error responses
    if (errorParam) {
      console.error(
        `[Auth Callback] OAuth error: ${errorParam} - ${errorDescription}`
      );
      const errorUrl = new URL('/login', requestUrl.origin);
      errorUrl.searchParams.set('error', errorParam);
      if (errorDescription) {
        errorUrl.searchParams.set('error_description', errorDescription);
      }
      return NextResponse.redirect(errorUrl);
    }

    if (!code) {
      console.error('[Auth Callback] No code parameter in callback URL');
      return NextResponse.redirect(
        new URL('/login?error=no_code', requestUrl.origin)
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth Callback] Supabase environment variables not configured');
      return NextResponse.redirect(
        new URL('/login?error=server_config', requestUrl.origin)
      );
    }

    const cookieStore = await cookies();

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll called from Server Component context where cookies
            // cannot be set. Safely ignored when middleware refreshes session.
          }
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback] Code exchange failed:', error.message);
      return NextResponse.redirect(
        new URL(
          `/login?error=auth_callback_error&message=${encodeURIComponent(error.message)}`,
          requestUrl.origin
        )
      );
    }

    // Validate the redirect path to prevent open redirect
    let redirectPath = next;
    if (!redirectPath.startsWith('/')) {
      redirectPath = '/dashboard';
    }

    return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error);

    // Attempt to extract origin for redirect
    try {
      const origin = new URL(request.url).origin;
      return NextResponse.redirect(
        new URL('/login?error=unexpected_error', origin)
      );
    } catch {
      // Absolute fallback
      return NextResponse.json(
        { error: 'Authentication callback failed' },
        { status: 500 }
      );
    }
  }
}
