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

export function needsMediaCaptionGroundingRewrite(
  caption: string,
  originalRequest: string
) {
  const normalizedCaption = caption.replace(/\s+/g, ' ').trim();
  const normalizedRequest = originalRequest.replace(/\s+/g, ' ').trim();

  const rules = [
    {
      claim:
        /\b(?:years?|months?|weeks?) of (?:overgrowth|neglect|buildup)\b/i,
      support:
        /\b(?:years?|months?|weeks?) of (?:overgrowth|neglect|buildup)\b/i,
    },
    {
      claim:
        /\b(?:finally|now)\s+(?:usable|enjoyable|functional)(?:\s+again)?\b/i,
      support: /\b(?:usable|enjoyable|functional)\b/i,
    },
    {
      claim:
        /\b(?:edged|edging|mowed|mowing|trimmed|trimming|weed control|pressure washed|pressure washing|shampooed|shampooing|deep cleaned|deep cleaning)\b/i,
      support:
        /\b(?:edged|edging|mowed|mowing|trimmed|trimming|weed control|pressure washed|pressure washing|shampooed|shampooing|deep cleaned|deep cleaning)\b/i,
    },
    {
      claim:
        /\b(?:cleared|removed|pulled)\s+(?:out\s+)?(?:the\s+)?weeds?\b/i,
      support:
        /\b(?:weed control|weeding|weeds?|cleared|removed|pulled)\b/i,
    },
    {
      claim:
        /\bshaped\s+(?:the\s+)?lawn\b/i,
      support:
        /\b(?:shaped?\s+(?:the\s+)?lawn|lawn shaping)\b/i,
    },
  ];

  return rules.some(
    ({ claim, support }) =>
      claim.test(normalizedCaption) &&
      !support.test(normalizedRequest)
  );
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
