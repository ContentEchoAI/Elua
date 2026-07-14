import assert from 'node:assert/strict';
import test from 'node:test';

import { publishFacebookPagePost } from '../lib/metaFacebook.ts';

test('publishes to the Page feed and returns the permalink', async () => {
  const originalFetch = globalThis.fetch;
  const originalVersion = process.env.META_GRAPH_VERSION;
  const calls = [];

  process.env.META_GRAPH_VERSION = 'v25.0';

  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });

    if (calls.length === 1) {
      return new Response(
        JSON.stringify({ id: '12345_67890' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        permalink_url: 'https://www.facebook.com/12345/posts/67890',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  };

  try {
    const result = await publishFacebookPagePost({
      pageId: '12345',
      pageAccessToken: 'page-token',
      message: 'Test post',
    });

    assert.equal(result.metaPostId, '12345_67890');
    assert.equal(
      result.permalinkUrl,
      'https://www.facebook.com/12345/posts/67890'
    );

    assert.equal(
      calls[0].url,
      'https://graph.facebook.com/v25.0/12345/feed'
    );
    assert.equal(calls[0].options.method, 'POST');

    const body = calls[0].options.body;
    assert.equal(body.get('message'), 'Test post');
    assert.equal(body.get('access_token'), 'page-token');

    assert.match(calls[1].url, /12345_67890/);
    assert.match(calls[1].url, /fields=permalink_url/);
  } finally {
    globalThis.fetch = originalFetch;

    if (originalVersion === undefined) {
      delete process.env.META_GRAPH_VERSION;
    } else {
      process.env.META_GRAPH_VERSION = originalVersion;
    }
  }
});

test('throws a useful Meta error without exposing the token', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'Permission denied',
          code: 200,
          error_subcode: 2018145,
        },
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  try {
    await assert.rejects(
      () =>
        publishFacebookPagePost({
          pageId: '12345',
          pageAccessToken: 'secret-page-token',
          message: 'Test post',
        }),
      (error) => {
        assert.match(error.message, /Permission denied/);
        assert.match(error.message, /code 200/);
        assert.doesNotMatch(error.message, /secret-page-token/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
