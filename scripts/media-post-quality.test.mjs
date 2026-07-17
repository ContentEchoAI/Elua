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
