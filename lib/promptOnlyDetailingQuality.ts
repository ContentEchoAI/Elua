function hasUnsupportedResultDescription(caption: string, prompt: string) {
  const resultPatterns = [
    /\b(?:dark|light|clean|fresh)\s+seats?\b/i,
    /\bdefined stitching\b/i,
    /\b(?:clearer|shinier|restored|polished)\s+(?:paint|finish)\b/i,
    /\b(?:mid-day|mirror-like)\s+shine\b/i,
    /\b(?:now showing|now looking|came out|turned out)\b/i,
    /\b(?:before\s*(?:and|&)?\s*after|transformation|final reveal)\b/i,
  ];

  return resultPatterns.some(
    (pattern) => pattern.test(caption) && !pattern.test(prompt)
  );
}

export function cleanPromptOnlyDetailingCaption(
  caption: string,
  prompt: string
) {
  if (!hasUnsupportedResultDescription(caption, prompt)) {
    return caption;
  }

  const sentences = caption.match(/[^.!?]+[.!?]*/g) || [];

  const safeSentences = sentences.filter((sentence) => {
    const text = sentence.trim();
    return text && !hasUnsupportedResultDescription(text, prompt);
  });

  const cleaned = safeSentences
    .map((sentence) => sentence.trim())
    .join(' ')
    .trim();

  return cleaned || 'DM CAR to ask about mobile detailing.';
}
