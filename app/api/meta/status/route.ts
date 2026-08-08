import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import { META_AUTH_SCOPES } from '@/lib/metaAuth';
import { getMetaConnection } from '@/lib/metaConnections';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_REDIRECT_URI
  );

  const clerkUserId = await getCurrentClerkUserId();

  if (!configured) {
    return NextResponse.json({
      connected: false,
      configured: false,
      authorizationUrl: null,
      reconnectRequired: false,
      missingScopes: [],
      selectedPage: null,
      instagramAccount: null,
      publishingEnabled: false,
      platforms: [
        { name: 'Instagram', connected: false },
        { name: 'Facebook', connected: false },
      ],
      message: 'Meta publishing setup is not enabled yet.',
    });
  }

  if (!clerkUserId) {
    return NextResponse.json({
      connected: false,
      configured: true,
      authorizationUrl: null,
      reconnectRequired: false,
      missingScopes: [],
      selectedPage: null,
      instagramAccount: null,
      publishingEnabled: false,
      platforms: [
        { name: 'Instagram', connected: false },
        { name: 'Facebook', connected: false },
      ],
      message: 'Sign in before connecting Facebook and Instagram.',
    });
  }

  const { data: connection, error } =
    await getMetaConnection(clerkUserId);

  if (error) {
    console.error('Meta status lookup failed:', error);

    return NextResponse.json(
      {
        connected: false,
        configured: true,
        authorizationUrl: null,
        reconnectRequired: false,
        missingScopes: [],
        selectedPage: null,
        instagramAccount: null,
        publishingEnabled: false,
        platforms: [
          { name: 'Instagram', connected: false },
          { name: 'Facebook', connected: false },
        ],
        message: 'Could not check the Meta connection.',
      },
      { status: 500 }
    );
  }

  const connected = Boolean(connection?.access_token);
  const grantedScopes = Array.isArray(connection?.scopes)
    ? connection.scopes
    : [];

  const missingScopes = connected
    ? META_AUTH_SCOPES.filter(
        (scope) => !grantedScopes.includes(scope)
      )
    : [];

  const tokenExpired = Boolean(
    connected &&
      connection?.expires_at &&
      new Date(connection.expires_at).getTime() < Date.now()
  );
  const reconnectRequired =
    connected && (missingScopes.length > 0 || tokenExpired);

  const selectedPage = connection?.facebook_page_id
    ? {
        id: connection.facebook_page_id,
        name: connection.facebook_page_name || 'Facebook Page',
      }
    : null;

  const instagramAccount = connection?.instagram_account_id
    ? {
        id: connection.instagram_account_id,
        username: connection.instagram_username || null,
      }
    : null;

  const livePublishEnabled =
    process.env.META_LIVE_PUBLISH_ENABLED === 'true';

  const publishingEnabled = Boolean(
    connection?.publishing_enabled && livePublishEnabled
  );

  let message = 'Meta connection is ready for authorization.';

  if (tokenExpired) {
    message =
      'Connection expired - reconnect Facebook and Instagram to keep publishing.';
  } else if (reconnectRequired) {
    message =
      'Reconnect Facebook and Instagram to approve access.';
  } else if (connected && !selectedPage) {
    message =
      'Facebook is authorized. Choose the Page you want Elua to use.';
  } else if (selectedPage && instagramAccount) {
    message =
      `${selectedPage.name} and ` +
      `${instagramAccount.username ? `@${instagramAccount.username}` : 'Instagram'} ` +
      (publishingEnabled
        ? 'are connected. Facebook publishing is enabled.'
        : 'are connected. Publishing is still disabled.');
  } else if (selectedPage) {
    message =
      `${selectedPage.name} is connected. ` +
      'No linked Instagram professional account was found. ' +
      (publishingEnabled
        ? 'Facebook publishing is enabled.'
        : 'Publishing is still disabled.');
  }

  return NextResponse.json({
    connected,
    configured: true,
    authorizationUrl:
      !connected
        ? '/api/meta/connect'
        : reconnectRequired
          ? '/api/meta/connect?rerequest=1'
          : null,
    reconnectRequired,
    missingScopes,
    selectedPage,
    instagramAccount,
    publishingEnabled,
    platforms: [
      {
        name: 'Instagram',
        connected: Boolean(instagramAccount),
      },
      {
        name: 'Facebook',
        connected: Boolean(selectedPage),
      },
    ],
    message,
  });
}
