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

test('removes awkward collage-panel references without flattening the caption', async () => {
  const { cleanCollagePanelCaptionReference } =
    await import('../lib/mediaPostQuality.ts');

  assert.equal(
    cleanCollagePanelCaptionReference(
      'If your backyard looks like the top photo, send me a message or comment QUOTE.'
    ),
    'If you want help with your backyard, send me a message or comment QUOTE.'
  );

  assert.equal(
    cleanCollagePanelCaptionReference(
      'The cleanup made a big difference in this backyard.'
    ),
    'The cleanup made a big difference in this backyard.'
  );
});
