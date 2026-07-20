export type UploadableImage = {
  dataUrl: string;
};

export async function uploadAllImages(
  images: UploadableImage[]
): Promise<string[]> {
  const urls: string[] = [];

  for (const image of images) {
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: image.dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.ok && data.url) {
        urls.push(data.url);
      }
    } catch (error) {
      console.warn('Media upload warning:', error);
    }
  }

  return urls;
}
