import { supabaseBrowser } from './supabaseBrowser';

export async function uploadVideoDirect(file: File): Promise<string | null> {
  try {
    const extension = file.name.split('.').pop() || 'mp4';

    const res = await fetch('/api/media/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extension }),
    });

    const data = await res.json().catch(() => ({}));

    if (!data || !data.ok || !data.signedUrl || !data.token || !data.path) {
      console.warn('Signed upload URL request failed:', data);
      return null;
    }

    const { error: uploadError } = await supabaseBrowser.storage
      .from('post-media')
      .uploadToSignedUrl(data.path, data.token, file);

    if (uploadError) {
      console.warn('Direct video upload failed:', uploadError);
      return null;
    }

    return data.publicUrl as string;
  } catch (error) {
    console.warn('Direct video upload warning:', error);
    return null;
  }
}
