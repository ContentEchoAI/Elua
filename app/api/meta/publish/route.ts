import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import { normalizeMetaPublishPlatform } from '@/lib/metaPublishingCore';

type MetaPublishRequest = {
  approvedPostId?: string;
  caption?: string;
  hashtags?: string[] | string;
  platform?: string;
  mediaUrls?: string[];
  publishNow?: boolean;
};

export async function POST(request: Request) {
  let body: MetaPublishRequest;

  try {
    body = (await request.json()) as MetaPublishRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_json',
        message: 'Invalid publish request.',
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
        message: 'Sign in before approving or publishing a post.',
      },
      { status: 401 }
    );
  }

  const approvedPostId =
    typeof body.approvedPostId === 'string'
      ? body.approvedPostId.trim()
      : '';

  if (
    !approvedPostId ||
    approvedPostId.length < 8 ||
    approvedPostId.length > 160
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

  const caption =
    typeof body.caption === 'string' ? body.caption.trim() : '';

  if (!caption) {
    return NextResponse.json(
      {
        ok: false,
        code: 'missing_caption',
        message: 'A caption is required before approving a post.',
      },
      { status: 400 }
    );
  }

  const platform = normalizeMetaPublishPlatform(body.platform);

  if (!platform) {
    return NextResponse.json(
      {
        ok: false,
        code: 'unsupported_platform',
        message:
          'Only connected Facebook and Instagram posts can use Meta publishing.',
      },
      { status: 400 }
    );
  }

  if (body.publishNow === true) {
    return NextResponse.json(
      {
        ok: false,
        approved: false,
        publishEnabled: false,
        code: 'live_publish_not_enabled',
        message: 'Live publishing is still disabled.',
        nextStep:
          'Hummingbird must complete the final confirmation and duplicate-protection flow first.',
      },
      { status: 501 }
    );
  }

  return NextResponse.json({
    ok: true,
    approved: true,
    publishEnabled: false,
    approvedPostId,
    platform,
    message: 'Approved and saved. Nothing posted yet.',
  });
}
