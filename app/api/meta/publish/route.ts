import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  createMetaCaptionHash,
  normalizeMetaPublishPlatform,
} from '@/lib/metaPublishingCore';
import {
  getMetaPublishingConnection,
  reserveMetaPublishAttempt,
} from '@/lib/metaPublishing';

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
    const { data: connection, error: connectionError } =
      await getMetaPublishingConnection(clerkUserId);

    if (connectionError) {
      console.error('Meta publishing connection lookup failed:', connectionError);

      return NextResponse.json(
        {
          ok: false,
          code: 'connection_lookup_failed',
          message: 'Could not check the connected Meta account.',
        },
        { status: 500 }
      );
    }

    const platformConnected =
      platform === 'facebook'
        ? Boolean(
            connection?.facebook_page_id &&
              connection?.page_access_token
          )
        : Boolean(connection?.instagram_account_id);

    if (!platformConnected) {
      return NextResponse.json(
        {
          ok: false,
          code: 'platform_not_connected',
          message:
            platform === 'facebook'
              ? 'Connect and select a Facebook Page before publishing.'
              : 'Connect a professional Instagram account before publishing.',
        },
        { status: 409 }
      );
    }

    const reservation = await reserveMetaPublishAttempt({
      clerkUserId,
      approvedPostId,
      platform,
      caption,
    });

    if (reservation.error || !reservation.attempt) {
      console.error(
        'Meta publish attempt reservation failed:',
        reservation.error
      );

      return NextResponse.json(
        {
          ok: false,
          code: 'publish_reservation_failed',
          message: 'Could not safely reserve this publishing request.',
        },
        { status: 500 }
      );
    }

    if (!reservation.created) {
      const currentCaptionHash = createMetaCaptionHash(caption);

      if (reservation.attempt.caption_hash !== currentCaptionHash) {
        return NextResponse.json(
          {
            ok: false,
            code: 'approved_post_changed',
            message:
              'This approved post changed after its publishing request was created. Approve it again as a new post.',
          },
          { status: 409 }
        );
      }

      if (reservation.attempt.status === 'published') {
        return NextResponse.json(
          {
            ok: false,
            code: 'duplicate_publish_blocked',
            message: 'This approved post has already been published.',
            permalinkUrl: reservation.attempt.permalink_url || null,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: 'publish_already_reserved',
          message:
            reservation.attempt.status === 'publishing'
              ? 'This post is already being published.'
              : 'This publishing request is already reserved. Nothing was posted twice.',
          status: reservation.attempt.status,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        approved: true,
        publishEnabled: false,
        duplicateProtectionReady: true,
        code: 'live_publish_not_enabled',
        approvedPostId,
        platform,
        message:
          'Publishing request reserved safely. Nothing was posted yet.',
        nextStep:
          'Live Facebook publishing still requires the final confirmation and Meta API step.',
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
