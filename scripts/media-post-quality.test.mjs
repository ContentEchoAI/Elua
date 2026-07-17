import assert from 'node:assert/strict';
import test from 'node:test';

import { getSingleUploadedPhotoShotOrder } from '../lib/mediaPostQuality.ts';

test('keeps one before-and-after collage as one Facebook visual', () => {
  assert.deepEqual(
    getSingleUploadedPhotoShotOrder({
      uploadedVisualCount: 1,
      hasUploadedVideoFrames: false,
      selectedOutputs: ['Facebook Post'],
      originalRequest: 'Before and after backyard cleanup.',
    }),
    ['Use the single before-and-after image as the Facebook post visual.']
  );
});

test('keeps one regular photo as one Instagram visual', () => {
  assert.deepEqual(
    getSingleUploadedPhotoShotOrder({
      uploadedVisualCount: 1,
      hasUploadedVideoFrames: false,
      selectedOutputs: ['Instagram Carousel'],
      originalRequest: 'Show this finished nail set.',
    }),
    ['Use the single uploaded photo as the Instagram post visual.']
  );
});

test('does not override multiple uploaded photos', () => {
  assert.equal(
    getSingleUploadedPhotoShotOrder({
      uploadedVisualCount: 2,
      hasUploadedVideoFrames: false,
      selectedOutputs: ['Facebook Post'],
      originalRequest: 'Before and after backyard cleanup.',
    }),
    null
  );
});

test('does not override video frames or video outputs', () => {
  assert.equal(
    getSingleUploadedPhotoShotOrder({
      uploadedVisualCount: 1,
      hasUploadedVideoFrames: true,
      selectedOutputs: ['Facebook Post'],
      originalRequest: 'Show this cleanup.',
    }),
    null
  );

  assert.equal(
    getSingleUploadedPhotoShotOrder({
      uploadedVisualCount: 1,
      hasUploadedVideoFrames: false,
      selectedOutputs: ['Instagram Reel'],
      originalRequest: 'Show this cleanup.',
    }),
    null
  );
});

test('flags unsupported media-caption claims', async () => {
  const { needsMediaCaptionGroundingRewrite } =
    await import('../lib/mediaPostQuality.ts');

  const request =
    'Before and after backyard cleanup. Show the visible transformation.';

  const unsupported = [
    'We cleared out years of overgrowth.',
    'The backyard is finally usable again.',
    'We edged and mowed the entire yard.',
    'I cleared the weeds from the patio and shaped the lawn for a cleaner look.',
  ];

  for (const caption of unsupported) {
    assert.equal(
      needsMediaCaptionGroundingRewrite(caption, request),
      true,
      caption
    );
  }

  assert.equal(
    needsMediaCaptionGroundingRewrite(
      'The yard looks cleaner and more open after this cleanup.',
      request
    ),
    false
  );
});

test('allows supplied service-action details', async () => {
  const { needsMediaCaptionGroundingRewrite } =
    await import('../lib/mediaPostQuality.ts');

  assert.equal(
    needsMediaCaptionGroundingRewrite(
      'We mowed and edged the yard.',
      'Before and after yard cleanup with mowing and edging.'
    ),
    false
  );
});

test('removes unsupported specific-service hashtags', async () => {
  const { filterGroundedMediaHashtags } =
    await import('../lib/mediaPostQuality.ts');

  assert.deepEqual(
    filterGroundedMediaHashtags(
      ['#YardCleanup', '#Landscaping', '#WeedControl', '#LawnMowing'],
      'Before and after backyard cleanup.'
    ),
    ['#YardCleanup', '#Landscaping']
  );

  assert.deepEqual(
    filterGroundedMediaHashtags(
      ['#YardCleanup', '#WeedControl'],
      'Backyard cleanup and weed control.'
    ),
    ['#YardCleanup', '#WeedControl']
  );
});
