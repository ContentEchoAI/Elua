export const META_AUTH_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
] as const;

type MetaTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
  };
};

type MetaProfileResponse = {
  id?: string;
  name?: string;
  error?: {
    message?: string;
  };
};

type MetaPermissionsResponse = {
  data?: {
    permission?: string;
    status?: string;
  }[];
  error?: {
    message?: string;
  };
};

export type MetaTokenResult = {
  accessToken: string;
  tokenType: string | null;
  expiresAt: string | null;
  scopes: string[];
};

export type MetaProfile = {
  id: string;
  name: string | null;
};

function getMetaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI;
  const graphVersion = process.env.META_GRAPH_VERSION || 'v25.0';

  if (!appId || !appSecret || !redirectUri) {
    throw new Error('Missing Meta OAuth environment variables.');
  }

  return { appId, appSecret, redirectUri, graphVersion };
}

export async function exchangeMetaCodeForToken(
  code: string
): Promise<MetaTokenResult> {
  const { appId, appSecret, redirectUri, graphVersion } = getMetaConfig();

  const tokenUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/oauth/access_token`
  );

  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('code', code);

  const response = await fetch(tokenUrl.toString(), { cache: 'no-store' });
  const data = (await response.json()) as MetaTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(data.error?.message || 'Meta token exchange failed.');
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type || null,
    expiresAt:
      typeof data.expires_in === 'number'
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null,
    scopes: [],
  };
}

export async function fetchGrantedMetaScopes(
  accessToken: string
): Promise<string[]> {
  const { graphVersion } = getMetaConfig();

  const permissionsUrl = new URL(
    `https://graph.facebook.com/${graphVersion}/me/permissions`
  );
  permissionsUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(permissionsUrl.toString(), {
    cache: 'no-store',
  });
  const data = (await response.json()) as MetaPermissionsResponse;

  if (!response.ok || !Array.isArray(data.data)) {
    throw new Error(
      data.error?.message || 'Meta permission check failed.'
    );
  }

  return data.data
    .filter(
      (item) =>
        item.status === 'granted' &&
        typeof item.permission === 'string'
    )
    .map((item) => item.permission as string);
}

export async function fetchMetaProfile(
  accessToken: string
): Promise<MetaProfile> {
  const { graphVersion } = getMetaConfig();

  const profileUrl = new URL(`https://graph.facebook.com/${graphVersion}/me`);
  profileUrl.searchParams.set('fields', 'id,name');
  profileUrl.searchParams.set('access_token', accessToken);

  const response = await fetch(profileUrl.toString(), { cache: 'no-store' });
  const data = (await response.json()) as MetaProfileResponse;

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || 'Meta profile fetch failed.');
  }

  return {
    id: data.id,
    name: data.name || null,
  };
}
