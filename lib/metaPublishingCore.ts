import crypto from 'node:crypto';

export type MetaPublishPlatform = 'facebook' | 'instagram';

export function normalizeMetaPublishPlatform(
  value: unknown
): MetaPublishPlatform | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes('facebook')) {
    return 'facebook';
  }

  if (normalized.includes('instagram')) {
    return 'instagram';
  }

  return null;
}

export function createMetaCaptionHash(caption: string) {
  return crypto
    .createHash('sha256')
    .update(caption.trim(), 'utf8')
    .digest('hex');
}

export function createMetaPublishContentHash({
  caption,
  mediaPaths = [],
}: {
  caption: string;
  mediaPaths?: string[];
}) {
  const normalizedCaption = caption.trim();
  const normalizedMediaPaths = mediaPaths.map((path) => path.trim());

  // Preserve compatibility with existing text-only Facebook attempts.
  if (normalizedMediaPaths.length === 0) {
    return createMetaCaptionHash(normalizedCaption);
  }

  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        version: 1,
        caption: normalizedCaption,
        mediaPaths: normalizedMediaPaths,
      }),
      'utf8'
    )
    .digest('hex');
}

export type MetaPublishAttemptStatus =
  | 'pending'
  | 'publishing'
  | 'published'
  | 'failed';

export function getMetaPublishConflictCode({
  existingCaptionHash,
  currentCaptionHash,
  status,
}: {
  existingCaptionHash: string;
  currentCaptionHash: string;
  status: MetaPublishAttemptStatus;
}) {
  if (existingCaptionHash !== currentCaptionHash) {
    return 'approved_post_changed' as const;
  }

  if (status === 'published') {
    return 'duplicate_publish_blocked' as const;
  }

  if (status === 'failed') {
    return 'failed_publish_requires_new_approval' as const;
  }

  return 'publish_already_reserved' as const;
}
