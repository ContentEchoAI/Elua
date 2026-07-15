import { createClient } from '@supabase/supabase-js';

const ENABLE_CONFIRMATION = 'ENABLE_FACEBOOK_PUBLISHING';

function getArgument(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length).trim() : '';
}

function formatConnection(connection) {
  const environmentEnabled =
    process.env.META_LIVE_PUBLISH_ENABLED === 'true';
  const accountEnabled = connection.publishing_enabled === true;

  return {
    pageName: connection.facebook_page_name || 'Unnamed Facebook Page',
    pageId: connection.facebook_page_id || 'Not selected',
    instagram: connection.instagram_username
      ? `@${connection.instagram_username}`
      : 'Not linked',
    pageTokenStored: Boolean(connection.page_access_token),
    accountGate: accountEnabled ? 'enabled' : 'disabled',
    environmentGate: environmentEnabled ? 'enabled' : 'disabled',
    effectivePublishing:
      accountEnabled && environmentEnabled ? 'enabled' : 'disabled',
  };
}

async function main() {
  const command = process.argv[2] || 'status';

  if (!['status', 'enable', 'disable'].includes(command)) {
    throw new Error(
      'Use status, enable, or disable as the first command.'
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: connections, error } = await supabase
    .from('meta_connections')
    .select(
      'clerk_user_id,facebook_page_id,facebook_page_name,page_access_token,instagram_username,publishing_enabled,updated_at'
    )
    .not('facebook_page_id', 'is', null)
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(`Could not load Meta connections: ${error.message}`);
  }

  if (!connections?.length) {
    console.log('No selected Facebook Pages were found.');
    return;
  }

  if (command === 'status') {
    console.table(connections.map(formatConnection));
    return;
  }

  const requestedPageId = getArgument('page-id');

  const target = requestedPageId
    ? connections.find(
        (connection) => connection.facebook_page_id === requestedPageId
      )
    : connections.length === 1
      ? connections[0]
      : null;

  if (!target) {
    throw new Error(
      requestedPageId
        ? 'No Meta connection matches that Facebook Page ID.'
        : 'More than one Facebook Page is connected. Add --page-id=PAGE_ID.'
    );
  }

  if (command === 'enable') {
    const confirmation = getArgument('confirm');

    if (confirmation !== ENABLE_CONFIRMATION) {
      throw new Error(
        `Enabling requires --confirm=${ENABLE_CONFIRMATION}`
      );
    }

    if (!target.page_access_token) {
      throw new Error(
        'The selected Facebook Page does not have a stored Page access token.'
      );
    }
  }

  const publishingEnabled = command === 'enable';

  const { data: updated, error: updateError } = await supabase
    .from('meta_connections')
    .update({
      publishing_enabled: publishingEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', target.clerk_user_id)
    .select(
      'facebook_page_id,facebook_page_name,page_access_token,instagram_username,publishing_enabled'
    )
    .single();

  if (updateError || !updated) {
    throw new Error(
      `Could not update the publishing gate: ${
        updateError?.message || 'Unknown error'
      }`
    );
  }

  console.table([formatConnection(updated)]);

  if (publishingEnabled) {
    console.log(
      'Account gate enabled. Live publishing still requires META_LIVE_PUBLISH_ENABLED=true.'
    );
  } else {
    console.log('Account gate disabled. Live publishing is blocked.');
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Publishing gate command failed.'
  );
  process.exitCode = 1;
});
