import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

type SaveBody = {
  clerkUserId?: string;
  title?: string;
  input?: string;
  mode?: 'growth_system' | 'viral_hooks';
  goal?: string;
  voice?: string;
  results?: unknown;
};

type SupabaseRow = {
  id: string;
  title: string;
  input: string;
  mode: 'growth_system' | 'viral_hooks';
  goal: string;
  voice: string;
  created_at: string;
  results: unknown;
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

function mapSavedGeneration(row: SupabaseRow) {
  return {
    id: row.id,
    title: row.title,
    input: row.input,
    mode: row.mode,
    goal: row.goal,
    voice: row.voice,
    createdAt: row.created_at,
    results: row.results,
  };
}

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const url = new URL(req.url);
    const clerkUserId = url.searchParams.get('clerkUserId');

    const { userId: authedUserId } = await auth();
    if (!authedUserId || authedUserId !== clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing Clerk user ID.' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('saved_generations')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to load saved generations.',
          supabaseMessage: error.message,
          supabaseCode: error.code,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      savedGenerations: ((data || []) as SupabaseRow[]).map(
        mapSavedGeneration
      ),
    });
  } catch (error) {
    let message = 'Something went wrong while loading saved generations.';

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

export async function POST(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const body = (await req.json()) as SaveBody;

    const clerkUserId = body.clerkUserId;

    const { userId: authedUserId } = await auth();
    if (!authedUserId || authedUserId !== clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const title = body.title?.trim();
    const input = body.input?.trim();
    const mode = body.mode;
    const goal = body.goal;
    const voice = body.voice;
    const results = body.results;

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Missing Clerk user ID.' },
        { status: 401 }
      );
    }

    if (!title || !input || !mode || !goal || !voice || !results) {
      return NextResponse.json(
        { error: 'Missing required saved generation fields.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('saved_generations')
      .insert({
        clerk_user_id: clerkUserId,
        title,
        input,
        mode,
        goal,
        voice,
        results,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to save generation.',
          supabaseMessage: error.message,
          supabaseCode: error.code,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      savedGeneration: mapSavedGeneration(data as SupabaseRow),
    });
  } catch (error) {
    let message = 'Something went wrong while saving generation.';

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

export async function DELETE(req: Request) {
  try {
    const supabase = getSupabaseAdmin();

    const body = await req.json();
    const clerkUserId = body?.clerkUserId;

    const { userId: authedUserId } = await auth();
    if (!authedUserId || authedUserId !== clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
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
      .eq('clerk_user_id', clerkUserId);

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to clear saved generations.',
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
    let message = 'Something went wrong while clearing saved generations.';

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