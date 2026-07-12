import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { META_AUTH_SCOPES } from '@/lib/metaAuth';

export async function GET(request: NextRequest) {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI;
  const graphVersion = process.env.META_GRAPH_VERSION || 'v25.0';

  if (!appId || !redirectUri) {
    return NextResponse.json(
      { ok: false, message: 'Meta connection is not configured yet.' },
      { status: 501 },
    );
  }

  const state = crypto.randomBytes(24).toString('hex');
  const authUrl = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);

  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', META_AUTH_SCOPES.join(','));

  const shouldRerequest =
    new URL(request.url).searchParams.get('rerequest') === '1';

  if (shouldRerequest) {
    authUrl.searchParams.set('auth_type', 'rerequest');
  }

  const response = NextResponse.redirect(authUrl.toString());

  response.cookies.set('hummingbird_meta_oauth_state', state, {
    httpOnly: true,
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}
