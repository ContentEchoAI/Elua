import crypto from 'node:crypto';

export const META_MEDIA_BUCKET = 'meta-publish-media';
export const MAX_META_POST_IMAGES = 6;
export const MAX_META_IMAGE_BYTES = 4 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export type ParsedImageDataUrl = {
  mimeType: string;
  extension: string;
  bytes: Buffer;
  contentHash: string;
};

export type MetaMediaUploadItem = {
  index: number;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  contentHash: string;
};

export function parseImageDataUrl(
  value: unknown
): ParsedImageDataUrl {
  if (typeof value !== 'string') {
    throw new Error('Image data must be a data URL.');
  }

  const match = value.match(
    /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i
  );

  if (!match) {
    throw new Error('Invalid image data URL.');
  }

  const mimeType = match[1].toLowerCase();
  const extension = SUPPORTED_IMAGE_TYPES.get(mimeType);

  if (!extension) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const base64 = match[2].replace(/\s+/g, '');
  const bytes = Buffer.from(base64, 'base64');

  if (bytes.length === 0) {
    throw new Error('Uploaded image is empty.');
  }

  return {
    mimeType,
    extension,
    bytes,
    contentHash: crypto
      .createHash('sha256')
      .update(bytes)
      .digest('hex'),
  };
}

export function normalizeMetaMediaUploadItems(
  value: unknown
): MetaMediaUploadItem[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('At least one image is required.');
  }

  if (value.length > MAX_META_POST_IMAGES) {
    throw new Error(
      `Instagram posts support up to ${MAX_META_POST_IMAGES} images in Hummingbird.`
    );
  }

  return value.map((item, position) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid media upload item.');
    }

    const record = item as Record<string, unknown>;
    const index = record.index;
    const mimeType =
      typeof record.mimeType === 'string'
        ? record.mimeType.toLowerCase()
        : '';
    const sizeBytes = record.sizeBytes;
    const contentHash =
      typeof record.contentHash === 'string'
        ? record.contentHash.toLowerCase()
        : '';

    if (!Number.isInteger(index) || index !== position) {
      throw new Error(
        'Media indexes must be consecutive and preserve image order.'
      );
    }

    const extension = SUPPORTED_IMAGE_TYPES.get(mimeType);

    if (!extension) {
      throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`);
    }

    if (
      !Number.isInteger(sizeBytes) ||
      Number(sizeBytes) <= 0 ||
      Number(sizeBytes) > MAX_META_IMAGE_BYTES
    ) {
      throw new Error('Each image must be between 1 byte and 4MB.');
    }

    if (!/^[a-f0-9]{64}$/.test(contentHash)) {
      throw new Error('Invalid image content hash.');
    }

    return {
      index: position,
      mimeType,
      extension,
      sizeBytes: Number(sizeBytes),
      contentHash,
    };
  });
}

export function createMetaMediaObjectPrefix({
  clerkUserId,
  approvedPostId,
}: {
  clerkUserId: string;
  approvedPostId: string;
}) {
  if (!clerkUserId || !approvedPostId) {
    throw new Error('User and approved post IDs are required.');
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(approvedPostId)) {
    throw new Error('Approved post ID is invalid.');
  }

  const userHash = crypto
    .createHash('sha256')
    .update(clerkUserId)
    .digest('hex')
    .slice(0, 16);

  return `${userHash}/${approvedPostId}/`;
}

export function normalizeMetaMediaObjectPaths({
  value,
  clerkUserId,
  approvedPostId,
  allowEmpty = false,
}: {
  value: unknown;
  clerkUserId: string;
  approvedPostId: string;
  allowEmpty?: boolean;
}) {
  if (!Array.isArray(value)) {
    if (allowEmpty && (value === undefined || value === null)) {
      return [];
    }

    throw new Error('Post media paths must be an array.');
  }

  if (value.length === 0) {
    if (allowEmpty) return [];

    throw new Error('At least one staged image is required.');
  }

  if (value.length > MAX_META_POST_IMAGES) {
    throw new Error(
      `Instagram posts support up to ${MAX_META_POST_IMAGES} images in Hummingbird.`
    );
  }

  const objectPrefix = createMetaMediaObjectPrefix({
    clerkUserId,
    approvedPostId,
  });

  const escapedPrefix = objectPrefix.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );

  const seen = new Set<string>();

  return value.map((item, index) => {
    if (typeof item !== 'string') {
      throw new Error('Invalid staged media path.');
    }

    const path = item.trim();

    if (!path.startsWith(objectPrefix)) {
      throw new Error(
        'Staged media does not belong to this approved post.'
      );
    }

    const expectedPosition = String(index + 1).padStart(2, '0');
    const expectedPattern = new RegExp(
      `^${escapedPrefix}${expectedPosition}-[a-f0-9]{16}\\.(jpg|png|webp)$`
    );

    if (!expectedPattern.test(path)) {
      throw new Error(
        'Staged media paths must preserve the approved image order.'
      );
    }

    if (seen.has(path)) {
      throw new Error('Duplicate staged media paths are not allowed.');
    }

    seen.add(path);
    return path;
  });
}

export function createMetaMediaObjectPath({
  clerkUserId,
  approvedPostId,
  index,
  extension,
  contentHash,
}: {
  clerkUserId: string;
  approvedPostId: string;
  index: number;
  extension: string;
  contentHash: string;
}) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error('Media index must be a non-negative integer.');
  }

  if (!['jpg', 'png', 'webp'].includes(extension)) {
    throw new Error('Media extension is invalid.');
  }

  if (!/^[a-f0-9]{64}$/.test(contentHash)) {
    throw new Error('Image content hash is invalid.');
  }

  const objectPrefix = createMetaMediaObjectPrefix({
    clerkUserId,
    approvedPostId,
  });

  return (
    objectPrefix +
    `${String(index + 1).padStart(2, '0')}-` +
    `${contentHash.slice(0, 16)}.${extension}`
  );
}
