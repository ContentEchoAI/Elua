import { MAX_META_POST_IMAGES } from '@/lib/metaMediaCore';

type MetaFetch = typeof fetch;

type MetaGraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type MetaContainerResponse = {
  id?: string;
  error?: MetaGraphError;
};

type MetaContainerStatusResponse = {
  id?: string;
  status_code?: string;
  status?: string;
  error?: MetaGraphError;
};

type MetaMediaDetailsResponse = {
  id?: string;
  permalink?: string;
  error?: MetaGraphError;
};

export type InstagramContainerStatus = {
  id: string;
  statusCode: string;
  status: string | null;
};

export type InstagramPublishResult = {
  metaPostId: string;
  permalinkUrl: string | null;
  containerId: string;
};

const MIN_INSTAGRAM_CAROUSEL_ITEMS = 2;

function getMetaGraphVersion() {
  return process.env.META_GRAPH_VERSION || 'v25.0';
}

function getMetaGraphUrl(objectId: string, edge?: string) {
  const graphVersion = getMetaGraphVersion();
  const encodedObjectId = encodeURIComponent(objectId);
  const encodedEdge = edge ? `/${edge}` : '';

  return (
    `https://graph.facebook.com/${graphVersion}/` +
    `${encodedObjectId}${encodedEdge}`
  );
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

function normalizeMetaId(value: string, label: string) {
  const id = value.trim();

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error(`${label} is invalid.`);
  }

  return id;
}

function normalizePublicImageUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('Instagram image URL is invalid.');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Instagram images require secure HTTPS URLs.');
  }

  return url.toString();
}

async function readMetaResponse<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function createInstagramImageContainer({
  instagramAccountId,
  pageAccessToken,
  imageUrl,
  caption,
  isCarouselItem = false,
  fetchImpl = fetch,
}: {
  instagramAccountId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption?: string;
  isCarouselItem?: boolean;
  fetchImpl?: MetaFetch;
}) {
  const accountId = normalizeMetaId(
    instagramAccountId,
    'Instagram account ID'
  );
  const token = pageAccessToken.trim();

  if (!token) {
    throw new Error('Instagram publishing access token is missing.');
  }

  const params = new URLSearchParams({
    image_url: normalizePublicImageUrl(imageUrl),
    access_token: token,
  });

  if (isCarouselItem) {
    params.set('is_carousel_item', 'true');
  }

  const normalizedCaption = caption?.trim();

  if (normalizedCaption) {
    params.set('caption', normalizedCaption);
  }

  const response = await fetchImpl(
    getMetaGraphUrl(accountId, 'media'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      cache: 'no-store',
    }
  );

  const data =
    await readMetaResponse<MetaContainerResponse>(response);

  if (!response.ok || !data.id) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Instagram image container creation failed.'
      )
    );
  }

  return data.id;
}

export async function createInstagramCarouselContainer({
  instagramAccountId,
  pageAccessToken,
  childContainerIds,
  caption,
  fetchImpl = fetch,
}: {
  instagramAccountId: string;
  pageAccessToken: string;
  childContainerIds: string[];
  caption: string;
  fetchImpl?: MetaFetch;
}) {
  const accountId = normalizeMetaId(
    instagramAccountId,
    'Instagram account ID'
  );
  const token = pageAccessToken.trim();

  if (!token) {
    throw new Error('Instagram publishing access token is missing.');
  }

  if (
    childContainerIds.length < MIN_INSTAGRAM_CAROUSEL_ITEMS ||
    childContainerIds.length > MAX_META_POST_IMAGES
  ) {
    throw new Error(
      `Instagram carousels require between ${MIN_INSTAGRAM_CAROUSEL_ITEMS} and ${MAX_META_POST_IMAGES} images in Hummingbird.`
    );
  }

  const normalizedChildren = childContainerIds.map((id) =>
    normalizeMetaId(id, 'Instagram child container ID')
  );

  if (new Set(normalizedChildren).size !== normalizedChildren.length) {
    throw new Error(
      'Instagram carousel child containers must be unique.'
    );
  }

  const normalizedCaption = caption.trim();

  if (!normalizedCaption) {
    throw new Error('Instagram carousel caption is required.');
  }

  const response = await fetchImpl(
    getMetaGraphUrl(accountId, 'media'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        media_type: 'CAROUSEL',
        children: normalizedChildren.join(','),
        caption: normalizedCaption,
        access_token: token,
      }),
      cache: 'no-store',
    }
  );

  const data =
    await readMetaResponse<MetaContainerResponse>(response);

  if (!response.ok || !data.id) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Instagram carousel container creation failed.'
      )
    );
  }

  return data.id;
}

export async function getInstagramContainerStatus({
  containerId,
  pageAccessToken,
  fetchImpl = fetch,
}: {
  containerId: string;
  pageAccessToken: string;
  fetchImpl?: MetaFetch;
}): Promise<InstagramContainerStatus> {
  const normalizedContainerId = normalizeMetaId(
    containerId,
    'Instagram container ID'
  );
  const token = pageAccessToken.trim();

  if (!token) {
    throw new Error('Instagram publishing access token is missing.');
  }

  const statusUrl = new URL(
    getMetaGraphUrl(normalizedContainerId)
  );

  statusUrl.searchParams.set('fields', 'status_code,status');
  statusUrl.searchParams.set('access_token', token);

  const response = await fetchImpl(statusUrl.toString(), {
    cache: 'no-store',
  });

  const data =
    await readMetaResponse<MetaContainerStatusResponse>(response);

  if (!response.ok || !data.id || !data.status_code) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Could not check Instagram media processing status.'
      )
    );
  }

  return {
    id: data.id,
    statusCode: data.status_code.trim().toUpperCase(),
    status: data.status || null,
  };
}

export async function waitForInstagramContainerReady({
  containerId,
  pageAccessToken,
  maxAttempts = 12,
  pollIntervalMs = 1500,
  fetchImpl = fetch,
}: {
  containerId: string;
  pageAccessToken: string;
  maxAttempts?: number;
  pollIntervalMs?: number;
  fetchImpl?: MetaFetch;
}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new Error('Instagram status attempt limit is invalid.');
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await getInstagramContainerStatus({
      containerId,
      pageAccessToken,
      fetchImpl,
    });

    if (status.statusCode === 'FINISHED') {
      return status;
    }

    if (
      status.statusCode === 'ERROR' ||
      status.statusCode === 'EXPIRED'
    ) {
      throw new Error(
        status.status ||
          `Instagram media processing ended with ${status.statusCode}.`
      );
    }

    if (attempt < maxAttempts && pollIntervalMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, pollIntervalMs)
      );
    }
  }

  throw new Error(
    'Instagram media was not ready before the publishing timeout.'
  );
}

export async function publishInstagramContainer({
  instagramAccountId,
  pageAccessToken,
  containerId,
  fetchImpl = fetch,
}: {
  instagramAccountId: string;
  pageAccessToken: string;
  containerId: string;
  fetchImpl?: MetaFetch;
}) {
  const accountId = normalizeMetaId(
    instagramAccountId,
    'Instagram account ID'
  );
  const creationId = normalizeMetaId(
    containerId,
    'Instagram container ID'
  );
  const token = pageAccessToken.trim();

  if (!token) {
    throw new Error('Instagram publishing access token is missing.');
  }

  const response = await fetchImpl(
    getMetaGraphUrl(accountId, 'media_publish'),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        creation_id: creationId,
        access_token: token,
      }),
      cache: 'no-store',
    }
  );

  const data =
    await readMetaResponse<MetaContainerResponse>(response);

  if (!response.ok || !data.id) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Instagram publishing failed.'
      )
    );
  }

  return data.id;
}

export async function getInstagramMediaPermalink({
  mediaId,
  pageAccessToken,
  fetchImpl = fetch,
}: {
  mediaId: string;
  pageAccessToken: string;
  fetchImpl?: MetaFetch;
}) {
  const normalizedMediaId = normalizeMetaId(
    mediaId,
    'Instagram media ID'
  );
  const token = pageAccessToken.trim();

  if (!token) {
    throw new Error('Instagram publishing access token is missing.');
  }

  const detailsUrl = new URL(
    getMetaGraphUrl(normalizedMediaId)
  );

  detailsUrl.searchParams.set('fields', 'permalink');
  detailsUrl.searchParams.set('access_token', token);

  const response = await fetchImpl(detailsUrl.toString(), {
    cache: 'no-store',
  });

  const data =
    await readMetaResponse<MetaMediaDetailsResponse>(response);

  if (!response.ok) {
    throw new Error(
      getMetaErrorMessage(
        data.error,
        'Instagram permalink lookup failed.'
      )
    );
  }

  return data.permalink || null;
}

async function safelyGetInstagramPermalink({
  mediaId,
  pageAccessToken,
  fetchImpl,
}: {
  mediaId: string;
  pageAccessToken: string;
  fetchImpl: MetaFetch;
}) {
  try {
    return await getInstagramMediaPermalink({
      mediaId,
      pageAccessToken,
      fetchImpl,
    });
  } catch (error) {
    console.warn(
      'Instagram permalink lookup warning:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return null;
  }
}

export async function publishInstagramImagePost({
  instagramAccountId,
  pageAccessToken,
  imageUrl,
  caption,
  maxStatusAttempts,
  pollIntervalMs,
  fetchImpl = fetch,
}: {
  instagramAccountId: string;
  pageAccessToken: string;
  imageUrl: string;
  caption: string;
  maxStatusAttempts?: number;
  pollIntervalMs?: number;
  fetchImpl?: MetaFetch;
}): Promise<InstagramPublishResult> {
  const containerId = await createInstagramImageContainer({
    instagramAccountId,
    pageAccessToken,
    imageUrl,
    caption,
    fetchImpl,
  });

  await waitForInstagramContainerReady({
    containerId,
    pageAccessToken,
    maxAttempts: maxStatusAttempts,
    pollIntervalMs,
    fetchImpl,
  });

  const metaPostId = await publishInstagramContainer({
    instagramAccountId,
    pageAccessToken,
    containerId,
    fetchImpl,
  });

  const permalinkUrl = await safelyGetInstagramPermalink({
    mediaId: metaPostId,
    pageAccessToken,
    fetchImpl,
  });

  return {
    metaPostId,
    permalinkUrl,
    containerId,
  };
}

export async function publishInstagramCarouselPost({
  instagramAccountId,
  pageAccessToken,
  imageUrls,
  caption,
  maxStatusAttempts,
  pollIntervalMs,
  fetchImpl = fetch,
}: {
  instagramAccountId: string;
  pageAccessToken: string;
  imageUrls: string[];
  caption: string;
  maxStatusAttempts?: number;
  pollIntervalMs?: number;
  fetchImpl?: MetaFetch;
}): Promise<InstagramPublishResult> {
  if (
    imageUrls.length < MIN_INSTAGRAM_CAROUSEL_ITEMS ||
    imageUrls.length > MAX_META_POST_IMAGES
  ) {
    throw new Error(
      `Instagram carousels require between ${MIN_INSTAGRAM_CAROUSEL_ITEMS} and ${MAX_META_POST_IMAGES} images in Hummingbird.`
    );
  }

  const childContainerIds: string[] = [];

  for (const imageUrl of imageUrls) {
    const childContainerId =
      await createInstagramImageContainer({
        instagramAccountId,
        pageAccessToken,
        imageUrl,
        isCarouselItem: true,
        fetchImpl,
      });

    childContainerIds.push(childContainerId);
  }

  for (const childContainerId of childContainerIds) {
    await waitForInstagramContainerReady({
      containerId: childContainerId,
      pageAccessToken,
      maxAttempts: maxStatusAttempts,
      pollIntervalMs,
      fetchImpl,
    });
  }

  const containerId = await createInstagramCarouselContainer({
    instagramAccountId,
    pageAccessToken,
    childContainerIds,
    caption,
    fetchImpl,
  });

  await waitForInstagramContainerReady({
    containerId,
    pageAccessToken,
    maxAttempts: maxStatusAttempts,
    pollIntervalMs,
    fetchImpl,
  });

  const metaPostId = await publishInstagramContainer({
    instagramAccountId,
    pageAccessToken,
    containerId,
    fetchImpl,
  });

  const permalinkUrl = await safelyGetInstagramPermalink({
    mediaId: metaPostId,
    pageAccessToken,
    fetchImpl,
  });

  return {
    metaPostId,
    permalinkUrl,
    containerId,
  };
}
