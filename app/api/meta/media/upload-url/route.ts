import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  META_MEDIA_BUCKET,
  createMetaMediaObjectPath,
  normalizeMetaMediaUploadItems,
} from '@/lib/metaMediaCore';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

type MediaUploadUrlRequest = {
  approvedPostId?: unknown;
  items?: unknown;
};

export async function POST(request: Request) {
  let body: MediaUploadUrlRequest;

  try {
    body = (await request.json()) as MediaUploadUrlRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_json',
        message: 'Invalid media upload request.',
      },
      { status: 400 }
    );
  }

  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return NextResponse.json(
      {
        ok: false,
        code: 'signed_out',
        message: 'Sign in before uploading post media.',
      },
      { status: 401 }
    );
  }

  const approvedPostId =
    typeof body.approvedPostId === 'string'
      ? body.approvedPostId.trim()
      : '';

  if (
    approvedPostId.length < 8 ||
    approvedPostId.length > 160 ||
    !/^[a-zA-Z0-9_-]+$/.test(approvedPostId)
  ) {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_post_id',
        message: 'A valid approved post ID is required.',
      },
      { status: 400 }
    );
  }

  let items;

  try {
    items = normalizeMetaMediaUploadItems(body.items);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_media',
        message:
          error instanceof Error
            ? error.message
            : 'Invalid post media.',
      },
      { status: 400 }
    );
  }

  const bucket = supabaseAdmin.storage.from(META_MEDIA_BUCKET);
  const uploads = [];

  for (const item of items) {
    const path = createMetaMediaObjectPath({
      clerkUserId,
      approvedPostId,
      index: item.index,
      extension: item.extension,
      contentHash: item.contentHash,
    });

    const { data, error } =
      await bucket.createSignedUploadUrl(path, {
        // Approved media paths must never be overwritten.
        upsert: false,
      });

    if (error || !data?.signedUrl) {
      console.error(
        'Meta media signed upload URL creation failed:',
        error
      );

      return NextResponse.json(
        {
          ok: false,
          code: 'media_upload_permission_failed',
          message:
            'Could not prepare secure media uploads. Confirm the private Meta media bucket exists.',
        },
        { status: 500 }
      );
    }

    uploads.push({
      index: item.index,
      path,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      uploadUrl: data.signedUrl,
    });
  }

  return NextResponse.json({
    ok: true,
    uploads,
  });
}
