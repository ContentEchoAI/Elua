import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { MetaProfile, MetaTokenResult } from '@/lib/metaAuth';

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
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clerk_user_id' }
  );
}
