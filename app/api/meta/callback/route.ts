import { NextRequest, NextResponse } from 'next/server';

function redirectHome(request: NextRequest, status: string) {
  const appBaseUrl = process.env.META_APP_BASE_URL || new URL('/', request.url).origin;
  const redirectUrl = new URL('/', appBaseUrl);
  redirectUrl.searchParams.set('meta', status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get('hummingbird_meta_oauth_state')?.value;

  if (error) return redirectHome(request, 'connection_error');
  if (!state || !expectedState || state !== expectedState) return redirectHome(request, 'state_error');
  if (!code) return redirectHome(request, 'missing_code');

  const response = redirectHome(request, 'connection_ready');
  response.cookies.delete('hummingbird_meta_oauth_state');
  return response;
}
