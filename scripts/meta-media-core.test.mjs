import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_META_IMAGE_BYTES,
  createMetaMediaObjectPath,
  normalizeMetaMediaObjectPaths,
  normalizeMetaMediaUploadItems,
  parseImageDataUrl,
} from '../lib/metaMediaCore.ts';

const HASH = 'a'.repeat(64);

test('parses a supported image data URL', () => {
  const parsed = parseImageDataUrl(
    'data:image/jpeg;base64,aGVsbG8='
  );

  assert.equal(parsed.mimeType, 'image/jpeg');
  assert.equal(parsed.extension, 'jpg');
  assert.equal(parsed.bytes.toString('utf8'), 'hello');
  assert.equal(parsed.contentHash.length, 64);
});

test('rejects invalid and unsupported media data URLs', () => {
  assert.throws(
    () => parseImageDataUrl('not-a-data-url'),
    /Invalid image data URL/
  );

  assert.throws(
    () =>
      parseImageDataUrl(
        'data:image/gif;base64,aGVsbG8='
      ),
    /Unsupported image type/
  );
});

test('normalizes ordered carousel upload metadata', () => {
  const items = normalizeMetaMediaUploadItems([
    {
      index: 0,
      mimeType: 'image/jpeg',
      sizeBytes: 100,
      contentHash: HASH,
    },
    {
      index: 1,
      mimeType: 'image/png',
      sizeBytes: 200,
      contentHash: HASH,
    },
  ]);

  assert.deepEqual(
    items.map((item) => item.extension),
    ['jpg', 'png']
  );
});

test('rejects broken image order and oversized images', () => {
  assert.throws(
    () =>
      normalizeMetaMediaUploadItems([
        {
          index: 1,
          mimeType: 'image/jpeg',
          sizeBytes: 100,
          contentHash: HASH,
        },
      ]),
    /preserve image order/
  );

  assert.throws(
    () =>
      normalizeMetaMediaUploadItems([
        {
          index: 0,
          mimeType: 'image/jpeg',
          sizeBytes: MAX_META_IMAGE_BYTES + 1,
          contentHash: HASH,
        },
      ]),
    /between 1 byte and 4MB/
  );
});

test('creates stable private staging paths', () => {
  const input = {
    clerkUserId: 'user_secret_identifier',
    approvedPostId: 'approved-post-123',
    index: 1,
    extension: 'jpg',
    contentHash: HASH,
  };

  const first = createMetaMediaObjectPath(input);
  const second = createMetaMediaObjectPath(input);

  assert.equal(first, second);
  assert.match(
    first,
    /^[a-f0-9]{16}\/approved-post-123\/02-aaaaaaaaaaaaaaaa\.jpg$/
  );
  assert.doesNotMatch(first, /user_secret_identifier/);
});


test('accepts only ordered media owned by the approved post', () => {
  const first = createMetaMediaObjectPath({
    clerkUserId: 'user-123',
    approvedPostId: 'approved-post-123',
    index: 0,
    extension: 'jpg',
    contentHash: HASH,
  });

  const second = createMetaMediaObjectPath({
    clerkUserId: 'user-123',
    approvedPostId: 'approved-post-123',
    index: 1,
    extension: 'png',
    contentHash: 'b'.repeat(64),
  });

  assert.deepEqual(
    normalizeMetaMediaObjectPaths({
      value: [first, second],
      clerkUserId: 'user-123',
      approvedPostId: 'approved-post-123',
    }),
    [first, second]
  );

  assert.throws(
    () =>
      normalizeMetaMediaObjectPaths({
        value: [second, first],
        clerkUserId: 'user-123',
        approvedPostId: 'approved-post-123',
      }),
    /preserve the approved image order/
  );

  assert.throws(
    () =>
      normalizeMetaMediaObjectPaths({
        value: [first],
        clerkUserId: 'different-user',
        approvedPostId: 'approved-post-123',
      }),
    /does not belong/
  );
});
