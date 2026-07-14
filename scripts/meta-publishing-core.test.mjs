import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMetaCaptionHash,
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
