import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      code: 'meta_connection_not_enabled',
      message:
        'Meta connection is not enabled yet. Next step is adding OAuth, callback handling, and secure token storage.',
    },
    { status: 501 },
  );
}
