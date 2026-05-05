import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.');
  }

  if (!supabaseSecretKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY in .env.local.');
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const supabase = getSupabaseAdmin();

    const { id } = await context.params;
    const body = await req.json();
    const clerkUserId = body?.clerkUserId;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing saved generation ID.' },
        { status: 400 }
      );
    }

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing Clerk user ID.' },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('saved_generations')
      .delete()
      .eq('id', id)
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to delete saved generation.',
          supabaseMessage: error.message,
          supabaseCode: error.code,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    let message = 'Something went wrong while deleting saved generation.';

    if (error instanceof Error) {
      message = error.message;
    }

    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}