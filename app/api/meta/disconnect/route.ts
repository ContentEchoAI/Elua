import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import { deleteMetaConnection } from '@/lib/metaConnections';

export const dynamic = 'force-dynamic';

export async function POST() {
  const clerkUserId = await getCurrentClerkUserId();
  if (!clerkUserId) {
    return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  }
  const { error } = await deleteMetaConnection(clerkUserId);
  if (error) {
    console.error('Meta disconnect failed:', error);
    return NextResponse.json({ error: 'Could not disconnect. Try again.' }, { status: 500 });
  }
  return NextResponse.json({ disconnected: true });
}
