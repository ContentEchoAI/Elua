import { NextResponse } from 'next/server';
import { getCurrentClerkUserId } from '@/lib/clerkServer';
import {
  fetchManagedMetaPages,
  type MetaManagedPage,
} from '@/lib/metaAuth';
import {
  getMetaConnection,
  saveSelectedMetaPage,
} from '@/lib/metaConnections';

export const dynamic = 'force-dynamic';

type SelectMetaPageRequest = {
  pageId?: string;
};

function sanitizePage(page: MetaManagedPage) {
  return {
    id: page.id,
    name: page.name,
    tasks: page.tasks,
    instagramAccount: page.instagramAccount,
  };
}

export async function GET() {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return NextResponse.json(
      {
        ok: false,
        code: 'signed_out',
        message: 'Sign in before connecting a Facebook Page.',
      },
      { status: 401 }
    );
  }

  const { data: connection, error } =
    await getMetaConnection(clerkUserId);

  if (error) {
    console.error('Meta connection lookup failed:', error);

    return NextResponse.json(
      {
        ok: false,
        code: 'connection_lookup_failed',
        message: 'Could not check your Meta connection.',
      },
      { status: 500 }
    );
  }

  if (!connection?.access_token) {
    return NextResponse.json(
      {
        ok: false,
        code: 'meta_not_connected',
        message: 'Connect Facebook before choosing a Page.',
      },
      { status: 409 }
    );
  }

  try {
    const pages = await fetchManagedMetaPages(
      connection.access_token
    );

    return NextResponse.json({
      ok: true,
      pages: pages.map(sanitizePage),
      selectedPageId: connection.facebook_page_id || null,
      selectedInstagramAccountId:
        connection.instagram_account_id || null,
    });
  } catch (discoveryError) {
    console.error('Meta Page discovery failed:', discoveryError);

    return NextResponse.json(
      {
        ok: false,
        code: 'page_discovery_failed',
        message:
          'Could not load your Facebook Pages. Reconnect Facebook and try again.',
      },
      { status: 502 }
    );
  }
}

export async function POST(request: Request) {
  const clerkUserId = await getCurrentClerkUserId();

  if (!clerkUserId) {
    return NextResponse.json(
      {
        ok: false,
        code: 'signed_out',
        message: 'Sign in before choosing a Facebook Page.',
      },
      { status: 401 }
    );
  }

  let body: SelectMetaPageRequest;

  try {
    body = (await request.json()) as SelectMetaPageRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        code: 'invalid_json',
        message: 'Invalid Page selection request.',
      },
      { status: 400 }
    );
  }

  const pageId =
    typeof body.pageId === 'string' ? body.pageId.trim() : '';

  if (!pageId) {
    return NextResponse.json(
      {
        ok: false,
        code: 'missing_page_id',
        message: 'Choose a Facebook Page first.',
      },
      { status: 400 }
    );
  }

  const { data: connection, error } =
    await getMetaConnection(clerkUserId);

  if (error || !connection?.access_token) {
    return NextResponse.json(
      {
        ok: false,
        code: 'meta_not_connected',
        message: 'Reconnect Facebook before choosing a Page.',
      },
      { status: 409 }
    );
  }

  try {
    const pages = await fetchManagedMetaPages(
      connection.access_token
    );
    const selectedPage = pages.find((page) => page.id === pageId);

    if (!selectedPage) {
      return NextResponse.json(
        {
          ok: false,
          code: 'page_not_available',
          message:
            'That Facebook Page is not available for this connection.',
        },
        { status: 404 }
      );
    }

    const { error: saveError } = await saveSelectedMetaPage({
      clerkUserId,
      page: selectedPage,
    });

    if (saveError) {
      console.error('Meta Page selection save failed:', saveError);

      return NextResponse.json(
        {
          ok: false,
          code: 'page_save_failed',
          message: 'Could not save the selected Facebook Page.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      selectedPage: sanitizePage(selectedPage),
      publishingEnabled: false,
      message: `${selectedPage.name} is connected. Publishing is still disabled.`,
    });
  } catch (selectionError) {
    console.error('Meta Page selection failed:', selectionError);

    return NextResponse.json(
      {
        ok: false,
        code: 'page_selection_failed',
        message:
          'Could not select that Facebook Page. Reconnect Facebook and try again.',
      },
      { status: 502 }
    );
  }
}
