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
  const caption = value.replace(/\s+/g, ' ').trim();

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
    /^(some|many|most|a lot of)\s+(clients?|customers?|people)\b.{0,80}\b(want|love|ask|prefer|look for)\b/i,
    /^(this|that)\s+(set|look|design|one|result|room|car|yard|space)?\s*(is\s+)?(way\s+)?too\s+(cute|good|pretty|clean|fresh)\b/i,
    /^(this|that|these|those|the|it)\b.{0,60}\b(mix(?:es)?|feature(?:s)?|include(?:s)?|show(?:s)?|use(?:s)?|combine(?:s)?|pair(?:s)?|add(?:s)?|have|has)\b/i,
    /^[^.!?\n]{1,50},\s*[^.!?\n]{1,50},\s*(?:and\s+)?[^.!?\n]{1,70}\b(mix(?:es)?|feature(?:s)?|include(?:s)?|show(?:s)?|use(?:s)?|combine(?:s)?|pair(?:s)?|add(?:s)?|have|has|make(?:s)?|create(?:s)?|give(?:s)?)\b/i,
  ];

  const weakCaptionPatterns = [
    /\btell(?:s|ing)? (?:a|their|your) story\b/i,
    /\bunique touch\b/i,
    /\bstands? out\b/i,
    /\bwithout overwhelming\b/i,
    /\bfresh look\b/i,
    /\bmake(?:s)? a statement\b/i,
    /\bperfect balance\b/i,
    /\bsubtle yet\b/i,
    /\bbold yet\b/i,
    /\bone[- ]of[- ]a[- ]kind\b/i,
    /\beye[- ]catching\b/i,
    /\bplayful (?:set|look|design)\b/i,
    /\bfor a (?:fun|fresh|unique|playful) look\b/i,
    /\bfit(?:s)? (?:any|every) look\b/i,
    /\bsimple (?:but|yet) polished\b/i,
    /\bgoes with (?:everything|anything)\b/i,
  ];

  if (
    weakOpeningPatterns.some((pattern) => pattern.test(opening)) ||
    weakCaptionPatterns.some((pattern) => pattern.test(caption))
  ) {
    return true;
  }

  const commaCount = (opening.match(/,/g) || []).length;

  return commaCount >= 3;
}

export type MediaCaptionPostType =
  | 'transformation'
  | 'finished_work'
  | 'behind_the_scenes'
  | 'education'
  | 'proof'
  | 'offer'
  | 'general';

export function inferMediaCaptionPostType(
  originalRequest: string
): MediaCaptionPostType {
  const value = originalRequest.replace(/\s+/g, ' ').trim().toLowerCase();

  if (
    /\b(before\s*(?:and|&|\/)?\s*after|transformation|makeover|restoration|from\s+.+\s+to\s+.+|final reveal)\b/i.test(
      value
    )
  ) {
    return 'transformation';
  }

  if (
    /\b(behind the scenes|work in progress|in progress|process|prep(?:ping)?|setting up|setup|step by step|how (?:i|we) made)\b/i.test(
      value
    )
  ) {
    return 'behind_the_scenes';
  }

  if (
    /\b(tip|tips|how to|what to know|why |common mistake|faq|frequently asked|educat(?:e|ion|ional)|explain)\b/i.test(
      value
    )
  ) {
    return 'education';
  }

  if (
    /\b(testimonial|review|client feedback|customer feedback|client said|customer said|case study)\b/i.test(
      value
    )
  ) {
    return 'proof';
  }

  if (
    /\b(availability|available now|openings|appointments? available|now booking|now accepting|special offer|limited offer|sale|discount|promotion)\b/i.test(
      value
    )
  ) {
    return 'offer';
  }

  if (
    /\b(finished|final result|completed|fresh set|new set|new look|recent work|showcase|reveal)\b/i.test(
      value
    )
  ) {
    return 'finished_work';
  }

  return 'general';
}

export function getMediaCaptionPostTypeGuidance(
  postType: MediaCaptionPostType
) {
  const guidance: Record<MediaCaptionPostType, string> = {
    transformation:
      'Lead with the visible change or the problem that was resolved. Name one meaningful before-and-after difference, then give one next step.',
    finished_work:
      'Lead with the most noticeable finished detail or the customer preference it suits. Add one short reason the result matters, then give one next step.',
    behind_the_scenes:
      'Lead with one real decision, step, or process detail. Briefly explain why it matters to the finished work, then give one next step.',
    education:
      'Lead with one useful question, misconception, or practical tip. Give one clear answer without turning the caption into a lesson, then give one next step.',
    proof:
      'Lead with the specific feedback or result supplied by the user. Keep the claim exact and grounded, then give one next step.',
    offer:
      'Lead with what is genuinely available and who it is for. Include only supplied timing, pricing, or availability details, then give one next step.',
    general:
      'Choose the best-fitting structure from the images and request: transformation, finished work, behind the scenes, education, proof, or offer.',
  };

  return guidance[postType];
}
