import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return NextResponse.json(
      { ok: false, code: 'signed_out', message: 'Sign in required.' },
      { status: 401 }
    );
  }

  let body: { extension?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'invalid_json', message: 'Invalid request.' },
      { status: 400 }
    );
  }

  const rawExtension = typeof body.extension === 'string' ? body.extension : 'mp4';
  const extension = rawExtension.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10) || 'mp4';
  const filePath = `${clerkUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { data, error } = await supabaseAdmin.storage
    .from('post-media')
    .createSignedUploadUrl(filePath);

  if (error || !data) {
    console.error('Signed upload URL creation failed:', error);
    return NextResponse.json(
      { ok: false, code: 'signed_url_failed', message: 'Could not prepare video upload.' },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('post-media')
    .getPublicUrl(filePath);

  return NextResponse.json({
    ok: true,
    signedUrl: data.signedUrl,
    token: data.token,
    path: filePath,
    publicUrl: publicUrlData.publicUrl,
  });
}
