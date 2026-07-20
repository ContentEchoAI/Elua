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

  let body: { dataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'invalid_json', message: 'Invalid upload request.' },
      { status: 400 }
    );
  }

  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : '';
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);

  if (!match) {
    return NextResponse.json(
      { ok: false, code: 'invalid_media', message: 'Expected a base64 image data URL.' },
      { status: 400 }
    );
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const extension = mimeType.split('/')[1] || 'jpg';
  const buffer = Buffer.from(base64Data, 'base64');
  const filePath = `${clerkUserId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('post-media')
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Media upload failed:', uploadError);
    return NextResponse.json(
      { ok: false, code: 'upload_failed', message: 'Could not upload media.' },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from('post-media')
    .getPublicUrl(filePath);

  return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
}
