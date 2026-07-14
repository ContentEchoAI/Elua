import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  createMetaCaptionHash,
  type MetaPublishPlatform,
} from '@/lib/metaPublishingCore';

type ReserveMetaPublishAttemptInput = {
  clerkUserId: string;
  approvedPostId: string;
  platform: MetaPublishPlatform;
  caption: string;
};

export async function getMetaPublishingConnection(
  clerkUserId: string
) {
  return supabaseAdmin
    .from('meta_connections')
    .select(
      'facebook_page_id,facebook_page_name,page_access_token,instagram_account_id,instagram_username,publishing_enabled'
    )
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
}

export async function getMetaPublishAttempt({
  clerkUserId,
  approvedPostId,
  platform,
}: {
  clerkUserId: string;
  approvedPostId: string;
  platform: MetaPublishPlatform;
}) {
  return supabaseAdmin
    .from('meta_publish_attempts')
    .select(
      'id,status,caption_hash,meta_post_id,permalink_url,error_code,error_message,created_at,updated_at,published_at'
    )
    .eq('clerk_user_id', clerkUserId)
    .eq('approved_post_id', approvedPostId)
    .eq('platform', platform)
    .maybeSingle();
}

export async function reserveMetaPublishAttempt({
  clerkUserId,
  approvedPostId,
  platform,
  caption,
}: ReserveMetaPublishAttemptInput) {
  const captionHash = createMetaCaptionHash(caption);

  const { data, error } = await supabaseAdmin
    .from('meta_publish_attempts')
    .insert({
      clerk_user_id: clerkUserId,
      approved_post_id: approvedPostId,
      platform,
      status: 'pending',
      caption_hash: captionHash,
      updated_at: new Date().toISOString(),
    })
    .select(
      'id,status,caption_hash,meta_post_id,permalink_url,error_code,error_message,created_at,updated_at,published_at'
    )
    .single();

  if (!error) {
    return {
      created: true,
      attempt: data,
      error: null,
    };
  }

  if (error.code === '23505') {
    const existing = await getMetaPublishAttempt({
      clerkUserId,
      approvedPostId,
      platform,
    });

    return {
      created: false,
      attempt: existing.data,
      error: existing.error,
    };
  }

  return {
    created: false,
    attempt: null,
    error,
  };
}

export async function markMetaPublishAttemptPublishing(
  attemptId: string
) {
  return supabaseAdmin
    .from('meta_publish_attempts')
    .update({
      status: 'publishing',
      error_code: null,
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .eq('status', 'pending')
    .select(
      'id,status,caption_hash,meta_post_id,permalink_url,error_code,error_message,created_at,updated_at,published_at'
    )
    .maybeSingle();
}

export async function markMetaPublishAttemptPublished({
  attemptId,
  metaPostId,
  permalinkUrl,
}: {
  attemptId: string;
  metaPostId: string;
  permalinkUrl?: string | null;
}) {
  const publishedAt = new Date().toISOString();

  return supabaseAdmin
    .from('meta_publish_attempts')
    .update({
      status: 'published',
      meta_post_id: metaPostId,
      permalink_url: permalinkUrl || null,
      error_code: null,
      error_message: null,
      published_at: publishedAt,
      updated_at: publishedAt,
    })
    .eq('id', attemptId)
    .eq('status', 'publishing')
    .select(
      'id,status,caption_hash,meta_post_id,permalink_url,error_code,error_message,created_at,updated_at,published_at'
    )
    .maybeSingle();
}

export async function markMetaPublishAttemptFailed({
  attemptId,
  errorCode,
  errorMessage,
}: {
  attemptId: string;
  errorCode: string;
  errorMessage: string;
}) {
  return supabaseAdmin
    .from('meta_publish_attempts')
    .update({
      status: 'failed',
      error_code: errorCode.slice(0, 120),
      error_message: errorMessage.slice(0, 1000),
      updated_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .in('status', ['pending', 'publishing'])
    .select(
      'id,status,caption_hash,meta_post_id,permalink_url,error_code,error_message,created_at,updated_at,published_at'
    )
    .maybeSingle();
}
