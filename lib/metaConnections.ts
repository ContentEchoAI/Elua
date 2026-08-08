import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type {
  MetaManagedPage,
  MetaProfile,
  MetaTokenResult,
} from '@/lib/metaAuth';

export async function saveMetaConnection({
  clerkUserId,
  profile,
  token,
}: {
  clerkUserId: string;
  profile: MetaProfile;
  token: MetaTokenResult;
}) {
  return supabaseAdmin.from('meta_connections').upsert(
    {
      clerk_user_id: clerkUserId,
      meta_user_id: profile.id,
      meta_user_name: profile.name,
      access_token: token.accessToken,
      token_type: token.tokenType,
      expires_at: token.expiresAt,
      scopes: token.scopes,
      facebook_page_id: null,
      facebook_page_name: null,
      page_access_token: null,
      page_token_type: null,
      page_token_expires_at: null,
      instagram_account_id: null,
      instagram_username: null,
      publishing_enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_user_id' }
  );
}


export async function getMetaConnection(clerkUserId: string) {
  return supabaseAdmin
    .from('meta_connections')
    .select(
      'meta_user_name,access_token,scopes,facebook_page_id,facebook_page_name,instagram_account_id,instagram_username,publishing_enabled'
    )
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();
}

export async function saveSelectedMetaPage({
  clerkUserId,
  page,
}: {
  clerkUserId: string;
  page: MetaManagedPage;
}) {
  return supabaseAdmin
    .from('meta_connections')
    .update({
      facebook_page_id: page.id,
      facebook_page_name: page.name,
      page_access_token: page.accessToken,
      page_token_type: 'bearer',
      page_token_expires_at: null,
      instagram_account_id: page.instagramAccount?.id || null,
      instagram_username: page.instagramAccount?.username || null,
      publishing_enabled: false,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', clerkUserId);
}
export async function deleteMetaConnection(clerkUserId: string) {
  return supabaseAdmin
    .from('meta_connections')
    .delete()
    .eq('clerk_user_id', clerkUserId);
}
