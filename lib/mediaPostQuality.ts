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

export function filterGroundedMediaHashtags(
  value: unknown,
  originalRequest: string
) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedRequest = originalRequest.toLowerCase();

  const rules = [
    {
      tag: /weedcontrol/i,
      support: /\b(?:weed control|weeding|weeds?)\b/i,
    },
    {
      tag: /(?:lawnmowing|mowing)/i,
      support: /\bmow(?:ing|ed)?\b/i,
    },
    {
      tag: /edging/i,
      support: /\bedg(?:ing|ed)?\b/i,
    },
    {
      tag: /trimming/i,
      support: /\btrim(?:ming|med)?\b/i,
    },
    {
      tag: /(?:pressurewashing|powerwashing)/i,
      support: /\b(?:pressure|power)\s+wash(?:ing|ed)?\b/i,
    },
    {
      tag: /deepcleaning/i,
      support: /\bdeep\s+clean(?:ing|ed)?\b/i,
    },
    {
      tag: /carpetcleaning/i,
      support: /\bcarpet\s+clean(?:ing|ed)?\b/i,
    },
  ];

  const hashtags = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter(
      (hashtag) =>
        !rules.some(
          ({ tag, support }) =>
            tag.test(hashtag) && !support.test(normalizedRequest)
        )
    );

  return Array.from(new Set(hashtags));
}

export function cleanCollagePanelCaptionReference(value: string) {
  return value.replace(
    /\bIf your (backyard|yard|lawn|garden|home|house|room|car|vehicle) looks like (?:the )?(?:top|first) (?:photo|image),?\s*/gi,
    'If you want help with your $1, '
  );
}
