import { NextResponse } from 'next/server';

export async function GET() {
  const hasMetaAppId = Boolean(process.env.META_APP_ID);
  const hasMetaAppSecret = Boolean(process.env.META_APP_SECRET);
  const hasMetaRedirectUri = Boolean(process.env.META_REDIRECT_URI);

  return NextResponse.json({
    connected: false,
    configured: hasMetaAppId && hasMetaAppSecret && hasMetaRedirectUri,
    platforms: [
      {
        name: 'Instagram',
        connected: false,
      },
      {
        name: 'Facebook',
        connected: false,
      },
    ],
    message:
      hasMetaAppId && hasMetaAppSecret && hasMetaRedirectUri
        ? 'Meta app settings are present. OAuth and token storage still need to be connected.'
        : 'Meta connection is not configured yet. Add Meta app environment variables before enabling publishing.',
  });
}
