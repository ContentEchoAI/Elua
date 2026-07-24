export type InstagramPublishablePost = {
  id: string;
  caption: string;
  hashtags: string[];
  mediaUrls?: string[];
  platform?: string;
};

export type InstagramPublishResult = {
  status: 'posted' | 'failed' | 'approved_not_posted';
  publishedAt?: string;
  metaPostId?: string;
  permalinkUrl?: string;
  publishError?: string;
};

export async function publishPostToInstagram(
  post: InstagramPublishablePost
): Promise<InstagramPublishResult> {
  try {
    const res = await fetch('/api/meta/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        approvedPostId: post.id,
        caption: post.caption,
        hashtags: post.hashtags,
        platform: 'instagram',
        isReel: post.platform === 'Instagram Reel',
        mediaUrls: post.mediaUrls || [],
        publishNow: true,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      published?: boolean;
      code?: string;
      message?: string;
      metaPostId?: string;
      permalinkUrl?: string | null;
    };

    if (res.ok && data.published) {
      return {
        status: 'posted',
        publishedAt: new Date().toISOString(),
        metaPostId: data.metaPostId,
        permalinkUrl: data.permalinkUrl || undefined,
      };
    }

    return {
      status: 'approved_not_posted',
      publishError:
        data.message || 'Instagram publishing is unavailable. Nothing was posted.',
    };
  } catch (error) {
    console.warn('Instagram publish warning:', error);
    return {
      status: 'failed',
      publishError:
        'Could not confirm whether Instagram received this post. Check the account before trying again.',
    };
  }
}
