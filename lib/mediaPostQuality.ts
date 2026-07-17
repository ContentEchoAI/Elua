export function getSingleUploadedPhotoShotOrder({
  uploadedVisualCount,
  hasUploadedVideoFrames,
  selectedOutputs,
  originalRequest,
}: {
  uploadedVisualCount: number;
  hasUploadedVideoFrames: boolean;
  selectedOutputs: string[];
  originalRequest: string;
}) {
  if (uploadedVisualCount !== 1 || hasUploadedVideoFrames) {
    return null;
  }

  const usesVideoOutput = selectedOutputs.some((output) =>
    /Instagram Reel|TikTok|YouTube Shorts/i.test(output)
  );

  if (usesVideoOutput) {
    return null;
  }

  const platformLabel = selectedOutputs.some((output) =>
    /Facebook/i.test(output)
  )
    ? 'Facebook post'
    : selectedOutputs.some((output) => /LinkedIn/i.test(output))
      ? 'LinkedIn post'
      : selectedOutputs.some((output) => /Instagram/i.test(output))
        ? 'Instagram post'
        : 'post';

  const isBeforeAfter =
    /\b(before\s*(?:and|&|\/)?\s*after|transformation|makeover|final reveal)\b/i.test(
      originalRequest
    );

  return [
    isBeforeAfter
      ? `Use the single before-and-after image as the ${platformLabel} visual.`
      : `Use the single uploaded photo as the ${platformLabel} visual.`,
  ];
}
