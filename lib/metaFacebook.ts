type MetaGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type MetaCreatePostResponse = {
  id?: string;
  post_id?: string;
  error?: MetaGraphError;
};

type MetaPostDetailsResponse = {
  permalink_url?: string;
  error?: MetaGraphError;
};

export type FacebookPagePublishResult = {
  metaPostId: string;
  permalinkUrl: string | null;
};

function getMetaGraphVersion() {
  return process.env.META_GRAPH_VERSION || 'v25.0';
}

function getMetaErrorMessage(
  error: MetaGraphError | undefined,
  fallback: string
) {
  if (!error) return fallback;

  const details = [
    error.message,
    typeof error.code === 'number' ? `code ${error.code}` : '',
    typeof error.error_subcode === 'number'
      ? `subcode ${error.error_subcode}`
      : '',
  ].filter(Boolean);

  return details.join(' · ') || fallback;
}

export async function publishFacebookPagePost({
  pageId,
  pageAccessToken,
  message,
  mediaUrl,
}: {
  pageId: string;
  pageAccessToken: string;
  message: string;
  mediaUrl?: string;
}): Promise<FacebookPagePublishResult> {
  const graphVersion = getMetaGraphVersion();
  const postUrl =
    `https://graph.facebook.com/${graphVersion}/` +
    `${encodeURIComponent(pageId)}/${mediaUrl ? 'photos' : 'feed'}`;

  const response = await fetch(postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: mediaUrl
      ? new URLSearchParams({
          url: mediaUrl,
          caption: message,
          access_token: pageAccessToken,
        })
      : new URLSearchParams({
          message,
          access_token: pageAccessToken,
        }),
    cache: 'no-store',
  });

  const data = (await response.json()) as MetaCreatePostResponse;

  if (!response.ok || !data.id) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Facebook Page publishing failed.'
      )
    );
  }

  const publishedPostId = data.post_id || data.id;
  let permalinkUrl: string | null = null;

  try {
    const detailsUrl = new URL(
      `https://graph.facebook.com/${graphVersion}/` +
        encodeURIComponent(publishedPostId)
    );

    detailsUrl.searchParams.set('fields', 'permalink_url');
    detailsUrl.searchParams.set(
      'access_token',
      pageAccessToken
    );

    const detailsResponse = await fetch(detailsUrl.toString(), {
      cache: 'no-store',
    });

    const details =
      (await detailsResponse.json()) as MetaPostDetailsResponse;

    if (detailsResponse.ok && details.permalink_url) {
      permalinkUrl = details.permalink_url;
    }
  } catch (error) {
    console.warn(
      'Facebook permalink lookup warning:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  return {
    metaPostId: publishedPostId,
    permalinkUrl,
  };
}
