import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = Boolean(
    process.env.META_APP_ID &&
      process.env.META_APP_SECRET &&
      process.env.META_REDIRECT_URI,
  );

  const clerkUserId = await getCurrentClerkUserId();

  let connected = false;
  let metaUserName: string | null = null;

  if (configured && clerkUserId) {
    const { data, error } = await supabaseAdmin
      .from('meta_connections')
      .select('meta_user_name')
      .eq('clerk_user_id', clerkUserId)
      .maybeSingle();

    if (!error && data) {
      connected = true;
      metaUserName = data.meta_user_name || null;
    }
  }

  return NextResponse.json({
    connected,
    configured,
    authorizationUrl: configured && !connected ? '/api/meta/connect' : null,
    platforms: [
      { name: 'Instagram', connected: false },
      { name: 'Facebook', connected },
    ],
    message: connected
      ? `Facebook connected${metaUserName ? ` as ${metaUserName}` : ''}. Instagram/Page publishing permissions are not enabled yet.`
      : configured
        ? 'Meta connection is ready for authorization.'
        : 'Meta publishing setup is not enabled yet.',
  });
}
