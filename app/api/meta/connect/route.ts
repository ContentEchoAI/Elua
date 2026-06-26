import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

const META_AUTH_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
];

export async function GET() {
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
