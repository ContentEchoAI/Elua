import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCaptionOpening,
  needsHumanMediaCaptionRewrite,
} from '../lib/mediaCaptionQuality.ts';

test('extracts the first non-empty caption line', () => {
  assert.equal(
    getCaptionOpening('\n\nA specific opening.\nMore context.'),
    'A specific opening.'
  );
});

test('flags photo-inventory openings', () => {
  const weakCaptions = [
    'These nails mix pastel swirls, tiny flowers, and bright dots.',
    'Pastel swirls, tiny flowers, and bright dots mix in this playful set.',
    'This set features soft colors and floral details.',
    'Those photos show a clean room, bright counters, and fresh floors.',
    'This car has polished paint and clean wheels.',
    'Pastel blue, pink, gold, and white details make up this set.',
  ];

  for (const caption of weakCaptions) {
    assert.equal(
      needsHumanMediaCaptionRewrite(caption),
      true,
      caption
    );
  }
});

test('flags generic and formulaic openings', () => {
  const weakCaptions = [
    'Okay, this set is way too cute.',
    'I am obsessed with this look.',
    'Loving this design.',
    'Can we talk about these nails?',
    'When you want every nail to feel different.',
    'POV: you finally found your next nail set.',
  ];

  for (const caption of weakCaptions) {
    assert.equal(
      needsHumanMediaCaptionRewrite(caption),
      true,
      caption
    );
  }
});

test('allows specific human openings', () => {
  const acceptableCaptions = [
    'She wanted every nail to feel different without the set looking random.',
    'The hardest part was choosing which detail to make the main focus.',
    'This client knew she wanted something playful, but not overly busy.',
    'We kept the colors soft so the different designs still felt connected.',
  ];

  for (const caption of acceptableCaptions) {
    assert.equal(
      needsHumanMediaCaptionRewrite(caption),
      false,
      caption
    );
  }
});
