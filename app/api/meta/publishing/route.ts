import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  getMetaConnection,
  setMetaPublishing,
} from '@/lib/metaConnections';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const clerkUserId = await getCurrentClerkUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }
  let enabled = false;
  try {
    const body = await request.json();
    enabled = body?.enabled === true;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (enabled) {
    const { data: connection, error } = await getMetaConnection(clerkUserId);
    if (error) {
      console.error('Publishing precheck failed:', error);
      return NextResponse.json(
        { error: 'Could not check the connection.' },
        { status: 500 }
      );
    }
    if (!connection?.access_token || !connection?.facebook_page_id) {
      return NextResponse.json(
        {
          error:
            'Connect Facebook and choose a Page before enabling publishing.',
        },
        { status: 409 }
      );
    }
  }
  const { error } = await setMetaPublishing({ clerkUserId, enabled });
  if (error) {
    console.error('Set publishing failed:', error);
    return NextResponse.json(
      { error: 'Could not update publishing.' },
      { status: 500 }
    );
  }
  return NextResponse.json({ publishingEnabled: enabled });
}
