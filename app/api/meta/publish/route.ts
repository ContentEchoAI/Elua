import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  createMetaCaptionHash,
  getMetaPublishConflictCode,
  normalizeMetaPublishPlatform,
} from '@/lib/metaPublishingCore';
import {
  getMetaPublishingConnection,
  markMetaPublishAttemptFailed,
  markMetaPublishAttemptPublished,
  markMetaPublishAttemptPublishing,
  reserveMetaPublishAttempt,
} from '@/lib/metaPublishing';
import { publishFacebookPagePost } from '@/lib/metaFacebook';
import { publishInstagramImagePost, publishInstagramCarouselPost } from '@/lib/metaInstagram';

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
      console.error(
        'Meta publishing connection lookup failed:',
        connectionError
      );

      return NextResponse.json(
        {
          ok: false,
          code: 'connection_lookup_failed',
          message: 'Could not check the connected Meta account.',
        },
        { status: 500 }
      );
    }

    const facebookPageId =
      connection?.facebook_page_id || '';
    const facebookPageAccessToken =
      connection?.page_access_token || '';
    const instagramAccountId =
      connection?.instagram_account_id || '';

    const platformConnected =
      platform === 'facebook'
        ? Boolean(facebookPageId && facebookPageAccessToken)
        : Boolean(instagramAccountId);

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


    const accountPublishingEnabled =
      connection?.publishing_enabled === true;

    if (!accountPublishingEnabled) {
      return NextResponse.json(
        {
          ok: false,
          approved: true,
          publishEnabled: false,
          code: 'account_publishing_not_enabled',
          approvedPostId,
          platform,
          message:
            'Live Facebook publishing has not been enabled for this account.',
        },
        { status: 403 }
      );
    }

    const livePublishEnabled =
      process.env.META_LIVE_PUBLISH_ENABLED === 'true';

    if (!livePublishEnabled) {
      return NextResponse.json(
        {
          ok: false,
          approved: true,
          publishEnabled: false,
          code: 'live_publish_not_enabled',
          approvedPostId,
          platform,
          message: 'Live Facebook publishing is still disabled.',
          nextStep:
            'Enable the final confirmation flow before turning on live publishing.',
        },
        { status: 501 }
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

      const conflictCode = getMetaPublishConflictCode({
        existingCaptionHash: reservation.attempt.caption_hash,
        currentCaptionHash,
        status: reservation.attempt.status,
      });

      if (conflictCode === 'approved_post_changed') {
        return NextResponse.json(
          {
            ok: false,
            code: conflictCode,
            message:
              'This approved post changed after its publishing request was created. Approve it again as a new post.',
          },
          { status: 409 }
        );
      }

      if (conflictCode === 'duplicate_publish_blocked') {
        return NextResponse.json(
          {
            ok: false,
            code: conflictCode,
            message: 'This approved post has already been published.',
            permalinkUrl: reservation.attempt.permalink_url || null,
          },
          { status: 409 }
        );
      }

      if (conflictCode === 'failed_publish_requires_new_approval') {
        return NextResponse.json(
          {
            ok: false,
            code: conflictCode,
            message:
              'The previous publishing attempt failed. Review the post and approve it again as a new queued post before retrying.',
            status: reservation.attempt.status,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          code: conflictCode,
          message:
            reservation.attempt.status === 'publishing'
              ? 'This post is already being published.'
              : 'This publishing request is already reserved. Nothing was posted twice.',
          status: reservation.attempt.status,
        },
        { status: 409 }
      );
    }

    const attemptId = reservation.attempt.id;

    const { data: publishingAttempt, error: publishingError } =
      await markMetaPublishAttemptPublishing(attemptId);

    if (publishingError || !publishingAttempt) {
      console.error(
        'Meta publish transition failed:',
        publishingError
      );

      return NextResponse.json(
        {
          ok: false,
          code: 'publish_transition_failed',
          message: 'Could not safely begin publishing this post.',
        },
        { status: 409 }
      );
    }

    try {
      const requestedMediaUrls = Array.isArray(body.mediaUrls)
        ? body.mediaUrls.filter((url) => typeof url === 'string' && url)
        : [];

      if (platform === 'instagram' && !requestedMediaUrls[0]) {
        return NextResponse.json(
          {
            ok: false,
            code: 'instagram_media_required',
            message: 'A photo is required to publish to Instagram.',
          },
          { status: 400 }
        );
      }

      const published =
        platform === 'instagram' && requestedMediaUrls.length >= 2
          ? await publishInstagramCarouselPost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrls: requestedMediaUrls,
              caption,
            })
          : platform === 'instagram'
          ? await publishInstagramImagePost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrl: requestedMediaUrls[0],
              caption,
            })
          : await publishFacebookPagePost({
              pageId: facebookPageId,
              pageAccessToken: facebookPageAccessToken,
              message: caption,
              mediaUrl: requestedMediaUrls[0],
            });

      const { error: publishedStateError } =
        await markMetaPublishAttemptPublished({
          attemptId,
          metaPostId: published.metaPostId,
          permalinkUrl: published.permalinkUrl,
        });

      if (publishedStateError) {
        console.error(
          'Meta published-state save failed:',
          publishedStateError
        );
      }

      return NextResponse.json({
        ok: true,
        approved: true,
        publishEnabled: true,
        published: true,
        approvedPostId,
        platform,
        metaPostId: published.metaPostId,
        permalinkUrl: published.permalinkUrl,
        message: 'Posted successfully to Facebook.',
      });
    } catch (publishError) {
      const errorMessage =
        publishError instanceof Error
          ? publishError.message
          : 'Facebook Page publishing failed.';

      await markMetaPublishAttemptFailed({
        attemptId,
        errorCode: 'facebook_publish_failed',
        errorMessage,
      });

      console.error('Facebook Page publishing failed:', errorMessage);

      return NextResponse.json(
        {
          ok: false,
          approved: true,
          publishEnabled: true,
          published: false,
          code: 'facebook_publish_failed',
          message:
            'Facebook could not publish this post. Nothing was posted twice.',
        },
        { status: 502 }
      );
    }
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
