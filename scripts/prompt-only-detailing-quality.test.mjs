import assert from 'node:assert/strict';
import test from 'node:test';

import {
  cleanPromptOnlyDetailingCaption,
} from '../lib/promptOnlyDetailingQuality.ts';

test('removes invented completed-job descriptions', () => {
  const prompt =
    'Mobile detailing in Irvine. Promote interior and exterior detailing.';

  const caption =
    'Dark seats with light dust now showing deep color and defined stitching; exterior paint showing a clearer mid-day shine. DM CAR for a quote.';

  const result = cleanPromptOnlyDetailingCaption(caption, prompt);

  assert.doesNotMatch(result, /dark seats|defined stitching|mid-day shine/i);
  assert.match(result, /DM CAR/i);
});

test('preserves real customer-provided offers', () => {
  const prompt =
    'Mobile detailing in Irvine. We offer ceramic coating and paint correction. Promote our $150 ceramic coating special.';

  const caption =
    'Irvine drivers: our $150 ceramic coating special is available. DM us to ask about paint correction or ceramic coating.';

  const result = cleanPromptOnlyDetailingCaption(caption, prompt);

  assert.equal(result, caption);
});

test('preserves real offers and CTAs while removing invented results', () => {
  const prompt =
    'Mobile detailing in Irvine. We offer ceramic coating for $150.';

  const caption =
    'Our $150 ceramic coating offer is available in Irvine. Dark seats now showing deep color and defined stitching. DM CAR for a quote.';

  const result = cleanPromptOnlyDetailingCaption(caption, prompt);

  assert.match(result, /\$150 ceramic coating/);
  assert.doesNotMatch(result, /dark seats|defined stitching/i);
  assert.match(result, /DM CAR/);
});
