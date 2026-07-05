import { NextResponse } from 'next/server';

type MetaPublishRequest = {
  caption?: string;
  hashtags?: string[] | string;
  platform?: string;
  mediaUrls?: string[];
};

export async function POST(request: Request) {
  let body: MetaPublishRequest;

  try {
    body = (await request.json()) as MetaPublishRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_json',
        message: 'Invalid publish request.',
      },
      { status: 400 },
    );
  }

  const caption = typeof body.caption === 'string' ? body.caption.trim() : '';

  if (!caption) {
    return NextResponse.json(
      {
        ok: false,
        code: 'missing_caption',
        message: 'A caption is required before publishing.',
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      approved: true,
      publishEnabled: false,
      code: 'meta_publish_not_enabled',
      message:
        'Your post is approved and ready. Nothing was posted yet.',
      nextStep:
        'Connect publishing when you want Hummingbird to post for you.',
    },
    { status: 501 },
  );
}
