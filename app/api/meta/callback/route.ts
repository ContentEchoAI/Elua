import { NextRequest, NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  exchangeMetaCodeForToken,
  fetchMetaProfile,
} from '@/lib/metaAuth';
import { saveMetaConnection } from '@/lib/metaConnections';

function redirectHome(request: NextRequest, status: string) {
  const appBaseUrl =
    process.env.META_APP_BASE_URL || new URL('/', request.url).origin;
  const redirectUrl = new URL('/', appBaseUrl);
  redirectUrl.searchParams.set('meta', status);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');
  const expectedState = request.cookies.get(
    'hummingbird_meta_oauth_state'
  )?.value;

  if (error) return redirectHome(request, 'connection_error');
  if (!state || !expectedState || state !== expectedState) {
    return redirectHome(request, 'state_error');
  }
  if (!code) return redirectHome(request, 'missing_code');

  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return redirectHome(request, 'signed_out');
  }

  try {
    const token = await exchangeMetaCodeForToken(code);
    const profile = await fetchMetaProfile(token.accessToken);

    const { error: saveError } = await saveMetaConnection({
      clerkUserId,
      profile,
      token,
    });

    if (saveError) {
      console.error('Meta connection save failed:', saveError);
      return redirectHome(request, 'save_error');
    }

    const response = redirectHome(request, 'connected');
    response.cookies.delete('hummingbird_meta_oauth_state');

    return response;
  } catch (callbackError) {
    console.error('Meta callback failed:', callbackError);
    return redirectHome(request, 'callback_error');
  }
}
