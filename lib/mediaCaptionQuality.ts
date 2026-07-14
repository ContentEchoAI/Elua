export function getCaptionOpening(value: string) {
  return (
    value
      .split(/\n+/)
      .map((line) => line.trim())
      .find(Boolean) || ''
  );
}

export function needsHumanMediaCaptionRewrite(value: string) {
  const opening = getCaptionOpening(value);

  if (!opening) {
    return false;
  }

  const weakOpeningPatterns = [
    /^(okay|ok)\b/i,
    /^(i am|i'm|we are|we're)\s+obsessed\b/i,
    /^loving\s+(this|these|the)\b/i,
    /^can we talk about\b/i,
    /^look at\s+(this|these)\b/i,
    /^(when you want|for the person who|this is what happens when|ready to|looking for|pov\b)/i,
    /^(this|that)\s+(set|look|design|one|result|room|car|yard|space)?\s*(is\s+)?(way\s+)?too\s+(cute|good|pretty|clean|fresh)\b/i,
    /^(this|that|these|those|the|it)\b.{0,60}\b(mix(?:es)?|feature(?:s)?|include(?:s)?|show(?:s)?|use(?:s)?|combine(?:s)?|pair(?:s)?|add(?:s)?|have|has)\b/i,
    /^[^.!?\n]{1,50},\s*[^.!?\n]{1,50},\s*(?:and\s+)?[^.!?\n]{1,70}\b(mix(?:es)?|feature(?:s)?|include(?:s)?|show(?:s)?|use(?:s)?|combine(?:s)?|pair(?:s)?|add(?:s)?|have|has|make(?:s)?|create(?:s)?|give(?:s)?)\b/i,
  ];

  if (weakOpeningPatterns.some((pattern) => pattern.test(opening))) {
    return true;
  }

  const commaCount = (opening.match(/,/g) || []).length;

  return commaCount >= 3;
}
