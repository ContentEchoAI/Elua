import { NextResponse } from 'next/server';

export async function GET() {
  const configured = Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_REDIRECT_URI,
  );

  return NextResponse.json({
    connected: false,
    configured,
    authorizationUrl: configured ? '/api/meta/connect' : null,
    platforms: [
      { name: 'Instagram', connected: false },
      { name: 'Facebook', connected: false },
    ],
    message: configured
      ? 'Meta connection is ready for authorization. Token exchange and storage still need to be completed.'
      : 'Meta publishing setup is not enabled yet.',
  });
}
