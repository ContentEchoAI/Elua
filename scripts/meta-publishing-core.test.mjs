import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMetaCaptionHash,
  createMetaPublishContentHash,
  getMetaPublishConflictCode,
  normalizeMetaPublishPlatform,
} from '../lib/metaPublishingCore.ts';

test('normalizes supported Meta platforms', () => {
  assert.equal(normalizeMetaPublishPlatform('Facebook Post'), 'facebook');
  assert.equal(normalizeMetaPublishPlatform('facebook'), 'facebook');
  assert.equal(normalizeMetaPublishPlatform('Instagram Reel'), 'instagram');
  assert.equal(normalizeMetaPublishPlatform('Instagram Carousel'), 'instagram');
});

test('rejects unsupported or missing platforms', () => {
  assert.equal(normalizeMetaPublishPlatform('LinkedIn Post'), null);
  assert.equal(normalizeMetaPublishPlatform('TikTok Script'), null);
  assert.equal(normalizeMetaPublishPlatform(''), null);
  assert.equal(normalizeMetaPublishPlatform(undefined), null);
});

test('creates stable caption hashes', () => {
  const first = createMetaCaptionHash('A caption to publish.');
  const second = createMetaCaptionHash('  A caption to publish.  ');
  const different = createMetaCaptionHash('A different caption.');

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.notEqual(first, different);
});

test('locks ordered carousel media into the approved content hash', () => {
  const textOnly = createMetaPublishContentHash({
    caption: 'A caption to publish.',
    mediaPaths: [],
  });

  assert.equal(
    textOnly,
    createMetaCaptionHash('A caption to publish.')
  );

  const first = createMetaPublishContentHash({
    caption: 'A caption to publish.',
    mediaPaths: ['folder/01.jpg', 'folder/02.jpg'],
  });

  const same = createMetaPublishContentHash({
    caption: '  A caption to publish.  ',
    mediaPaths: [' folder/01.jpg ', ' folder/02.jpg '],
  });

  const reordered = createMetaPublishContentHash({
    caption: 'A caption to publish.',
    mediaPaths: ['folder/02.jpg', 'folder/01.jpg'],
  });

  assert.equal(first, same);
  assert.equal(first.length, 64);
  assert.notEqual(first, reordered);
});

test('blocks changed approved post content', () => {
  assert.equal(
    getMetaPublishConflictCode({
      existingCaptionHash: 'original-hash',
      currentCaptionHash: 'changed-hash',
      status: 'pending',
    }),
    'approved_post_changed'
  );
});

test('blocks duplicate published posts', () => {
  assert.equal(
    getMetaPublishConflictCode({
      existingCaptionHash: 'same-hash',
      currentCaptionHash: 'same-hash',
      status: 'published',
    }),
    'duplicate_publish_blocked'
  );
});

test('requires new approval after a failed attempt', () => {
  assert.equal(
    getMetaPublishConflictCode({
      existingCaptionHash: 'same-hash',
      currentCaptionHash: 'same-hash',
      status: 'failed',
    }),
    'failed_publish_requires_new_approval'
  );
});

test('blocks pending and publishing attempts already in progress', () => {
  for (const status of ['pending', 'publishing']) {
    assert.equal(
      getMetaPublishConflictCode({
        existingCaptionHash: 'same-hash',
        currentCaptionHash: 'same-hash',
        status,
      }),
      'publish_already_reserved'
    );
  }
});
