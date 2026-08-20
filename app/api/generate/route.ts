import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import {
  getMediaCaptionPostTypeGuidance,
  inferMediaCaptionPostType,
  needsHumanMediaCaptionRewrite,
} from '@/lib/mediaCaptionQuality';
import {
  cleanCollagePanelCaptionReference,
  filterGroundedMediaHashtags,
  getSingleUploadedPhotoShotOrder,
} from '@/lib/mediaPostQuality';

type StructuredReelScene = {
  visual?: string;
  spoken_line?: string;
  on_screen_text?: string;
};

type StructuredCarouselSlide = {
  slide_number?: number;
  text?: string;
};

type StructuredContent = {
  'Instagram Reel'?: {
    scenes?: StructuredReelScene[];
  };
  'Instagram Carousel'?: {
    slides?: StructuredCarouselSlide[];
  };
};

type ActionPlanStep = {
  day?: string;
  action?: string;
  cta?: string;
  follow_up?: string;
};

type ProductionPlan = {
  format?: string;
  concept?: string;
  what_to_film?: string[];
  shot_order?: string[];
  transition_idea?: string;
  audio_direction?: string;
  hashtags?: string[];
  on_screen_text?: string[];
  spoken_lines?: string[];
  caption?: string;
  cta?: string;
  dm_reply?: string;
  follow_up_message?: string;
};

type BusinessProfile = {
  businessType?: string;
  services?: string;
  idealClient?: string;
  mainCta?: string;
  notes?: string;
};

type RecentCampaign = {
  title?: string;
  input?: string;
  mode?: string;
  goal?: string;
  createdAt?: string;
  angle?: string;
  caption?: string;
  cta?: string;
  reply?: string;
  platform?: string;
};

type UploadedImage = {
  id?: string;
  name?: string;
  dataUrl?: string;
  sourceType?: 'image' | 'video_frame';
  sourceName?: string;
  sourceLabel?: string;
};

type GeneratedResponse = {
  mode?: string;
  strategy?: {
    target_audience?: string;
    core_angle?: string;
    content_goal?: string;
    hook_strategies?: string[];
    emotional_triggers?: string[];
    content_style?: string;
    why_it_works?: string;
    best_platform?: string;
  };
  best_output?: {
    platform?: string;
    reason?: string;
    content?: string;
  };
  content?: Record<string, string>;
  structured_content?: StructuredContent;
  production_plan?: ProductionPlan;
  monetization?: {
    offer_ideas?: string[];
    lead_magnet?: string;
    funnel?: {
      step_1?: string;
      step_2?: string;
      step_3?: string;
    };
    cta_strategy?: string;
    action_plan?: ActionPlanStep[];
    conversion_tips?: string[];
  };
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 8);
}

function cleanMakeMyPostTitle(value: unknown) {
  const rawTitle = normalizeString(value).replace(/[.]+$/g, '');

  if (!rawTitle) {
    return '';
  }

  let cleaned = rawTitle
    .replace(/^(post|create|make|use|show|feature|highlight|showcase)\s+(a|an|this|the)\s+/i, '')
    .replace(/^(post|create|make|use|show|feature|highlight|showcase)\s+/i, '')
    .replace(/\bsocial media post\b/gi, '')
    .replace(/\bcarousel\b/gi, '')
    .replace(/\bbooking prompt\b/gi, '')
    .replace(/\bappointment bookings?\b/gi, 'appointments')
    .replace(/\blead generation asset\b/gi, '')
    .replace(/\bcontent asset\b/gi, '')
    .replace(/\bconversion path\b/gi, '')
    .replace(/\s+showing\s+/i, ' with ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    cleaned = rawTitle;
  }

  const words = cleaned.split(/\s+/);

  if (words.length > 10) {
    cleaned = words.slice(0, 10).join(' ');
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function cleanMakeMyPostCta(value: unknown) {
  const cta = normalizeString(value);

  if (!cta) {
    return '';
  }

  const cleaned = cta
    .replace(/^dm\s+/i, '')
    .replace(/^comment\s+/i, '')
    .replace(/^message\s+/i, '')
    .replace(/^reply\s+/i, '')
    .replace(/^send\s+/i, '')
    .replace(/^text\s+/i, '')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .trim();

  const firstWord = cleaned.split(/\s+/)[0] || '';

  return firstWord.toUpperCase();
}

function normalizeUploadedImages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): UploadedImage | null => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const record = item as UploadedImage;
      const dataUrl = normalizeString(record.dataUrl);

      if (!dataUrl.startsWith('data:image/')) {
        return null;
      }

      const sourceType =
        record.sourceType === 'video_frame' ? 'video_frame' : 'image';
      const name = normalizeString(record.name).slice(0, 120);
      const sourceName = normalizeString(record.sourceName).slice(0, 120);
      const sourceLabel = normalizeString(record.sourceLabel).slice(0, 140);

      return {
        id: normalizeString(record.id).slice(0, 120),
        name,
        dataUrl,
        sourceType,
        sourceName,
        sourceLabel,
      };
    })
    .filter((item): item is UploadedImage => Boolean(item))
    .slice(0, 5);
}

function formatBusinessProfileForPrompt(value: unknown) {
  if (!value || typeof value !== 'object') {
    return 'No saved business profile provided.';
  }

  const profile = value as BusinessProfile;

  const lines = [
    ['Business type', profile.businessType],
    ['Main services', profile.services],
    ['Ideal client', profile.idealClient],
    ['Main CTA', profile.mainCta],
    ['Business notes', profile.notes],
  ]
    .map(([label, fieldValue]) => {
      const text = normalizeString(fieldValue);

      return text ? `- ${label}: ${text}` : '';
    })
    .filter(Boolean);

  return lines.length > 0
    ? lines.join('\n')
    : 'No saved business profile provided.';
}

function formatRecentCampaignsForPrompt(value: unknown) {
  if (!Array.isArray(value)) {
    return 'No recent saved campaigns provided.';
  }

  const campaigns = value
    .slice(0, 3)
    .map((item, index) => {
      if (!item || typeof item !== 'object') {
        return '';
      }

      const campaign = item as RecentCampaign;

      const title = normalizeString(campaign.title);
      const input = normalizeString(campaign.input);
      const goal = normalizeString(campaign.goal);
      const mode = normalizeString(campaign.mode);
      const angle = normalizeString(campaign.angle);
      const caption = normalizeString(campaign.caption);
      const cta = normalizeString(campaign.cta);
      const reply = normalizeString(campaign.reply);
      const platform = normalizeString(campaign.platform);

      if (!title && !input) {
        return '';
      }

      return [
        `Campaign ${index + 1}:`,
        title ? `- Title: ${title}` : '',
        input ? `- Original prompt: ${input}` : '',
        goal ? `- Goal: ${goal}` : '',
        mode ? `- Mode: ${mode}` : '',
        angle ? `- Recent angle: ${angle}` : '',
        caption ? `- Recent post/caption: ${caption}` : '',
        cta ? `- Recent CTA: ${cta}` : '',
        reply ? `- Recent reply: ${reply}` : '',
        platform ? `- Recent platform: ${platform}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .filter(Boolean);

  return campaigns.length > 0
    ? campaigns.join('\n\n')
    : 'No recent saved campaigns provided.';
}

function formatFreshCampaignInstruction({
  content,
  businessProfilePrompt,
  recentCampaignsPrompt,
}: {
  content: string;
  businessProfilePrompt: string;
  recentCampaignsPrompt: string;
}) {
  const current = content.toLowerCase();
  const profile = businessProfilePrompt.toLowerCase();
  const recent = recentCampaignsPrompt.toLowerCase();

  const isLashContext =
    current.includes('lash') ||
    profile.includes('lash') ||
    recent.includes('lash');

  const isBroadNextCampaign =
    current.includes('new weekly') ||
    current.includes('what to book next') ||
    current.includes('next campaign') ||
    current.includes('what to post next') ||
    current.includes('more bookings') ||
    current.includes('more clients') ||
    current.includes('more appointments');

  const recentCoveredRefillVsFullSet =
    recent.includes('refill') && recent.includes('full set');

  if (isLashContext && isBroadNextCampaign && recentCoveredRefillVsFullSet) {
    return [
      'Fresh campaign instruction:',
      '- Recent saved campaigns already covered refill vs full set.',
      '- For this run, do NOT make refill vs full set the main campaign angle.',
      '- Do NOT use a refill vs full set decision guide, refill timing guide, or what-to-book-next checklist as the lead magnet.',
      '- Choose a different weekly lash campaign angle: classic vs hybrid vs volume style education, lash style menu, new-client style guide, appointment-readiness, what to send before booking, lash look preference questions, or client FAQ.',
      '- The CTA can still use the saved Business Profile CTA if appropriate, but the content angle must feel different from the previous refill/full-set campaign.',
    ].join('\n');
  }

  if (recent.trim().length > 0) {
    return [
      'Fresh campaign instruction:',
      '- Compare this draft against the recent saved campaigns listed above before finalizing.',
      '- If the opening line, core angle, CTA, or DM reply closely match a recent campaign, rewrite them with a genuinely different angle, opening, and wording.',
      '- The DM reply specifically must not repeat a recent DM reply word-for-word - vary the phrasing even if the underlying answer is similar.',
    ].join('\n');
  }
  return 'No extra fresh campaign instruction.';
}

function normalizeProductionPlan(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const plan = value as Record<string, unknown>;

  const normalized = {
    format: normalizeString(plan.format),
    concept: normalizeString(plan.concept),
    what_to_film: normalizeStringList(plan.what_to_film),
    shot_order: normalizeStringList(plan.shot_order),
    transition_idea: normalizeString(plan.transition_idea),
    audio_direction: normalizeString(plan.audio_direction),
    on_screen_text: normalizeStringList(plan.on_screen_text),
    spoken_lines: normalizeStringList(plan.spoken_lines),
    caption: normalizeString(plan.caption),
    cta: normalizeString(plan.cta),
    dm_reply: normalizeString(plan.dm_reply),
    follow_up_message: normalizeString(plan.follow_up_message),
  };

  const hasValue =
    normalized.format ||
    normalized.concept ||
    normalized.what_to_film.length > 0 ||
    normalized.shot_order.length > 0 ||
    normalized.transition_idea ||
    normalized.audio_direction ||
    normalized.on_screen_text.length > 0 ||
    normalized.spoken_lines.length > 0 ||
    normalized.caption ||
    normalized.cta ||
    normalized.dm_reply ||
    normalized.follow_up_message;

  return hasValue ? normalized : undefined;
}

function normalizeStructuredReel(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const maybeReel = value as { scenes?: unknown };

  if (!Array.isArray(maybeReel.scenes)) {
    return undefined;
  }

  const scenes = maybeReel.scenes
    .map((scene) => {
      if (!scene || typeof scene !== 'object') {
        return null;
      }

      const sceneRecord = scene as Record<string, unknown>;

      const visual =
        typeof sceneRecord.visual === 'string' ? sceneRecord.visual.trim() : '';
      const spoken_line =
        typeof sceneRecord.spoken_line === 'string'
          ? sceneRecord.spoken_line.trim()
          : '';
      const on_screen_text =
        typeof sceneRecord.on_screen_text === 'string'
          ? sceneRecord.on_screen_text.trim()
          : '';

      if (!visual && !spoken_line && !on_screen_text) {
        return null;
      }

      return {
        visual,
        spoken_line,
        on_screen_text,
      };
    })
    .filter(Boolean) as StructuredReelScene[];

  return scenes.length > 0 ? { scenes } : undefined;
}

function normalizeStructuredCarousel(value: unknown) {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const maybeCarousel = value as { slides?: unknown };

  if (!Array.isArray(maybeCarousel.slides)) {
    return undefined;
  }

  const slides = maybeCarousel.slides
    .map((slide, index) => {
      if (!slide || typeof slide !== 'object') {
        return null;
      }

      const slideRecord = slide as Record<string, unknown>;
      const slideNumber =
        typeof slideRecord.slide_number === 'number'
          ? slideRecord.slide_number
          : index + 1;
      const slideText =
        typeof slideRecord.text === 'string' ? slideRecord.text.trim() : '';

      if (!slideText) {
        return null;
      }

      return {
        slide_number: slideNumber,
        text: slideText,
      };
    })
    .filter(Boolean) as StructuredCarouselSlide[];

  return slides.length > 0 ? { slides } : undefined;
}

function findGeneratedOutput(
  content: Record<string, string> | undefined,
  requestedOutput: string
) {
  if (!content) {
    return '';
  }

  const exactValue = content[requestedOutput];

  if (typeof exactValue === 'string' && exactValue.trim()) {
    return exactValue;
  }

  const requestedKey = normalizeKey(requestedOutput);

  for (const [key, value] of Object.entries(content)) {
    if (
      normalizeKey(key) === requestedKey &&
      typeof value === 'string' &&
      value.trim()
    ) {
      return value;
    }
  }

  return '';
}

const CLEAN_GENERATED_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
  // Wellness / massage / chiropractor / physical therapy safety cleanup
  [/help picking your massage/gi, 'answer your booking questions'],
  [/help you pick your massage/gi, 'answer your booking questions'],
  [/help choosing your massage/gi, 'answer your booking questions'],
  [/help you choose your massage/gi, 'answer your booking questions'],
  [/pick the right massage/gi, 'compare what to ask about'],
  [/choose the right massage/gi, 'compare what to ask about'],
  [/right massage for your needs/gi, 'service questions before booking'],
  [/right massage/gi, 'service question'],
  [/right session/gi, 'booking question'],
  [/right treatment/gi, 'consultation question'],
  [/best massage/gi, 'service option to ask about'],
  [/best treatment/gi, 'consultation question'],
  [/recommend a massage/gi, 'answer booking questions'],
  [/recommend treatment/gi, 'answer consultation questions'],
  [/recommend the fitting massage type/gi, 'answer booking questions'],
  [/book your first massage/gi, 'ask for booking details'],
  [/book your first session/gi, 'ask for booking details'],
  [/book your session/gi, 'ask for booking details'],
  [/book a session this week/gi, 'ask for booking details'],
  [/ready to relax/gi, 'have questions before booking'],
  [/get relief/gi, 'ask what to expect'],
  [/stress relief/gi, 'service awareness'],
  [/deep knot relief/gi, 'firmer pressure questions'],
  [/muscle recovery/gi, 'active lifestyle questions'],
  [/pain relief/gi, 'comfort questions'],
  [/guaranteed relief/gi, 'general appointment questions'],
  [/custom massage booking/gi, 'massage booking question'],
  [/custom massage session/gi, 'massage booking question'],
  [/massage service comparison call/gi, 'service options question'],
  [/first-time massage intro session/gi, 'first visit questions'],
  [/first-time massage session/gi, 'first visit questions'],
  [/massage package/gi, 'booking details'],
  [/prepaid bundle/gi, 'booking details'],
  [/3 or 5 sessions/gi, 'booking details'],
  [/30, 60, or 90 minutes/gi, 'appointment details'],
  [/30, 60, 90 minutes/gi, 'appointment details'],
  [/session lengths/gi, 'appointment details'],
  [/help booking/gi, 'booking questions'],
  [/help choosing your massage/gi, 'answer your booking questions'],
  [/help choose your massage/gi, 'answer your booking questions'],
  [/choosing your massage/gi, 'asking booking questions'],
  [/choose your massage/gi, 'ask booking questions'],
  [/get the right experience/gi, 'know what to ask before booking'],
  [/right experience/gi, 'clear booking questions'],
  [/suitable massage service/gi, 'service option to ask about'],
  [/massage service/gi, 'service option'],
  [/help you find a session time/gi, 'send booking details'],
  [/find a session time/gi, 'send booking details'],
  [/fits your schedule/gi, 'works with your booking needs'],
  [/First visit questions — a gentle introduction massage/gi, 'First visit questions — a simple booking question path'],
  [/gentle introduction massage/gi, 'first visit question path'],
  [/Custom Massage Consultation & Booking/gi, 'Service Questions & Booking Details'],
  [/Custom Massage Consultation/gi, 'Service Questions'],
  [/custom massage consultation/gi, 'service questions'],
  [/discounted bundle of 3 sessions/gi, 'booking details for interested clients'],
  [/discounted bundle/gi, 'booking details'],
  [/bundle of 3 sessions/gi, 'booking details'],
  [/tailored to client preferences/gi, 'based on client questions'],
  [/specific tension areas/gi, 'client questions'],
  [/what type fits your needs/gi, 'which service you are curious about'],
  [/what type are you interested in/gi, 'which service are you curious about'],
  [/what massage type are you considering/gi, 'which service are you curious about'],
  [/Don['’]?t book a massage without/gi, 'Before booking, consider'],
  [/don't book a massage without/gi, 'Before booking, consider'],
  [/find your fit/gi, 'know what to ask about'],
  [/get the right option experience/gi, 'know what to ask before booking'],
  [/get the right experience/gi, 'know what to ask before booking'],
  [/right option experience/gi, 'booking question'],
  [/free checklist/gi, 'question checklist'],
  [/Massage Booking Assistance/gi, 'Booking Questions'],
  [/personalized help to choose between/gi, 'booking questions about'],
  [/help to choose between/gi, 'questions about'],
  [/choose between relaxation, deep tissue, sports, or prenatal massage/gi, 'ask about relaxation, deep tissue, sports, or prenatal massage'],
  [/Follow-up Massage Session/gi, 'Follow-up Booking Questions'],
  [/follow-up massage session/gi, 'follow-up booking questions'],
  [/try a massage type/gi, 'ask follow-up booking questions'],
  [/help you compare what to ask about and feel comfortable/gi, 'help you know what to ask before booking'],
  [/to guide you/gi, 'to help you ask better booking questions'],
  [/leading naturally into service discussions/gi, 'leading into booking questions'],
  [/help picking the service option/gi, 'answer booking questions'],
  [/help picking a service option/gi, 'answer booking questions'],
  [/help choosing the service option/gi, 'answer booking questions'],
  [/help choosing a service option/gi, 'answer booking questions'],
  [/help you pick the service option/gi, 'answer booking questions'],
  [/help you choose the service option/gi, 'answer booking questions'],
  [/help you pick a time/gi, 'send booking details'],
  [/pick a time/gi, 'ask for booking details'],
  [/personalized style suggestions/gi, 'booking questions'],
  [/style suggestions/gi, 'service questions'],
  [/what massage fits you/gi, 'what questions to ask before booking'],
  [/which massage fits you/gi, 'which service you are curious about'],
  [/massage fits you/gi, 'service questions'],
  [/massage that fits you/gi, 'service questions'],
  [/ask about pricing/gi, 'ask for booking details'],
  [/preferred date/gi, 'booking details'],
  [/what day works helpful for you/gi, 'would you like booking details?'],
  [/what day works for you/gi, 'would you like booking details?'],
  [/available massage types/gi, 'service options'],
  [/available massage/gi, 'service option'],
  [/massage type are you leaning toward/gi, 'which service are you curious about'],
  [/what type are you leaning toward/gi, 'which service are you curious about'],
  [/to book your first massage/gi, 'to ask booking questions'],
  [/book your first appointment/gi, 'ask for booking details'],
  [/to book your appointment/gi, 'to ask for booking details'],
  [/get booked/gi, 'ask for booking details'],
  [/leading naturally into booking/gi, 'leading into booking questions'],
  [/direct path to booking/gi, 'clear booking question'],
  [/clear path to booking/gi, 'clear booking question'],
  [/available dates/gi, 'booking details'],
  [/available times/gi, 'booking details'],
  [/availability/gi, 'booking details'],
  [/I can check openings/gi, 'I can send booking details'],
  [/check openings/gi, 'send booking details'],
  [/openings/gi, 'booking details'],
  [/preferred date/gi, 'booking question'],
  [/share their preferred date/gi, 'ask for booking details'],
  [/what day works/gi, 'would you like booking details'],
  [/times for first-time clients/gi, 'booking details for first-time clients'],
  [/available massage types and times/gi, 'service options and booking details'],
  [/book their first session/gi, 'ask booking questions'],
  [/book their first massage/gi, 'ask booking questions'],
  [/book their first appointment/gi, 'ask booking questions'],
  [/book when ready/gi, 'ask for booking details when ready'],
  [/invite them to book/gi, 'invite them to ask for booking details'],
  [/guide them toward booking/gi, 'answer booking questions'],
  [/guide the booking conversation/gi, 'answer booking questions'],
  [/help clients pick/gi, 'answer client questions about'],
  [/help clients choose/gi, 'answer client questions about'],
  [/help them pick/gi, 'answer questions about'],
  [/help them choose/gi, 'answer questions about'],
  [/personalized chat to help clients pick/gi, 'question-based chat about'],
  [/personalized chat/gi, 'question-based chat'],
  [/Service Option Conversation/gi, 'Service Options FAQ'],
  [/Booking Inquiry/gi, 'Booking Details Request'],
  [/Booking Details Help/gi, 'Booking Details Request'],
  [/I['’]m not posting private client details,? but\s*/gi, ''],
  [/I['’]m not sharing private client details,? but\s*/gi, ''],
  [/Instead of sharing private details,?\s*/gi, ''],
  [/instead of sharing private details,?\s*/g, ''],
  [/without using private details or invented results/gi, 'built around real buyer problems, process lessons, and next steps'],
  [/without private details or invented results/gi, 'built around real buyer problems, process lessons, and next steps'],
  [/without sharing private details/gi, 'without inventing results'],
  [/private client details/gi, 'specific client details'],
  [/private details/gi, 'specific details'],
  [/Comment PLAN and I['’]ll send you the 4-week client-win content map/gi, 'Comment CHECK and I’ll send you the Fitness Goal Check'],
  [/Comment PLAN and I['’]ll send you the 4-Week Client-Win Content Map/gi, 'Comment CHECK and I’ll send you the Fitness Goal Check'],
  [/Comment PLAN for the 4-Week Client-Win Content Map/gi, 'Comment CHECK for the Fitness Goal Check'],
  [/Include the CTA:\s*/gi, 'Use this line: '],
  [/Include the call to action:\s*/gi, 'Use this line: '],
  [/I have 3 client wins, but I['’]m not just bragging\.?/gi, 'I have 3 client wins. Here’s how I’d turn them into sales content that helps the next person take action.'],
  [/I have 3 client wins, but I['’]m not just posting bragging rights\.?/gi, 'I have 3 client wins. Here’s how I’d turn them into sales content that helps the next person take action.'],
  [/not just posting bragging rights/gi, 'turning proof into useful sales content'],
  [/not just bragging/gi, 'turning proof into useful sales content'],
  [/the best time is now/gi, 'the best next step is to understand your options'],
  [/The best time is now/gi, 'The best next step is to understand your options'],
  [/the sooner, the better/gi, 'start by understanding your timeline'],
  [/The sooner, the better/gi, 'Start by understanding your timeline'],
  [/maximize sale price/gi, 'make a stronger listing plan'],
  [/Maximize sale price/gi, 'Make a stronger listing plan'],
  [/boost sale price/gi, 'improve listing readiness'],
  [/Boost sale price/gi, 'Improve listing readiness'],
  [/get top buyer exposure/gi, 'improve your listing strategy'],
  [/Get top buyer exposure/gi, 'Improve your listing strategy'],
  [/sell quickly/gi, 'plan your sale with more clarity'],
  [/Sell quickly/gi, 'Plan your sale with more clarity'],
  [/sell fast/gi, 'plan your sale with more clarity'],
  [/Sell fast/gi, 'Plan your sale with more clarity'],
  [/smooth sale/gi, 'clearer selling process'],
  [/Smooth sale/gi, 'Clearer selling process'],
  [/free consultation/gi, 'Seller Readiness Review'],
  [/Free consultation/gi, 'Seller Readiness Review'],
  [/no-obligation market evaluation/gi, 'Home Value Conversation'],
  [/No-obligation market evaluation/gi, 'Home Value Conversation'],
  [/market evaluation/gi, 'Home Value Conversation'],
  [/Market evaluation/gi, 'Home Value Conversation'],
  [/today['’]s market/gi, 'your current selling situation'],
  [/Today['’]s market/gi, 'Your current selling situation'],
  [/best time to list/gi, 'right timing for your situation'],
  [/Best time to list/gi, 'Right timing for your situation'],
  [/best time to sell/gi, 'right timing for your situation'],
  [/Best time to sell/gi, 'Right timing for your situation'],
  [/serious buyers/gi, 'better-prepared buyers'],
  [/Serious buyers/gi, 'Better-prepared buyers'],
  [/prevents delays/gi, 'helps you plan with fewer surprises'],
  [/Prevents delays/gi, 'Helps you plan with fewer surprises'],
  [/avoid unnecessary delays/gi, 'plan with fewer surprises'],
  [/Avoid unnecessary delays/gi, 'Plan with fewer surprises'],
  [/saves time and money/gi, 'helps you make clearer prep decisions'],
  [/Saves time and money/gi, 'Helps you make clearer prep decisions'],
  [/save time and money/gi, 'make clearer prep decisions'],
  [/Save time and money/gi, 'Make clearer prep decisions'],
  [/increases your chances of a clearer selling process/gi, 'helps you prepare for a clearer selling conversation'],
  [/Increases your chances of a clearer selling process/gi, 'Helps you prepare for a clearer selling conversation'],
  [/clearer selling process/gi, 'clearer selling conversation'],
  [/Clearer selling process/gi, 'Clearer selling conversation'],
  [/maximize value/gi, 'make smarter prep decisions'],
  [/Maximize value/gi, 'Make smarter prep decisions'],
  [/maximizing value/gi, 'making smarter prep decisions'],
  [/Maximizing value/gi, 'Making smarter prep decisions'],
  [/avoid wasting money/gi, 'avoid spending on the wrong prep items'],
  [/Avoid wasting money/gi, 'Avoid spending on the wrong prep items'],
  [/wasting money/gi, 'spending on the wrong prep items'],
  [/Wasting money/gi, 'Spending on the wrong prep items'],
  [/serious buyers/gi, 'better-prepared buyers'],
  [/Serious buyers/gi, 'Better-prepared buyers'],
  [/serious offers/gi, 'stronger conversations'],
  [/Serious offers/gi, 'Stronger conversations'],
  [/free Seller Readiness Review/gi, 'Seller Readiness Review'],
  [/Free Seller Readiness Review/gi, 'Seller Readiness Review'],
  [/free seller review/gi, 'Seller Readiness Review'],
  [/Free seller review/gi, 'Seller Readiness Review'],
  [/professional home value estimate/gi, 'home value conversation'],
  [/Professional home value estimate/gi, 'Home value conversation'],
  [/market analysis/gi, 'home value conversation'],
  [/Market analysis/gi, 'Home value conversation'],
  [/book the right appointment/gi, 'send the right booking details'],
  [/Book the right appointment/gi, 'Send the right booking details'],
  [/pick the right appointment/gi, 'compare your booking options'],
  [/Pick the right appointment/gi, 'Compare your booking options'],
  [/pick the right service/gi, 'compare your options'],
  [/Pick the right service/gi, 'Compare your options'],
  [/right-fit appointment/gi, 'booking option'],
  [/Right-fit appointment/gi, 'Booking option'],
  [/right service/gi, 'booking option'],
  [/Right service/gi, 'Booking option'],
  [/DM me now to book your appointment!?/gi, 'DM REFILL or FULL SET with your last appointment date and the look you want.'],
  [/Send your question now and let['’]s get your lashes looking fresh!?/gi, 'Send your question or DM REFILL or FULL SET with your last appointment date.'],
  [/saves you time and money/gi, 'helps you prepare before booking'],
  [/Saves you time and money/gi, 'Helps you prepare before booking'],
  [/save you time and money/gi, 'help you prepare before booking'],
  [/Save you time and money/gi, 'Help you prepare before booking'],
  [/saves time and money/gi, 'helps with preparation'],
  [/Saves time and money/gi, 'Helps with preparation'],
  [/right-fit shade/gi, 'color goal'],
  [/Right-fit shade/gi, 'Color goal'],
  [/what suits you best/gi, 'what you are hoping for'],
  [/What suits you best/gi, 'What you are hoping for'],
  [/color you love/gi, 'color direction you feel clear about'],
  [/Color you love/gi, 'Color direction you feel clear about'],
  [/personalized plan/gi, 'clear next step'],
  [/Personalized plan/gi, 'Clear next step'],
  [/tailored to the client['’]s hair type and lifestyle/gi, 'based on the client’s color goals and hair history'],
  [/Tailored to the client['’]s hair type and lifestyle/gi, 'Based on the client’s color goals and hair history'],
  [/hair condition/gi, 'hair history'],
  [/Hair condition/gi, 'Hair history'],
  [/hair health/gi, 'hair history'],
  [/Hair health/gi, 'Hair history'],
  [/Color Maintenance Package/gi, 'Color Follow-Up Conversation'],
  [/color maintenance package/gi, 'color follow-up conversation'],
  [/recurring service plan/gi, 'follow-up conversation'],
  [/Recurring service plan/gi, 'Follow-up conversation'],
  [/touch-ups, treatments, and product recommendations/gi, 'timing, upkeep, and next-step questions'],
  [/Touch-ups, treatments, and product recommendations/gi, 'Timing, upkeep, and next-step questions'],
  [/15-20 minute appointment/gi, 'short consultation'],
  [/15–20 minute appointment/gi, 'short consultation'],
  [/save you from a hair color you regret/gi, 'help you prepare before changing your hair color'],
  [/Save you from a hair color you regret/gi, 'Help you prepare before changing your hair color'],
  [/hair color you regret/gi, 'hair color change you were not prepared for'],
  [/Hair color you regret/gi, 'Hair color change you were not prepared for'],
  [/right-fit color service/gi, 'color consultation next step'],
  [/Right-fit color service/gi, 'Color consultation next step'],
  [/right-fit color/gi, 'color goal'],
  [/Right-fit color/gi, 'Color goal'],
  [/right appointment/gi, 'booking next step'],
  [/Right appointment/gi, 'Booking next step'],
  [/exactly what you want/gi, 'closer to your goal'],
  [/Exactly what you want/gi, 'Closer to your goal'],
  [/choose shades that fit you/gi, 'talk through your color goal'],
  [/Choose shades that fit you/gi, 'Talk through your color goal'],
  [/pick shades that fit you/gi, 'talk through your color goal'],
  [/Pick shades that fit you/gi, 'Talk through your color goal'],
  [/match your style, skin tone, and maintenance routine/gi, 'match your color goal, hair history, and upkeep needs'],
  [/skin tone/gi, 'color goal'],
  [/Skin tone/gi, 'Color goal'],
  [/treatments needed/gi, 'questions to discuss'],
  [/Treatments needed/gi, 'Questions to discuss'],
  [/prevents common prep questions/gi, 'answers common prep questions'],
  [/Prevents common prep questions/gi, 'Answers common prep questions'],
  [/prevents unwanted surprises/gi, 'helps clients prepare before booking'],
  [/Prevents unwanted surprises/gi, 'Helps clients prepare before booking'],
  [/book your consultation now/gi, 'DM COLOR CONSULT with your current color, your goal photo, and what you want to change'],
  [/Book your consultation now/gi, 'DM COLOR CONSULT with your current color, your goal photo, and what you want to change'],
  [/reserve your spot/gi, 'ask about booking'],
  [/Reserve your spot/gi, 'Ask about booking'],
  [/make sure your next color turns out how you want/gi, 'talk through your color goal before booking'],
  [/Make sure your next color turns out how you want/gi, 'Talk through your color goal before booking'],
  [/local market insights/gi, 'local selling questions'],
  [/Local market insights/gi, 'Local selling questions'],
  [/right time to sell/gi, 'right timing for your situation'],
  [/Right time to sell/gi, 'Right timing for your situation'],
  [/right time to list/gi, 'right timing for your situation'],
  [/Right time to list/gi, 'Right timing for your situation'],
  [/best timing/gi, 'right timing for your situation'],
  [/Best timing/gi, 'Right timing for your situation'],
  [/prevents delays/gi, 'helps you plan with fewer surprises'],
  [/Prevents delays/gi, 'Helps you plan with fewer surprises'],
  [/attracts serious buyers/gi, 'helps buyers understand the home more clearly'],
  [/Attracts serious buyers/gi, 'Helps buyers understand the home more clearly'],
  [/attract buyers/gi, 'help buyers understand the home'],
  [/Attract buyers/gi, 'Help buyers understand the home'],
  [/could cost you more than you think/gi, 'may create questions worth reviewing before you list'],
  [/Could cost you more than you think/gi, 'May create questions worth reviewing before you list'],
  [/costly prep errors/gi, 'common prep questions'],
  [/Costly prep errors/gi, 'Common prep questions'],
  [/waste money fixing things buyers don['’]t care about/gi, 'spend on repairs before knowing what matters for your situation'],
  [/Waste money fixing things buyers don['’]t care about/gi, 'Spend on repairs before knowing what matters for your situation'],
  [/stop spending on the wrong prep items or unnecessary repairs/gi, 'review your prep questions before spending on repairs'],
  [/Stop spending on the wrong prep items or unnecessary repairs/gi, 'Review your prep questions before spending on repairs'],
  [/repairs that actually add value/gi, 'repairs worth discussing before listing'],
  [/Repairs that actually add value/gi, 'Repairs worth discussing before listing'],
  [/repairs buyers will notice first/gi, 'prep items buyers may notice'],
  [/Repairs buyers will notice first/gi, 'Prep items buyers may notice'],
  [/repairs that impact buyer decisions/gi, 'repair questions worth reviewing before listing'],
  [/Repairs that impact buyer decisions/gi, 'Repair questions worth reviewing before listing'],
  [/buyers don['’]t care about/gi, 'may not matter for your situation'],
  [/Buyers don['’]t care about/gi, 'May not matter for your situation'],
  [/speed up selling/gi, 'prepare your next step'],
  [/Speed up selling/gi, 'Prepare your next step'],
  [/speed up the sale/gi, 'prepare your next step'],
  [/Speed up the sale/gi, 'Prepare your next step'],
  [/maximize conversion/gi, 'improve follow-up clarity'],
  [/Maximize conversion/gi, 'Improve follow-up clarity'],
  [/buyer concerns/gi, 'customer concerns'],
  [/Buyer concerns/gi, 'Customer concerns'],
  [/buyers see the potential/gi, 'buyers understand the home more clearly'],
  [/Buyers see the potential/gi, 'Buyers understand the home more clearly'],
  [/waste time and money/gi, 'spend time on prep before knowing what matters for your situation'],
  [/Waste time and money/gi, 'Spend time on prep before knowing what matters for your situation'],
  [/fixing the wrong things before listing/gi, 'reviewing the wrong prep items before listing'],
  [/Fixing the wrong things before listing/gi, 'Reviewing the wrong prep items before listing'],
  [/avoid costly mistakes before selling/gi, 'review common prep questions before selling'],
  [/Avoid costly mistakes before selling/gi, 'Review common prep questions before selling'],
  [/costly mistakes/gi, 'common prep questions'],
  [/Costly mistakes/gi, 'Common prep questions'],
  [/costly repairs/gi, 'repair questions'],
  [/Costly repairs/gi, 'Repair questions'],
  [/which fixes really matter/gi, 'which prep items are worth reviewing'],
  [/Which fixes really matter/gi, 'Which prep items are worth reviewing'],
  [/fixes really matter/gi, 'prep items are worth reviewing'],
  [/Fixes really matter/gi, 'Prep items are worth reviewing'],
  [/not all fixes add value/gi, 'not every repair needs to be handled the same way'],
  [/Not all fixes add value/gi, 'Not every repair needs to be handled the same way'],
  [/all fixes add value/gi, 'every repair needs to be handled the same way'],
  [/All fixes add value/gi, 'Every repair needs to be handled the same way'],
  [/buyers will notice/gi, 'buyers may notice'],
  [/Buyers will notice/gi, 'Buyers may notice'],
  [/costs little but makes a big impression/gi, 'can be worth discussing as part of your prep plan'],
  [/Costs little but makes a big impression/gi, 'Can be worth discussing as part of your prep plan'],
  [/save both time and money/gi, 'make clearer prep decisions'],
  [/Save both time and money/gi, 'Make clearer prep decisions'],
  [/save time and money/gi, 'make clearer prep decisions'],
  [/Save time and money/gi, 'Make clearer prep decisions'],
  [/move forward confidently/gi, 'plan your next step with more clarity'],
  [/Move forward confidently/gi, 'Plan your next step with more clarity'],
  [/efficiently/gi, 'with more clarity'],
  [/Efficiently/gi, 'With more clarity'],
  [/delay their sale/gi, 'create confusion before listing'],
  [/Delay their sale/gi, 'Create confusion before listing'],
  [/delay your sale/gi, 'create confusion before listing'],
  [/Delay your sale/gi, 'Create confusion before listing'],
  [/spending money on home repairs/gi, 'reviewing repair questions before listing'],
  [/Spending money on home repairs/gi, 'Reviewing repair questions before listing'],
  [/before spending money on home repairs/gi, 'before making repair decisions'],
  [/Before spending money on home repairs/gi, 'Before making repair decisions'],
  [/without wasting time/gi, 'with more clarity'],
  [/Without wasting time/gi, 'With more clarity'],
  [/wasting time/gi, 'guessing on prep'],
  [/Wasting time/gi, 'Guessing on prep'],
  [/buyers notice/gi, 'buyers may notice'],
  [/Buyers notice/gi, 'Buyers may notice'],
  [/not every fix adds value/gi, 'not every repair needs the same priority'],
  [/Not every fix adds value/gi, 'Not every repair needs the same priority'],
  [/every fix adds value/gi, 'every repair needs the same priority'],
  [/Every fix adds value/gi, 'Every repair needs the same priority'],
  [/fixes that matter/gi, 'prep items worth reviewing'],
  [/Fixes that matter/gi, 'Prep items worth reviewing'],
  [/fixes really matter/gi, 'prep items are worth reviewing'],
  [/Fixes really matter/gi, 'Prep items are worth reviewing'],
  [/price it right from the start/gi, 'understand pricing expectations before listing'],
  [/Price it right from the start/gi, 'Understand pricing expectations before listing'],
  [/set realistic pricing expectations/gi, 'understand pricing expectations'],
  [/Set realistic pricing expectations/gi, 'Understand pricing expectations'],
  [/save you time and money/gi, 'help you make clearer prep decisions'],
  [/Save you time and money/gi, 'Help you make clearer prep decisions'],
  [/save both time and money/gi, 'help you make clearer prep decisions'],
  [/Save both time and money/gi, 'Help you make clearer prep decisions'],
  [/streamline your sale process/gi, 'plan your selling process with more clarity'],
  [/Streamline your sale process/gi, 'Plan your selling process with more clarity'],
  [/expert guidance/gi, 'professional guidance'],
  [/Expert guidance/gi, 'Professional guidance'],
  [/expert/gi, 'professional'],
  [/Expert/gi, 'Professional'],
  [/increasing lead capture/gi, 'making checklist requests easier to track'],
  [/Increasing lead capture/gi, 'Making checklist requests easier to track'],
  [/lead capture potential/gi, 'checklist request potential'],
  [/Lead capture potential/gi, 'Checklist request potential'],
  [/solving real problems/gi, 'answering common seller questions'],
  [/Solving real problems/gi, 'Answering common seller questions'],
  [/which repairs actually matter/gi, 'which repair questions are worth reviewing'],
  [/Which repairs actually matter/gi, 'Which repair questions are worth reviewing'],
  [/repairs actually matter/gi, 'repair questions are worth reviewing'],
  [/Repairs actually matter/gi, 'Repair questions are worth reviewing'],
  [/repairs really matter/gi, 'repair questions are worth reviewing'],
  [/Repairs really matter/gi, 'Repair questions are worth reviewing'],
  [/which repairs really matter/gi, 'which repair questions are worth reviewing'],
  [/Which repairs really matter/gi, 'Which repair questions are worth reviewing'],
  [/avoid costly delays/gi, 'review common prep questions'],
  [/Avoid costly delays/gi, 'Review common prep questions'],
  [/costly delays/gi, 'prep questions'],
  [/Costly delays/gi, 'Prep questions'],
  [/delay their sale/gi, 'create confusion before listing'],
  [/Delay their sale/gi, 'Create confusion before listing'],
  [/delay your sale/gi, 'create confusion before listing'],
  [/Delay your sale/gi, 'Create confusion before listing'],
  [/before listing that delay their sale/gi, 'before listing that create confusion'],
  [/Before listing that delay their sale/gi, 'Before listing that create confusion'],
  [/without wasting time/gi, 'with more clarity'],
  [/Without wasting time/gi, 'With more clarity'],
  [/wasting time/gi, 'guessing on prep'],
  [/Wasting time/gi, 'Guessing on prep'],
  [/spending money/gi, 'making prep decisions'],
  [/Spending money/gi, 'Making prep decisions'],
  [/spend money/gi, 'make prep decisions'],
  [/Spend money/gi, 'Make prep decisions'],
  [/save money/gi, 'make clearer prep decisions'],
  [/Save money/gi, 'Make clearer prep decisions'],
  [/saves money/gi, 'helps with clearer prep decisions'],
  [/Saves money/gi, 'Helps with clearer prep decisions'],
  [/save both time and money/gi, 'make clearer prep decisions'],
  [/Save both time and money/gi, 'Make clearer prep decisions'],
  [/save time and money/gi, 'make clearer prep decisions'],
  [/Save time and money/gi, 'Make clearer prep decisions'],
  [/smoothly your sale will go/gi, 'clear your selling process feels'],
  [/Smoothly your sale will go/gi, 'Clear your selling process feels'],
  [/how smoothly your sale will go/gi, 'how clear your selling process feels'],
  [/How smoothly your sale will go/gi, 'How clear your selling process feels'],
  [/influence your sale/gi, 'shape your prep plan'],
  [/Influence your sale/gi, 'Shape your prep plan'],
  [/top 3 repairs/gi, '3 repair questions'],
  [/Top 3 repairs/gi, '3 repair questions'],
  [/prioritize repairs/gi, 'review repair questions'],
  [/Prioritize repairs/gi, 'Review repair questions'],
  [/repairs to prioritize/gi, 'repair questions to review'],
  [/Repairs to prioritize/gi, 'Repair questions to review'],
  [/repairs worth doing/gi, 'repair questions worth reviewing'],
  [/Repairs worth doing/gi, 'Repair questions worth reviewing'],
  [/not every fix adds value/gi, 'not every repair needs the same priority'],
  [/Not every fix adds value/gi, 'Not every repair needs the same priority'],
  [/fixes add value/gi, 'repair questions are worth reviewing'],
  [/Fixes add value/gi, 'Repair questions are worth reviewing'],
  [/don['’]t spend on repairs/gi, 'review repair questions'],
  [/Don['’]t spend on repairs/gi, 'Review repair questions'],
  [/spend on repairs/gi, 'review repair questions'],
  [/Spend on repairs/gi, 'Review repair questions'],
  [/spending thousands/gi, 'reviewing repair questions'],
  [/Spending thousands/gi, 'Reviewing repair questions'],
  [/costly seller mistakes/gi, 'common seller prep questions'],
  [/Costly seller mistakes/gi, 'Common seller prep questions'],
  [/costly seller/gi, 'common seller'],
  [/Costly seller/gi, 'Common seller'],
  [/costly upgrades/gi, 'larger upgrades'],
  [/Costly upgrades/gi, 'Larger upgrades'],
  [/critical steps/gi, 'key questions'],
  [/Critical steps/gi, 'Key questions'],
  [/qualified leads/gi, 'serious replies'],
  [/Qualified leads/gi, 'Serious replies'],
  [/qualifies leads/gi, 'helps identify serious replies'],
  [/Qualifies leads/gi, 'Helps identify serious replies'],
  [/qualify leads/gi, 'identify serious replies'],
  [/Qualify leads/gi, 'Identify serious replies'],
  [/converting those leads/gi, 'guiding those conversations'],
  [/Converting those leads/gi, 'Guiding those conversations'],
  [/convert qualified leads/gi, 'guide serious replies'],
  [/Convert qualified leads/gi, 'Guide serious replies'],
  [/increase conversions/gi, 'improve follow-up clarity'],
  [/Increase conversions/gi, 'Improve follow-up clarity'],
  [/booked sessions/gi, 'consultation conversations'],
  [/Booked sessions/gi, 'Consultation conversations'],
  [/booked seller consultations/gi, 'seller consultation conversations'],
  [/Booked seller consultations/gi, 'Seller consultation conversations'],
  [/leads into booked/gi, 'conversations toward'],
  [/Leads into booked/gi, 'Conversations toward'],
  [/lead magnet will start/gi, 'checklist request can start'],
  [/Lead magnet will start/gi, 'Checklist request can start'],
  [/directly to checklist requests and consultations/gi, 'toward checklist requests and consultation conversations'],
  [/Directly to checklist requests and consultations/gi, 'Toward checklist requests and consultation conversations'],
  [/repair priorities/gi, 'repair questions'],
  [/Repair priorities/gi, 'Repair questions'],
  [/prioritizing repairs/gi, 'reviewing repair questions'],
  [/Prioritizing repairs/gi, 'Reviewing repair questions'],
  [/costs time and money/gi, 'can make preparation feel more confusing'],
  [/Costs time and money/gi, 'Can make preparation feel more confusing'],
  [/cost time and money/gi, 'make preparation feel more confusing'],
  [/Cost time and money/gi, 'Make preparation feel more confusing'],
  [/serious inquiries/gi, 'qualified conversations'],
  [/Serious inquiries/gi, 'Qualified conversations'],
  [/booked Seller Prep Consultations/gi, 'Seller Prep Consultation conversations'],
  [/Booked Seller Prep Consultations/gi, 'Seller Prep Consultation conversations'],
  [/booked consultations/gi, 'consultation conversations'],
  [/Booked consultations/gi, 'Consultation conversations'],
  [/competitive price/gi, 'pricing conversation'],
  [/Competitive price/gi, 'Pricing conversation'],
  [/reduce your sale options/gi, 'make your next steps less clear'],
  [/Reduce your sale options/gi, 'Make your next steps less clear'],
  [/market-ready/gi, 'listing-prep ready'],
  [/Market-ready/gi, 'Listing-prep ready'],
  [/professional insights/gi, 'practical guidance'],
  [/Professional insights/gi, 'Practical guidance'],
  [/drives direct engagement/gi, 'encourages direct replies'],
  [/Drives direct engagement/gi, 'Encourages direct replies'],
  [/converting serious inquiries into/gi, 'guiding qualified replies toward'],
  [/Converting serious inquiries into/gi, 'Guiding qualified replies toward'],
  [/converting attention into revenue/gi, 'connecting attention to a clear paid next step'],
  [/Converting attention into revenue/gi, 'Connecting attention to a clear paid next step'],
  [/before it['’]s gone/gi, 'before the drop opens'],
  [/Before it['’]s gone/gi, 'Before the drop opens'],
  [/do not miss out/gi, 'join the waitlist for drop update'],
  [/Don['’]t miss out/gi, 'Join the waitlist for drop update'],
  [/secure your spot/gi, 'join the waitlist'],
  [/Secure your spot/gi, 'Join the waitlist'],
  [/VIP Waitlist Membership/gi, 'Early Access Waitlist'],
  [/VIP membership/gi, 'drop update list'],
  [/limited edition clothing/gi, 'upcoming clothing drop'],
  [/limited-edition clothing/gi, 'upcoming clothing drop'],
  [/every stitch/gi, 'the product details'],
  [/Every stitch/gi, 'The product details'],
  [/expert sewing/gi, 'sample check'],
  [/Expert sewing/gi, 'Sample check'],
  [/skilled team/gi, 'team'],
  [/Skilled team/gi, 'Team'],
  [/perfect fit/gi, 'fit'],
  [/Perfect fit/gi, 'Fit'],
  [/build excitement/gi, 'show the product reason to join the waitlist'],
  [/Build excitement/gi, 'Show the product reason to join the waitlist'],
  [/create hype/gi, 'show the product reason to join the waitlist'],
  [/Create hype/gi, 'Show the product reason to join the waitlist'],
  [/your event is doomed before it starts/gi, 'your catering plan can get stressful quickly'],
  [/Your event is doomed before it starts/gi, 'Your catering plan can get stressful quickly'],
  [/that kill your event/gi, 'that make event planning harder'],
  [/That kill your event/gi, 'That make event planning harder'],
  [/kill your event/gi, 'make event planning harder'],
  [/Kill your event/gi, 'Make event planning harder'],
  [/soggy sandwiches/gi, 'food that does not travel well'],
  [/Soggy sandwiches/gi, 'Food that does not travel well'],
  [/spots fill up fast/gi, 'availability can vary'],
  [/Spots fill up fast/gi, 'Availability can vary'],
  [/higher prices/gi, 'fewer menu options'],
  [/Higher prices/gi, 'Fewer menu options'],
  [/guaranteed delivery times/gi, 'clear delivery windows'],
  [/Guaranteed delivery times/gi, 'Clear delivery windows'],
  [/fits your event perfectly/gi, 'fits your event details'],
  [/Fits your event perfectly/gi, 'Fits your event details'],
  [/will arrive fresh and ready without last-minute panic/gi, 'is planned around your event timing, guest count, and menu needs'],
  [/event will be stress-free and delicious/gi, 'event food plan feels organized and guest-ready'],
  [/stress-free catering/gi, 'organized catering inquiry'],
  [/Stress-free catering/gi, 'Organized catering inquiry'],
  [/avoid last-minute catering panic/gi, 'plan your catering details before the event'],
  [/Avoid last-minute catering panic/gi, 'Plan your catering details before the event'],
  [/last-minute office lunch orders always cause panic/gi, 'office lunch orders are easier when the menu and timing are clear'],
  [/Last-minute office lunch orders always cause panic/gi, 'Office lunch orders are easier when the menu and timing are clear'],
  [/delivered fresh/gi, 'prepared for your catering order'],
  [/Delivered fresh/gi, 'Prepared for your catering order'],
  [/fresh, customizable/gi, 'customizable'],
  [/Fresh, customizable/gi, 'Customizable'],
  [/happy clients/gi, 'catering customers'],
  [/happy guests/gi, 'guests'],
  [/right-fit/gi, 'clear-fit'],
  [/kid-friendly and adult favorites/gi, 'menu options for different guests'],
  [/booked at least 3 days in advance/gi, 'with enough notice to plan the order'],
  [/hold your date while you decide/gi, 'review your event date and menu options'],
  [/take the stress out of your next event/gi, 'help you plan your catering details'],
  [/on-time delivery/gi, 'pickup or delivery details'],
  [/On-time delivery/gi, 'Pickup or delivery details'],
  [/fresh and on time/gi, 'planned around your order details'],
  [/Fresh and on time/gi, 'Planned around your order details'],
  [/dependable service/gi, 'clear catering details'],
  [/reliable local catering/gi, 'local catering'],
  [/vegetarian, gluten-free, and kid-friendly options/gi, 'menu options for different guest needs'],
  [/vegetarian, gluten-free, or kid-friendly options/gi, 'menu options for different guest needs'],
  [/menus cover vegetarian, gluten-free, and kid-friendly options/gi, 'ask about menu options for different guest needs'],
  [/menu options for kids and adults/gi, 'menu options for different guests'],
  [/dietary accommodations/gi, 'dietary notes'],
  [/dessert trays/gi, 'menu add-ons if available'],
  [/party setup advice/gi, 'event detail questions'],
  [/weekly or monthly catering orders/gi, 'repeat catering inquiries'],
  [/Office Lunch Subscription/gi, 'Office Lunch Catering Inquiry'],
  [/ready-made family event trays/gi, 'family event menu options'],
  [/Ready-made family event trays/gi, 'Family event menu options'],
  [/with rotating menus/gi, 'with menu options'],
  [/family event trays for small gatherings/gi, 'family event menu options'],
  [/tailored menus/gi, 'menu options'],
  [/personalized catering menu and quote/gi, 'catering menu and quote'],
  [/personalized menu and quote/gi, 'menu and quote'],
  [/customizable sandwich and salad platters/gi, 'catering menu options'],
  [/Customizable sandwich and salad platters/gi, 'Catering menu options'],
  [/teams of 10-30/gi, 'office groups'],
  [/15-50 guests/gi, 'event guests'],
  [/10-40 guests/gi, 'family event guests'],
  [/guarantee compliments/gi, 'help your nails feel event-ready'],
  [/guaranteed compliments/gi, 'event-ready nail confidence'],
  [/guaranteed/gi, 'designed to'],
  [/Guarantee compliments/gi, 'Help your nails feel event-ready'],
  [/Guaranteed compliments/gi, 'Event-ready nail confidence'],
  [/Guaranteed/gi, 'Designed to'],
  [/standout nail art/gi, 'event-ready nail designs'],
  [/Standout nail art/gi, 'Event-ready nail designs'],
  [/ruin your event vibe/gi, 'clash with your event plans'],
  [/Ruin your event vibe/gi, 'Clash with your event plans'],
  [/Stop Lash Loss Now/gi, 'Avoid Early Lash Shedding'],
  [/stop lash loss now/gi, 'avoid early lash shedding'],
  [/ruin your lash extensions/gi, 'shorten the look of your set'],
  [/ruin your extensions/gi, 'shorten the look of your set'],
  [/breaks your extensions early/gi, 'can affect how long your set looks full'],
  [/fall out too fast/gi, 'show gaps sooner than expected'],
  [/falling out too fast/gi, 'showing gaps sooner than expected'],
  [/premature fallout/gi, 'early gaps'],
  [/fallout/gi, 'gaps'],
  [/before lashes thin out/gi, 'before gaps start showing'],
  [/lashes thin out/gi, 'gaps start showing'],
  [/sparse lashes/gi, 'gaps between fills'],
  [/avoid sparse lashes/gi, 'avoid unnecessary gaps'],
  [/curl loss/gi, 'changes in how your set looks'],
  [/weakens the glue/gi, 'can affect retention'],
  [/damages both extensions and your natural lashes/gi, 'can affect your set and natural lash care'],
  [/damages your natural lashes/gi, 'can affect natural lash care'],
  [/lash damage/gi, 'lash care concerns'],
  [/damage-free/gi, 'service-appropriate'],
  [/protects your natural lashes/gi, 'supports your natural lash care'],
  [/protect your natural lashes/gi, 'support your natural lash care'],
  [/protect your lashes overnight/gi, 'support your lash aftercare overnight'],
  [/protect your lashes/gi, 'support lash aftercare'],
  [/keeps your lashes flawless/gi, 'keeps your set looking fresh'],
  [/keep your lashes flawless/gi, 'keep your set looking fresh'],
  [/flawless lashes/gi, 'fresh-looking lashes'],
  [/flawless/gi, 'fresh'],
  [/perfect lashes/gi, 'lashes that fit your style'],
  [/Perfect lashes/gi, 'Lashes that fit your style'],
  [/perfect/gi, 'clear'],
  [/restore lash health/gi, 'support better lash care'],
  [/Restore lash health/gi, 'Support better lash care'],
  [/maximizes lash health/gi, 'supports better lash care'],
  [/Maximizes lash health/gi, 'Supports better lash care'],
  [/best lash retention/gi, 'better refill timing'],
  [/lash retention/gi, 'how long your set looks full'],
  [/keep your lashes full longer/gi, 'keep your set looking fuller between appointments'],
  [/keeps your lashes full longer/gi, 'keeps your set looking fuller between appointments'],
  [/women aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/women age \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/women and men aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/men and women aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/people aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/adults aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'clients who '],
  [/aged \d{2}\s*[-–]\s*\d{2}\s+who\s+/gi, 'who '],
  [/young adults who\s+/gi, 'clients who '],
  [/busy professionals who\s+/gi, 'clients who '],
  [/never miss your appointment window/gi, 'stay on your refill rhythm'],
  [/lash health/gi, 'lash appointment timing'],
  [/Lash health/gi, 'Lash appointment timing'],
  [/natural lash health/gi, 'natural lash care questions'],
  [/Natural lash health/gi, 'Natural lash care questions'],
  [/stress natural lashes/gi, 'may not be the right timing for every client'],
  [/Stress natural lashes/gi, 'May not be the right timing for every client'],
  [/can stress natural lashes/gi, 'may not be the right timing for every client'],
  [/restore volume and shape/gi, 'refresh the look of your set'],
  [/Restore volume and shape/gi, 'Refresh the look of your set'],
  [/cost you more time and money/gi, 'make your next appointment feel less clear'],
  [/Cost you more time and money/gi, 'Make your next appointment feel less clear'],
  [/costs them time and money/gi, 'can create timing confusion'],
  [/Costs them time and money/gi, 'Can create timing confusion'],
  [/priority booking option/gi, 'appointment request option'],
  [/Priority booking option/gi, 'Appointment request option'],
  [/book your spot this week/gi, 'ask about openings this week'],
  [/Book your spot this week/gi, 'Ask about openings this week'],
  [/available appointments this week/gi, 'openings this week if available'],
  [/Available appointments this week/gi, 'Openings this week if available'],
  [/recommended refill period/gi, 'usual refill timing'],
  [/hold a spot/gi, 'ask about booking'],
  [/hold your spot/gi, 'ask about booking'],
  [/hold my spot/gi, 'ask about booking'],
  [/available slots/gi, 'booking questions'],
  [/available times/gi, 'booking questions'],
  [/I have openings this week/gi, 'I can check openings'],
  [/I have some openings coming up/gi, 'I can check openings'],
  [/openings soon/gi, 'booking questions'],
  [/best booking option/gi, 'next booking option'],
  [/best gel manicure/gi, 'gel manicure option'],
  [/best service/gi, 'service option'],
  [/avoid disappointment/gi, 'feel prepared before booking'],
  [/qualified replies/gi, 'interested replies'],
  [/qualified bookings/gi, 'booking conversations'],
  [/qualified leads/gi, 'interested replies'],
  [/cost more to fix/gi, 'make the next appointment less clear'],
  [/wasted money/gi, 'appointment confusion'],
  [/look bad/gi, 'feel grown out'],
  [/nail health/gi, 'nail appointment timing'],
  [/Nail health/gi, 'Nail appointment timing'],
  [/don't wait/gi, 'plan ahead'],
  [/Don’t wait/gi, 'Plan ahead'],
  [/don't wait/gi, 'plan ahead'],
  [/last-minute panic/gi, 'last-minute guessing'],
  [/last-minute nail stress/gi, 'last-minute nail guessing'],
  [/hold a few spots/gi, 'ask about booking'],
  [/hold a few spots next week/gi, 'ask about booking'],
  [/hold spots/gi, 'ask about booking'],
  [/book your spot/gi, 'ask about booking'],
  [/book your spot now/gi, 'ask about booking'],
  [/book your spot today/gi, 'ask about booking'],
  [/get booked/gi, 'ask about booking'],
  [/available appointments/gi, 'booking questions'],
  [/current booking availability/gi, 'booking questions'],
  [/my current booking availability/gi, 'booking questions'],
  [/available appointment times/gi, 'booking questions'],
  [/available appointment/gi, 'booking option'],
  [/15-minute chat/gi, 'short booking chat'],
  [/discounted refill/gi, 'refill inquiry'],
  [/discounted touch-up/gi, 'touch-up inquiry'],
  [/best for first-time or hesitant clients/gi, 'helpful for first-time or unsure clients'],
  [/best style/gi, 'style option'],
  [/best fit/gi, 'clear option'],
  [/best appointment time/gi, 'appointment timing'],
  [/easy-to-book/gi, 'simple booking'],
  [/personalized nail art sessions/gi, 'nail art appointment options'],
  [/personalized recommendations/gi, 'style suggestions'],
  [/recommend the best/gi, 'talk through the options'],
  [/recommend booking/gi, 'suggest asking about booking'],
  [/this helps qualify their booking needs/gi, 'this helps clarify what they may want to book'],
  [/hold a few appointment options/gi, 'ask for preferred day and service goal'],
  [/hold appointment options/gi, 'ask for preferred day and service goal'],
  [/hold a few appointment times/gi, 'ask for preferred day and service goal'],
  [/available appointments/gi, 'booking questions'],
  [/available appointment/gi, 'booking option'],
  [/available openings/gi, 'openings if available'],
  [/current availability/gi, 'booking questions'],
  [/my availability/gi, 'booking questions'],
  [/book confidently/gi, 'ask about booking'],
  [/direct booking invite/gi, 'clear booking next step'],
  [/booking invite/gi, 'booking next step'],
  [/book your right-fit/gi, 'ask about the booking option'],
  [/book your gel manicure/gi, 'ask about booking your gel manicure'],
  [/book your next appointment/gi, 'ask about booking your next appointment'],
  [/ready to book/gi, 'ready to ask about booking'],
  [/last-minute stress/gi, 'last-minute guessing'],
  [/last minute stress/gi, 'last-minute guessing'],
  [/ending up with something you don't/gi, 'choosing something that does not'],
  [/ending up with something you don’t/gi, 'choosing something that does not'],
  [/every 2-3 weeks/gi, 'based on your current set'],
  [/every 2–3 weeks/gi, 'based on your current set'],
  [/2-3 weeks/gi, 'your usual timing'],
  [/2–3 weeks/gi, 'your usual timing'],
  [/best for/gi, 'helpful for'],
  [/the best/gi, 'a clear option'],
  [/The best/gi, 'A clear option'],
  [/send me a pic/gi, 'tell me when your last appointment was'],
  [/Send me a pic/gi, 'Tell me when your last appointment was'],
  [/send me a photo/gi, 'tell me when your last appointment was'],
  [/Send me a photo/gi, 'Tell me when your last appointment was'],
  [/DM me a pic/gi, 'DM me when your last appointment was'],
  [/DM me a photo/gi, 'DM me when your last appointment was'],
  [/recommend what['’]s best/gi, 'talk through the next appointment option'],
  [/Recommend what['’]s best/gi, 'Talk through the next appointment option'],
  [/recommend the best service/gi, 'talk through the next appointment option'],
  [/recommend the right service/gi, 'talk through the next appointment option'],
  [/best service/gi, 'next appointment option'],
  [/best fit/gi, 'appointment option'],
  [/Best fit/gi, 'Appointment option'],
  [/best appointment fit/gi, 'next appointment option'],
  [/Best appointment fit/gi, 'Next appointment option'],
  [/right service fit/gi, 'next appointment option'],
  [/Right service fit/gi, 'Next appointment option'],
  [/right appointment fit/gi, 'next appointment option'],
  [/Right appointment fit/gi, 'Next appointment option'],
  [/find the best appointment fit/gi, 'talk through the next appointment option'],
  [/Find the best appointment fit/gi, 'Talk through the next appointment option'],
  [/help you find the best appointment fit/gi, 'help you talk through the next appointment option'],
  [/Help you find the best appointment fit/gi, 'Help you talk through the next appointment option'],
  [/best for repeat clients/gi, 'for returning clients'],
  [/Best for repeat clients/gi, 'For returning clients'],
  [/book your appointment today/gi, 'ask about openings'],
  [/Book your appointment today/gi, 'Ask about openings'],
  [/reserve a full set appointment this week/gi, 'ask about full set openings this week if available'],
  [/Reserve a full set appointment this week/gi, 'Ask about full set openings this week if available'],
  [/immediate appointment scheduling/gi, 'clear appointment next steps'],
  [/Immediate appointment scheduling/gi, 'Clear appointment next steps'],
  [/speed up scheduling/gi, 'make appointment next steps easier'],
  [/Speed up scheduling/gi, 'Make appointment next steps easier'],
  [/increase booking confidence/gi, 'make the next step clearer'],
  [/Increase booking confidence/gi, 'Make the next step clearer'],
  [/hold an appointment spot/gi, 'check appointment options'],
  [/Hold an appointment spot/gi, 'Check appointment options'],
  [/some spots open/gi, 'openings if available'],
  [/Some spots open/gi, 'Openings if available'],
  [/Recommended refill period/gi, 'Usual refill timing'],
  [/\s+([,.!?])/g, '$1'],
  [/\s{2,}/g, ' '],
];

function cleanGeneratedText(value: string) {
  const cleaned = CLEAN_GENERATED_TEXT_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value
  ).trim();

  if (!cleaned) {
    return '';
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function cleanGeneratedValue<T>(value: T): T {
  if (typeof value === 'string') {
    return cleanGeneratedText(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanGeneratedValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const cleanedObject: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      cleanedObject[key] = cleanGeneratedValue(item);
    });

    return cleanedObject as T;
  }

  return value;
}


type InvisibleMakeMyPostQualityGateOptions = {
  hasUploadedImages: boolean;
  selectedOutputs: string[];
};

function cleanInvisibleMakeMyPostLine(value: unknown) {
  const raw = cleanCollagePanelCaptionReference(
    normalizeString(value)
  );

  if (!raw) {
    return '';
  }

  return raw
    .replace(/^(caption|cta|call to action|dm reply|follow[- ]?up message)\s*:\s*/i, '')
    .replace(/\bTikTok Script\b/gi, 'TikTok')
    .replace(/\bYouTube Shorts Script\b/gi, 'YouTube Shorts')
    .replace(/\bDM\s+([A-Z]{2,12})(?:\s+\1\b)+/gi, 'DM $1')
    .replace(/\bComment\s+([A-Z]{2,12})(?:\s+\1\b)+/gi, 'Comment $1')
    .replace(/\bperfect for (any occasion|everyone|every style|any day)\b/gi, 'easy to ask about')
    .replace(/\bfits (any occasion|everyone|every style|any day)\b/gi, 'easy to ask about')
    .replace(/\blow[- ]maintenance\b/gi, 'clean-looking')
    .replace(/\bbest choice\b/gi, 'option to ask about')
    .replace(/\bbook now\b/gi, 'DM BOOK')
    .replace(/\bspots? (are )?(filling|fill) up fast\b/gi, 'availability can vary')
    .replace(/\bsame[- ]day availability\b/gi, 'availability')
    .replace(/\bguaranteed\b/gi, '')
    .replace(/\bguarantees?\b/gi, 'promises')
    .replace(/Open with a simple question about which room or area needs attention\./gi, 'Start with one specific service question.')
    .replace(/Keep the post focused on the cleaning request without making price, timing, guarantee, or specialty-service claims\./gi, 'Keep the post focused on the service request.')
    .replace(/End with: DM ([A-Z]{2,12}) with your home size, rooms, or areas that need attention\./gi, 'Final CTA: DM $1 and ask one simple service question.')
    .replace(/\bdiagnose\b/gi, 'answer questions about')
    .replace(/\blead capture\b/gi, 'reply path')
    .replace(/\bwarm leads\b/gi, 'interested replies')
    .replace(/\bI[’']m your local\b/gi, 'I do')
    .replace(/\bwithout the hassle of driving anywhere\b/gi, 'without you having to drop it off')
    .replace(/\bwithout the hassle\b/gi, '')
    .replace(/\bwhat needs the most attention\b/gi, 'what you need done')
    .replace(/\bwhat you want cleaned\b/gi, 'which service you are interested in')
    .replace(/\bwhat kind of detail are you thinking(?: about)?\??/gi, 'do you know what type of service you are interested in, or are you still deciding?')
    .replace(/Hey! What kind of detail are you thinking about\?/gi, 'Hey! Do you know what type of service you are interested in, or are you still deciding?')
    .replace(/\bthe service you are interested in and service\b/gi, 'the service you are interested in')
    .replace(/\bwhich service you need\b/gi, 'which service you are interested in')
    .replace(/\bwhat service they want and their car type\b/gi, 'which service they are interested in')
    .replace(/\bwhat type of car do you have, and which service are you interested in\b/gi, 'which service are you interested in')
    .replace(/\bcar type and service interest\b/gi, 'service interest')
    .replace(/\bfree estimate\b/gi, 'quote')
    .replace(/\bsaves time\b/gi, 'makes the next step easier')
    .replace(/\bareas need the most attention\b/gi, 'you need done')
    .replace(/\bwhich areas need the most attention\b/gi, 'what you need done')
    .replace(/\bI[’']ll get back to you with details\b/gi, 'I’ll reply')
    .replace(/\bCan you tell me your car make and model and what areas need the most attention\??/gi, 'Send me the car and what you need done.')
    .replace(/\bstruggling with\b/gi, 'trying to improve')
    .replace(/\bare you tired of\b/gi, 'have you been meaning to handle')
    .replace(/\ba clear option next step\b/gi, 'a simple next step')
    .replace(/\bclear option first coaching step\b/gi, 'simple first coaching step')
    .replace(/\bclear option fix\b/gi, 'simple fix')
    .replace(/\bclear option\b/gi, 'simple')
    .replace(/\bright fit\b/gi, 'simple option')
    .replace(/\bafter treatment\b/gi, 'after your visit')
    .replace(/\btreatment plan\b/gi, 'visit questions')
    .replace(/\btreatment\b/gi, 'visit')
    .replace(/\bpick the simple option\b/gi, 'compare your options')
    .replace(/\bpick a simple option\b/gi, 'compare your options')
    .replace(/\bworks with your booking needs\b/gi, 'fits your week')
    .replace(/\bclear options\b/gi, 'simple service options')
    .replace(/\bwith your car type\b/gi, 'with the service you are interested in')
    .replace(/\byour car type\b/gi, 'the service you are interested in')
    .replace(/\bsend your car type\b/gi, 'send the service you are interested in')
    .replace(/\bwith QUOTE, the service you are interested in, and which service you['’]re interested in\b/gi, 'with QUOTE and the service you are interested in')
    .replace(/\bWhat kind of car do you have, and which service do you want\?/gi, 'Do you know what type of service you are interested in, or are you still deciding?')
    .replace(/\bWhat kind of car do you have, and which detailing service are you interested in—interior, exterior, or maintenance\?/gi, 'Do you know what type of service you are interested in, or are you still deciding?')
    .replace(/\bPlease send the service you are interested in and which service you want\./gi, 'Please send the service you are interested in.')
    .replace(/\bbased on your car and needs\b/gi, 'based on what you need')
    .replace(/\bDM me with your car type and which service you want\b/gi, 'DM me with the service you are interested in')
    .replace(/\bsend me a DM with your car type and service you['’]re interested in\b/gi, 'send me a DM with the service you are interested in')
    .replace(/#Spotless\b/gi, '#CleanHome')
    .replace(/\bspotless\b/gi, 'ready for the next step')
    .replace(/\bBooking Details Requestful\b/gi, 'booking details')
    .replace(/\bwould you like booking details best\b/gi, 'would you like booking details?')
    .replace(/\bSave time\b/g, 'Make the next step easier')
    .replace(/\binterior, exterior, or both\b/gi, 'interior, exterior, or maintenance')
    .replace(/\binterior, exterior, or a maintenance detail\b/gi, 'interior, exterior, or maintenance detailing')
    .replace(/\bWhich service are you leaning toward — interior, exterior, or both\?/gi, 'Which service are you leaning toward — interior, exterior, or maintenance?')
    .replace(/\bsave time\b/gi, 'make the next step easier')
    .replace(/\bsaving time\b/gi, 'making the next step easier')
    .replace(/\bhassle[- ]free\b/gi, 'simple')
    .replace(/\bno hassle\b/gi, 'simple')
    .replace(/\bclear price\b/gi, 'quote')
    .replace(/\bclear pricing\b/gi, 'quote details')
    .replace(/\bBooking Details Requestful\b/gi, 'booking details')
    .replace(/\bservice comparison\b/gi, 'local service post')
    .replace(/\bhelp car owners decide\b/gi, 'mobile detailing in the area')
    .replace(/\bconversion chances\b/gi, 'reply clarity')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanInvisibleMakeMyPostTitle(value: unknown) {
  const rawTitle = cleanInvisibleMakeMyPostLine(value).replace(/[.]+$/g, '');
  if (!rawTitle) {
    return '';
  }
  let cleaned = rawTitle
    .replace(/^(post|create|make|use|show|feature|highlight|showcase)\s+(a|an|this|the)\s+/i, '')
    .replace(/^(post|create|make|use|show|feature|highlight|showcase)\s+/i, '')
    .replace(/\bsocial media post\b/gi, '')
    .replace(/\bcarousel\b/gi, '')
    .replace(/\bbooking prompt\b/gi, '')
    .replace(/\bappointment bookings?\b/gi, 'appointments')
    .replace(/\blead generation asset\b/gi, '')
    .replace(/\bcontent asset\b/gi, '')
    .replace(/\bconversion path\b/gi, '')
    .replace(/\s+showing\s+/i, ' with ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) {
    cleaned = rawTitle;
  }
  const words = cleaned.split(/\s+/);
  if (words.length > 12) {
    cleaned = words.slice(0, 12).join(' ');
  }
  const trailingStopwords = new Set(['a','an','and','as','at','but','by','for','from','in','into','of','on','or','so','than','that','the','their','then','this','to','what','when','which','with','your','you','looks','look','feels','feel','makes','make','gets','get','goes','means','helps','keeps']);
  const titleParts = cleaned.split(' ');
  while (titleParts.length > 3 && trailingStopwords.has(titleParts[titleParts.length - 1].toLowerCase())) {
    titleParts.pop();
  }
  cleaned = titleParts.join(' ');
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function cleanInvisibleMakeMyPostCta(value: unknown) {
  const cleaned = cleanInvisibleMakeMyPostLine(value)
    .replace(/^(use this line|end the post with)\s*:\s*/i, '')
    .replace(/\bDM\s+DM\s+/gi, 'DM ')
    .replace(/\bComment\s+Comment\s+/gi, 'Comment ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const keywordOnly = cleaned.match(/^[A-Z]{2,12}$/);

  if (keywordOnly) {
    return `DM ${cleaned}`;
  }

  return cleaned;
}

function hasNaturalMakeMyPostCta(value: string) {
  return /\b(DM|comment|reply|message|send)\b/i.test(value);
}

function removeVideoLanguageFromPhotoLine(value: string) {
  return value
    .replace(/\bBeat\s*\d+\s*[:.-]?\s*/gi, '')
    .replace(/\b\d+\s*[-–]\s*\d+\s*seconds?\s*[:.-]?\s*/gi, '')
    .replace(/\bopening shot\b/gi, 'first photo')
    .replace(/\bdetail shot\b/gi, 'detail photo')
    .replace(/\bfinal CTA shot\b/gi, 'final photo')
    .replace(/\btext overlay\b/gi, 'text')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cleanInvisibleMakeMyPostValue<T>(value: T): T {
  if (typeof value === 'string') {
    return cleanInvisibleMakeMyPostLine(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => cleanInvisibleMakeMyPostValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const cleanedObject: Record<string, unknown> = {};

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      cleanedObject[key] = cleanInvisibleMakeMyPostValue(item);
    });

    return cleanedObject as T;
  }

  return value;
}

function applyInvisibleMakeMyPostQualityGate(
  parsed: GeneratedResponse,
  options: InvisibleMakeMyPostQualityGateOptions
) {
  const selectedVideoOutput = options.selectedOutputs.some((output) =>
    /reel|tiktok|shorts/i.test(output)
  );

  const shouldAvoidVideoLanguage =
    options.hasUploadedImages && !selectedVideoOutput;

  const currentProductionPlan = parsed.production_plan || {};
  const currentCaption =
    currentProductionPlan.caption || parsed.best_output?.content || '';

  const cleanedCta = cleanInvisibleMakeMyPostCta(
    currentProductionPlan.cta || parsed.monetization?.cta_strategy || ''
  );

  let cleanedCaption = cleanInvisibleMakeMyPostLine(currentCaption);

  if (cleanedCaption && cleanedCta && !hasNaturalMakeMyPostCta(cleanedCaption)) {
    cleanedCaption = `${cleanedCaption}\n\n${cleanedCta}`;
  }

  const cleanedDmReply = cleanInvisibleMakeMyPostLine(
    currentProductionPlan.dm_reply ||
      currentProductionPlan.follow_up_message ||
      ''
  );

  const cleanedFollowUp = cleanInvisibleMakeMyPostLine(
    currentProductionPlan.follow_up_message || ''
  );

  const cleanedShotOrder = normalizeStringList(
    currentProductionPlan.shot_order
  )
    .map((item) => cleanInvisibleMakeMyPostLine(item))
    .map((item) =>
      shouldAvoidVideoLanguage ? removeVideoLanguageFromPhotoLine(item) : item
    )
    .filter((item) => item.length > 0);

  const cleanedOnScreenText = normalizeStringList(
    currentProductionPlan.on_screen_text
  )
    .map((item) => cleanInvisibleMakeMyPostLine(item))
    .filter((item) => item.length > 0);

  const cleanedTitle = cleanInvisibleMakeMyPostTitle(
    parsed.strategy?.core_angle ||
      currentProductionPlan.concept ||
      parsed.best_output?.platform ||
      ''
  );

  parsed.mode = 'make_my_post';

  parsed.strategy = {
    ...(parsed.strategy || {}),
    ...(cleanedTitle ? { core_angle: cleanedTitle } : {}),
  };

  parsed.production_plan = {
    ...currentProductionPlan,
    ...(cleanedCaption ? { caption: cleanedCaption } : {}),
    ...(cleanedCta ? { cta: cleanedCta } : {}),
    ...(cleanedDmReply ? { dm_reply: cleanedDmReply } : {}),
    ...(cleanedFollowUp ? { follow_up_message: cleanedFollowUp } : {}),
    ...(cleanedShotOrder.length > 0 ? { shot_order: cleanedShotOrder } : {}),
    ...(cleanedOnScreenText.length > 0
      ? { on_screen_text: cleanedOnScreenText }
      : {}),
  };

  parsed.best_output = {
    ...(parsed.best_output || {}),
    ...(cleanedCaption ? { content: cleanedCaption } : {}),
  };

  parsed.monetization = {
    ...(parsed.monetization || {}),
    ...(cleanedCta ? { cta_strategy: cleanedCta } : {}),
  };

  return cleanInvisibleMakeMyPostValue(parsed);
}

function strengthenBeautyShortFormOpening(
  parsed: GeneratedResponse,
  originalContent: string
) {
  const prompt = originalContent.toLowerCase();
  const isBeauty =
    /lash|lashes|nail|esthetician|facial|skin|brow|hair|barber|makeup/.test(
      prompt
    );

  if (!isBeauty || !parsed.structured_content) {
    return parsed;
  }

  const reel = parsed.structured_content['Instagram Reel'];

  if (!reel?.scenes?.length) {
    return parsed;
  }

  const firstScene = reel.scenes[0];
  const spokenLine = firstScene.spoken_line?.trim() || '';
  const weakOpening =
    /^(not sure if|are you wondering|wondering when|here'?s how to decide)/i.test(
      spokenLine
    );

  if (!weakOpening) {
    return parsed;
  }

  if (/lash|lashes/.test(prompt)) {
    firstScene.spoken_line =
      'If your lash set looks uneven but you do not know whether to book a refill or full set, start here.';
    firstScene.on_screen_text = 'Refill or full set? Start here.';
  } else if (/nail/.test(prompt)) {
    firstScene.spoken_line =
      'If you always panic-pick your nail design, decide this before you book.';
    firstScene.on_screen_text = 'Decide this before booking.';
  } else if (/esthetician|facial|skin/.test(prompt)) {
    firstScene.spoken_line =
      'If your skin feels off but you do not want medical-sounding advice, start here.';
    firstScene.on_screen_text = 'Skin feels off? Start here.';
  }

  const contentValue = parsed.content?.['Instagram Reel'];
  if (parsed.content && typeof contentValue === 'string' && contentValue.trim()) {
    parsed.content['Instagram Reel'] = contentValue.replace(
      spokenLine,
      firstScene.spoken_line || spokenLine
    );
  }

  if (
    parsed.best_output?.platform === 'Instagram Reel' &&
    typeof parsed.best_output.content === 'string'
  ) {
    parsed.best_output.content = parsed.best_output.content.replace(
      spokenLine,
      firstScene.spoken_line || spokenLine
    );
  }

  return parsed;
}


const PLATFORM_WRITING_RULES = String.raw`Platform writing rules:
- Every selected platform output must feel native to that platform, not like the same idea rewritten with a different label.
- Short-form video outputs must treat the first 3 seconds as the most important part of the asset.
- For Instagram Reels, TikTok Scripts, and YouTube Shorts Scripts, the first spoken line must create immediate curiosity, tension, recognition, or a clear reason to keep watching.
- Do not open short-form video outputs with generic setup, context, explanation, greetings, or phrases like "Today I want to talk about", "Here are three tips", "Let me show you", or "If you are interested in".
- The first line should make the viewer think: "That sounds like me", "I did not think about it that way", "I need to know the answer", or "I might be making that mistake."
- Do not make all selected outputs repeat the same opening line, CTA sentence, or structure.
- Use the chosen campaign route, but adapt it differently for each platform.
- Write the actual post/script/carousel copy, not advice about what the post should say.
- Every selected platform output must be final audience-facing content the user can publish, not an outline, planning note, or instruction.
- Do not write meta-instructions like "Share how...", "Discuss...", "Explain...", "Talk about...", "Highlight...", "Introduce...", "Post about...", "Use this slide to...", "Invite followers to...", or "Ask followers if..." inside platform content.
- Replace instructional copy with the exact words the audience should see or hear.
- Every output must include at least one specific buyer problem, objection, mistake, decision point, or next step.
- Avoid lesson-summary endings like "building trust is key" or "interested in learning more." End with a concrete action.
- Make the content feel like it came from a sharp operator inside the user's business, not a generic social media template.
- Prefer specific lines like "Before I post a client win, I check these 3 things" over broad lines like "Here are 3 tips for sharing transformations."
- If the user asks for sales content, the content must naturally lead to a lead, reply, booking, quote, assessment, or paid next step.
- Do not open platform outputs with generic phrases like "Hey everyone", "Here’s a quick tip", "Want the full plan?", "Want a calendar to help with this?", "Did you know", "Let’s talk about", "I’m excited to share", "Are you ready to", or "In today’s post".
- Start each platform output with a specific tension, buyer problem, business insight, objection, or clear promise tied to the user's goal.
- Do not describe the content as valuable, resonant, helpful, engaging, motivating, relatable, or trustworthy. Write the useful content directly.
- Do not use vague phrases like "secret sauce", "accountability is key", "build credibility", "clear path to solutions", "level up", "game changer", "bragging rights", "client success", or "unlock your potential".
- Do not use markdown formatting inside platform content. Do not use **bold**, markdown headings, or markdown bullets. Use plain text that can be copied directly.
- Before returning JSON, rewrite any platform output that includes a weak CTA lead-in. Replace phrases like "Want the full plan?" with direct CTA copy like "Comment PLAN and I’ll send you the Transformation Content Calendar."
- For sales content, every selected platform output must include a specific next action, not just education.
- Strong platform opener examples:
  TikTok: "I have 3 client transformations I could post, but I’m not turning them into brag posts. I’m turning them into 4 weeks of sales content."
  YouTube Shorts: "Client transformations are not just proof. They are content systems when you break them into the problem, the process, and the next step."
  LinkedIn: "A client transformation should not become a brag post. It should become a useful lesson that helps the next person take the first step."
  Facebook: "I’m not sharing private client details, but I can still teach the process behind progress."
- For fitness coach transformation prompts where exact client details are missing, the main campaign should NOT be an ethics lesson. The main campaign should turn proof into useful sales content using this structure: buyer problem, coaching process, consistency obstacle, first coaching step.
- For fitness coach transformation prompts, permission/privacy must be handled quietly as a guardrail only. Do not make it the hook, headline, repeated phrase, CTA, or main theme unless the user explicitly asks for that angle.
- If the user says not to make up client details, mention truthful/no-invented-details language at most once across the entire result. Do not repeat phrases like "private details," "privacy," "permission," "ethical," or "without sharing details" across multiple outputs.
- For transformation/client-win content with missing details, create useful content around: the client's starting problem, the coaching process, consistency obstacles, accountability, the viewer's own fitness goal, the first coaching step, a story prep worksheet, a proof-to-post calendar, or a DM conversation starter.
- Strong angle example: "I have 3 client wins. Here’s how I’d turn them into a month of sales content: Week 1 is the starting problem, Week 2 is the coaching process, Week 3 is the consistency obstacle, and Week 4 is the first coaching step."
- Weak angle to avoid: "Here are 3 ethical questions to ask before sharing client transformations."
- Weak angle to avoid: "I’m not posting private client details, but..."
- Weak angle to avoid: "Instead of sharing private details..."
- If the user asks for a month of sales content, the main output must include a repeatable monthly content angle, weekly plan, content calendar, or proof-to-post system. Do not reduce the answer to one generic checklist.
- For a fitness coach with multiple client transformations, the strongest campaign is usually: turn each transformation into a content theme without naming the client or inventing results. Example themes: starting problem, coaching process, consistency obstacle, mindset shift, accountability lesson, nutrition habit, first coaching step, and fitness-goal DM question.
- In this situation, permission/privacy should appear as one checkpoint, not the main idea of every hook, slide, scene, CTA, and lead magnet.
- Avoid making more than one selected output primarily about permission, privacy, ethics, or trust unless the user explicitly asks for that topic.
- Do not invent client visuals. If client details are missing, Instagram Reel visuals must use coach-only scenes: talking to camera, whiteboard, notebook, blank worksheet, content calendar, workout plan, checklist, phone notes, or a DM prompt with no real names/details. Do not suggest footage of clients, client workouts, client celebrations, consultations with clients, blurred clients, transformation photos, or testimonials unless the user provided those assets.
- Do not write phrases like "client success", "secret sauce", "accountability is key", "builds trust", or "ready to start your transformation" unless they are made specific to the buyer problem and coaching next step.
- For a month of sales content, the output should feel like a repeatable campaign system. Include a 4-week angle or content calendar idea whenever possible: Week 1 starting problem, Week 2 coaching process, Week 3 consistency obstacle, Week 4 first coaching step.
- For fitness transformation prompts, do not imply what clients learned, felt, achieved, overcame, or celebrated unless the user gave those exact facts. Instead say what the coach can teach from the process without revealing private details.
- For fitness coach monthly sales content, every platform output must include specific reusable content examples, not just broad week labels.
- Use concrete fitness-business examples such as busy schedule, weekend eating, no plan, inconsistent workouts, nutrition confusion, accountability, check-ins, beginner plan, habit tracking, first assessment, starter coaching call, and realistic next step.
- Do not write vague phrases like "fitness journey", "achieve your goals", "find your path", "take your first step", "let's get started", or "unlock your potential."
- Do not make the CTA "free coaching consultation" unless the user asked for a consultation. Prefer a lower-friction business step like "First-Step Fitness Assessment", "Fitness Goal Check", "Starter Coaching Call", or "Consistency Audit."
- For a carousel, each slide must teach one specific part of the campaign system. Avoid slides that only say "Week 1: starting problem" without explaining what the user should post.
- For reels, each scene must include a specific example or filming action. Avoid generic visuals like "talking to camera" unless paired with a concrete line.
- For Facebook posts, write like a real coach explaining a useful system to potential clients. Do not write broad marketing language.`;

const TRUST_RULES = String.raw`Trust rules:
- Truth is more important than sounding impressive.
- Never invent names, numbers, testimonials, quotes, income, timelines, health results, client outcomes, guarantees, urgency, scarcity, discounts, or market claims.
- Never invent weight loss, muscle gain, confidence, plateaus, before/after results, dream body outcomes, improved energy, revenue, bookings, or client success details unless the user provided those exact facts.
- If the user says not to make up details, follow that instruction above everything else.
- If the user says not to make up client details, or if exact proof details are missing, conversion_tips must not suggest using testimonials, success stories, client proof, before/after stories, transformations, or results unless the user already has permission and exact details.
- When proof details are missing, conversion_tips should suggest safe follow-up actions: ask one qualifying question, send the checklist, invite a first-step call, ask what goal they are working toward, ask what feels hardest to stay consistent with, or request permission/details before using any proof.
- If the user mentions transformations, testimonials, case studies, proof, or client wins but does not provide exact details, DO NOT describe what happened to the clients.
- Do not write “Client 1,” “Client 2,” “Client 3,” fake stories, fake outcomes, fake lessons from those outcomes, or fake testimonials unless the user provided those details.
- Instead, create content around a safe sales-content framework: buyer problem, coaching process, what changed in the approach, what the viewer may relate to, what question to ask, and the next coaching step.
- Safety is a guardrail, not the main campaign theme. Do not make every output about ethics, privacy, permission, or trust just because proof details are missing.
- Do not make "ethical," "private details," "permission," or "privacy" the main headline, CTA, lead magnet name, or repeated phrase unless the user specifically asks for ethics, compliance, permission, or legal-safe posting.
- Do not open posts with "I’m not sharing private client details" or "Instead of sharing private details." Start with the useful business/content system instead.
- For transformation/client-win prompts with missing details, the campaign should usually focus on the buyer's goal, the coaching process, consistency obstacles, a proof-to-post plan, or the first coaching step — with safety handled quietly in the background.
- When proof details are missing, vary the campaign angle around one of these: buyer goal, consistency obstacle, coaching process, accountability, proof-to-post calendar, first-step assessment, story prep, or proof without exaggeration.
- Safe wording when proof details are missing: “three real client transformations,” “client wins,” “the coaching process behind the wins,” “what I check before posting client progress,” “how to turn client progress into useful content without exaggerating,” “how to turn proof into a coaching conversation.”
- Never use square-bracket placeholders like [client name], [image], [testimonial], or [insert link].
- Use truthful general language when details are missing.`;

const QUALITY_RULES = String.raw`Quality rules:
- The output should feel like something a real business owner could use today.
- Final check before returning JSON: if any selected platform output reads like an instruction to the creator instead of finished content for the audience, rewrite it into copy-ready content.
- Final check before returning JSON: carousel slides must not tell the user what to share, explain, discuss, introduce, highlight, or ask. They must contain the exact slide copy.
- Do not invent age ranges, gender limits, income levels, locations, lifestyle labels, or demographic restrictions unless the user explicitly provides them.
- Target Audience should describe the buyer situation, service need, occasion, problem, booking intent, or customer behavior — not broad demographics.
- Prefer audience wording like "clients booking event nails for birthdays and vacations", "lash clients deciding between refill timing and a full set", or "hair clients unsure which color service fits their maintenance routine."
- Avoid invented audience wording like "women aged 18-35", "women aged 20-40", "men and women aged 25-45", "young adults", or "busy professionals" unless the user provided those specifics.
- Avoid generic phrases like "boost engagement", "drive sales", "valuable insights", "learn more", and "contact me today."
- Also avoid filler phrases like "thought-provoking question", "surprising fact", "relatable scenario", "authenticity is key", "resonate with your audience", "builds trust", "share tips", "provide value", "take your business to the next level", and "unlock your potential."
- Replace generic language with specific wording tied to the user's business, buyer problem, objection, offer, platform, and next action.
- Avoid generic funnel language unless it is clearly the most natural wording. Do not overuse phrases like "lead capture", "convert leads", "drive bookings", "personalized recommendation", "right-fit", "booking help", "decision guide", "direct DMs", "interested prospects", "warm leads", "take the next step", "book the right appointment", or "recommend the right package."
- Replace generic funnel language with the actual business action, question, resource, or follow-up message.
- Prefer "Ask for event date, guest count, and menu needs" over "capture catering leads."
- Prefer "Ask which room or service they need quoted" over "send a personalized recommendation."
- Prefer "Reply with your last appointment date and the look you want next" over "find the right-fit appointment."
- Prefer "Comment CLARITY and I’ll send the Offer Clarity Checklist" over "convert interested prospects."
- Action Plans must sound like instructions a real owner can execute today, not marketing automation.
- Money Plans must name the actual quote request, consultation, checklist, assessment, booking inquiry, sales conversation, or buyer question.
- Do not say a hook is strong; write the strong hook.
- Do not say a post should be relatable; write the actual relatable angle.
- Do not say the content should build trust; show the trust-building proof process, checklist, question, or next step.
- Use concrete nouns and verbs. Prefer "comment START for the Client Story Prep Sheet" or "comment START for the Fitness Goal Conversation Starter" over "engage with this post."
- Make every CTA copy-paste-ready and specific, such as DM a keyword, comment a keyword, request a checklist, book a call, ask for a quote, request an assessment, join a list, or reply with a question.
- CTA keywords should usually be ONE short, natural word. Prefer simple keywords like QUOTE, CLEAN, STYLE, REFILL, LASHES, MENU, BOOK, READY, FIT, START, CHECK, or GUIDE.
- Avoid long or awkward CTA keywords like CLEANING CHECKLIST, PERSONALIZED STYLE HELP, FULL SET GUIDE, SERVICE NEEDS CHECKLIST, ROOM PRIORITY CHECKLIST, or anything longer than two short words.
- If the campaign uses a checklist, guide, or resource, keep the public CTA short. Example: use "Comment QUOTE and I’ll send the checklist" instead of "Comment CLEANING CHECKLIST."
- Make the lead magnet match the CTA.
- Make the Money Plan match the same campaign angle.
- If the user's idea is vague, choose a realistic business scenario, but do not invent proof.`;

const LOCAL_SERVICE_PLAYBOOK = String.raw`- For local service businesses such as cleaners, landscapers, contractors, home services, repair services, pet services, and mobile services: focus on quote requests, service areas, job details, estimate requests, service menu clarity, quote questions, customer concerns, and practical next steps. Only discuss availability, scheduling, booking steps, or service frequency if the user provides those details.
- For local service outputs, do not invent operational claims like vetted team, background checks, licensed/insured status, no hidden fees, guaranteed quality, spotless results, sparkling clean, saving time, fast replies, same-day availability, treating the home like their own, or perfect results unless the user provided those facts.
- For local service businesses, do not invent availability, openings, same-week scheduling, booking deadlines, reserved spots, consultation calls, recurring schedules, package names, service frequency, quote guarantees, or operational details unless the user provided them.
- Local service quote paths should ask for concrete details before suggesting a service or booking, but the details must match the business type.
  - Cleaning: service type, home size, rooms or areas, current cleaning need, preferred timing, service area, and one-time or recurring interest.
  - Landscaping/lawn care: yard size, front yard/backyard/full yard, service requested, problem spots, preferred timing, service area, and one-time or recurring interest.
  - Mobile detailing: vehicle type, interior/exterior/maintenance interest, service area, preferred timing, and one-time or maintenance interest.
  - Other local services: ask for the project type, service area, timing, and one clear detail needed for an estimate.
- Prefer "Send your home size and which rooms need the most attention" over "I’ll recommend the right package."
- Prefer "I can prepare a quote from those details" over "I have openings next week."
- Prefer "Do you want a quote for a one-time clean or recurring upkeep?" over "Would you like to reserve a spot?"
- For cleaning businesses, you may explain general cleaning types like basic clean, deep clean, refresh clean, or one-time clean when the user's prompt asks about cleaning type, but do not present them as the business's named packages, prices, policies, schedules, or recurring plans unless provided. Avoid weekly, biweekly, monthly, free quote, sparkling, spotless, right-fit, personalized quote, reserved spot, openings, or availability language unless provided. If service details are missing, use neutral wording like cleaning quote request, home cleaning inquiry, room priority question, cleaning type question, or estimate request.
- Local service content should default to safer wording: clear quote, service details, home size, project details, rooms or areas, current problem, estimate request, what is included, what to expect, customer concerns, and service-area questions. Avoid "free quote", "right-fit", "personalized", "schedule fit", "booking options", "available times", or "openings" unless the user provided those details.
- Local service CTAs should usually ask for the details needed to prepare a quote: home size, project type, rooms or areas, service need, location/service area, photos if relevant, budget range if relevant, or quote request. Do not ask for preferred days, availability, or scheduling details unless the user provided that booking flow.
- For local service businesses, prefer short CTA keywords such as QUOTE, CLEAN, ESTIMATE, ROOMS, PROJECT, YARD, REPAIR, DETAILS, or HELP. Avoid long resource-style keywords like CLEANING CHECKLIST, ROOM PRIORITY CHECKLIST, SERVICE NEEDS CHECKLIST, or HOME CLEANING GUIDE.
- For cleaning businesses, default to "DM QUOTE", "Comment QUOTE", "DM CLEAN", or "Reply CLEAN" unless the user provides a different keyword. If a checklist is useful, phrase it as "Comment QUOTE and I’ll send the checklist" rather than making the keyword itself long.
- Local service Action Plans should avoid fake guarantees, fake availability, unsupported trust claims, invented packages, and scheduling assumptions. They should tell the owner what to post, what quote details to ask for, what estimate information to send, and how to follow up with one practical question before inviting a booking.
- Final local service check before returning JSON: if the output says "free quote", "personalized quote", "customized quote", "tailored quote", "right-fit", "sparkling", "spotless", "openings", "available", "reserve a spot", "preferred date", "schedule your cleaning", "weekly", "biweekly", "monthly", "package", "regular cleaning package", or "basic cleaning package" without the user providing those details, rewrite it into neutral quote-request language. Replace "personalized quote", "customized quote", and "tailored quote" with "cleaning quote", "quote", "quote request", or "estimate request." Use "cleaning quote request", "home cleaning inquiry", "estimate request", "home size", "rooms or areas", "what needs the most attention", "one-time or recurring service", and "I can prepare a quote from those details."`;


const WELLNESS_SERVICE_PLAYBOOK = String.raw`- For wellness service providers such as massage therapists, chiropractors, physical therapists, stretch therapists, mobility clinics, recovery studios, and wellness studios: focus on education, appointment readiness, service awareness, what to expect, client questions, comfort preferences, consultation inquiries, booking questions, and general wellness content.
- Wellness content must avoid medical claims, diagnosis, treatment promises, guaranteed outcomes, and overconfident recommendations. Do not say fix pain, cure, heal, treat injury, diagnose, guaranteed relief, pain-free, recovery, safe for pregnancy, medically proven, solve back pain, correct posture, realign your spine, remove toxins, eliminate pain, or you need this treatment.
- Do not imply a service will produce a specific health outcome. Replace outcome-heavy wording like "relief", "recovery", "fix", "cure", "heal", "treat", "pain relief", "muscle recovery", "deep knot relief", or "stress relief" with safer wording like "general comfort", "service awareness", "appointment questions", "what to ask about", "comfort preferences", "tension area question", "movement question", "first-visit question", or "booking inquiry."
- Do not recommend a specific treatment or appointment type as if diagnosing the client. Prefer "help you decide what to ask about", "help you compare options", "answer booking questions", "share what to expect", "ask which appointment type may be appropriate", or "invite a consultation question."
- Do not invent openings, availability, same-week scheduling, appointment times, treatment plans, session lengths, packages, prenatal safety claims, medical credentials, insurance details, or clinical policies unless the user provided them.
- Massage therapist content should be careful around tension, stress, deep tissue, sports massage, and prenatal massage. Avoid claiming relief, recovery, safe pregnancy care, or targeted medical outcomes. Prefer "which massage should you ask about?", "what to expect", "comfort level", "pressure preference", "main tension area", "appointment questions", and "booking details."
- Chiropractor content should avoid claims about fixing pain, curing headaches, realigning the spine, correcting posture, treating injury, or guaranteed results. Prefer "what to expect before a first visit", "questions to ask", "consultation readiness", "general posture awareness", "new patient questions", and "appointment inquiry."
- Physical therapist content should avoid diagnosis, guaranteed recovery, treatment promises, or telling people what care they need. Prefer "evaluation questions", "movement concerns to ask about", "what to expect at an evaluation", "consultation inquiry", "general mobility education", and "questions to bring to a licensed provider."
- Wellness CTAs should be low-pressure and question-based. Prefer short keywords such as VISIT, QUESTIONS, START, CONSULT, MASSAGE, STRETCH, MOVE, or INFO. For massage therapists, prefer "DM MASSAGE", "DM QUESTIONS", "DM VISIT", or "DM START" over "DM TENSION" if the wording might imply treatment or diagnosis.
- Wellness DM replies should ask one safe intake-style question, such as "Is this your first visit?", "What are you hoping to understand before booking?", "Which service are you curious about?", "What questions do you have before scheduling?", or "Would you like booking details?" Avoid diagnosing or promising results.
- Wellness Revenue Opportunities must not invent named packages, prepaid bundles, special intro sessions, session lengths, discounts, clinical offers, or treatment plans unless the user provided them. Avoid "First-Time Massage Intro Session", "Custom Massage Session", "Massage Package", "prepaid bundle", "3 or 5 sessions", "treatment plan", "special offer", and exact session lengths.
- Wellness Revenue Opportunities should default to safer next steps such as First Visit Questions, Booking Details Request, Service Options FAQ, Appointment Prep Guide, Consultation Inquiry, First Visit Info Request, or Service Question Conversation.
- Wellness Revenue Opportunities must describe conversation paths, not paid packages. Use names like "First Visit Questions", "Booking Details Request", "Service Options FAQ", "Appointment Prep Questions", or "Booking Question Thread"; do not create offer names that sound like real services, session products, bundles, or packages.
- For wellness Revenue Opportunities, never create "massage session", "massage package", "intro session", "follow-up session", "booking assistance", "discount", "bundle", or "custom service" offers unless the user explicitly provided those services or offers. Keep them as question-based lead paths, not services for sale.
- Wellness copy should avoid overconfident "right choice" language. Do not say "pick the right massage", "right massage for your needs", "right session", "recommend the right treatment", "best treatment", "best massage", "what you need", or "I’ll choose for you." Prefer "help you compare options", "answer booking questions", "share what to expect", "help you decide what to ask about", or "send booking details."
- Wellness content should avoid generic relaxation-sales phrases like "ready to relax", "get relief", "feel better fast", "book your first massage now", "book your session this week", or "help booking." Prefer calm, practical wording like "first visit questions", "what to ask before booking", "which service are you curious about?", "would you like booking details?", or "what should I know before booking?"
- Wellness Action Plans should not invent availability, available dates, available times, openings, preferred dates, appointment slots, or push booking urgency. They should tell the owner what to post, what question to ask, what information to send, and how to invite booking details without pressure.
- Wellness follow-ups should not ask for a preferred date or say the business can check openings unless the user provided availability. Prefer "Would you like booking details?", "What questions do you have before scheduling?", or "Which service are you curious about?"
- Final wellness check before returning JSON: if the output says "relief", "recovery", "fix", "cure", "heal", "treat", "pain-free", "guaranteed", "safe for pregnancy", "recommend a massage", "recommend treatment", "deep knot relief", "muscle recovery", "stress relief", "right massage", "right session", "pick the right", "best massage", "custom massage", "massage package", "prepaid bundle", "first-time massage intro session", "book your first massage", "ready to relax", "help booking", "I have openings", "openings this week", or "book a session this week" without the user providing those facts, rewrite into safer educational and booking-question language.`;

const BEAUTY_SERVICE_PLAYBOOK = String.raw`- For beauty service providers such as lash artists, nail artists, hair stylists, barbers, brow artists, estheticians, makeup artists, skincare providers, and med-spa style service businesses: focus on bookings, consultations, refills, touch-ups, maintenance timing, aftercare, style selection, service menu education, seasonal/event services, repeat appointments, deposits, client trust, and repeat weekly content.
- Do not make every beauty output a "mistakes" post or refill checklist. Match the user's exact weekly goal and rotate angles so the business can come back each week without getting repetitive output.
- If a beauty user gives a broad booking goal such as "get more bookings", "get more appointments", "get more clients", or "get more refills", do not default only to mistakes/refill timing. Choose a fresh angle based on the service and prompt: style guide, appointment-readiness, first-time client education, service comparison, prep checklist, aftercare routine, seasonal/event booking, product add-on, review/referral request, client FAQ, or maintenance reminder. Only use availability/openings as the campaign angle if the user explicitly provides availability, open dates, a booking link, or says they want to promote openings.
- For repeat weekly beauty use, make the output feel like a new weekly campaign, not the same campaign repeated. The strategy, content, action plan, lead magnet, funnel, and conversion tips should all use the chosen angle consistently.
- Avoid overusing the phrases "decision guide" and "quick checklist" in beauty outputs. Do not use "decision guide" more than once in a single beauty generation. Prefer more specific campaign names tied to the user's prompt, such as "Color Service Matcher", "Refill Timing Guide", "Event Nail Prep Sheet", "Style Menu", "Booking Reminder", "Aftercare Card", "Service Fit Guide", "Consultation Prep Sheet", "Maintenance Plan", "Color & Cut Planner", "Appointment Prep Sheet", or "Style Match Guide".
- For beauty outputs, choose ONE primary CTA keyword per campaign when possible. Avoid mixing three or more CTA keywords like COLOR, CUT, and BOOK in the same campaign unless the user clearly asked for multiple services. If multiple services are mentioned, pick the best primary keyword and explain the secondary option only in the follow-up.
- Beauty content should sound calm and professional, not alarm-based. Avoid phrases like "big mistake", "don't wait too long", "avoid damage", "ruins your look", "wrecks your look", "costly mistakes", "wastes money", or "book now before it is too late." Use calmer alternatives like "common timing issue", "easy mix-up", "helps you plan the right appointment", "keeps the process clear", "prevents confusion", or "makes booking easier".
- Avoid repeating the same CTA keyword across every beauty test unless it is clearly the best fit. Use service-specific alternatives when appropriate, such as STYLE, LASHES, REFILL, BOOK, NAILS, DESIGN, FILL, HAIR, COLOR, CUT, GLOW, SKIN, BROWS, or CONSULT.
- For beauty businesses, rotate between different content angles when relevant: appointment-readiness, service menu education, style selection, client prep, aftercare, refill/fill/touch-up timing, seasonal services, event/bridal/prom content, product add-ons, reviews/referrals, transformation explanations, consultation prompts, new-client education, repeat-client reminders, and waitlist/deposit messaging. Use appointment openings only when the user provides real availability or asks to promote openings.
- Before writing beauty content, silently choose ONE primary campaign angle for this generation and commit to it across Strategy, Content, Money Plan, Action Plan, lead magnet, funnel, and conversion tips.
- Do not combine too many beauty angles in one output. One weekly campaign should feel focused, such as “event nail design booking,” “color consultation decision guide,” “lash refill timing,” “new client style guide,” “appointment-readiness,” “aftercare education,” or “seasonal service prep.”
- If the user asks for repeat appointments, choose a retention or maintenance campaign. If the user asks for new clients, choose an education, style-selection, service-comparison, or consultation campaign. If the user mentions an event, birthday, wedding, vacation, prom, holiday, or season, choose an event/seasonal campaign. If the user mentions color, haircut, lashes, nails, brows, skin, or makeup, make the campaign specific to that service.
- For beauty outputs, make each platform serve a different role in the same campaign instead of rewriting the same post:
  - Instagram Reel: quick visual hook, 3-5 scenes, simple spoken lines, one booking CTA.
  - Instagram Carousel: saveable decision guide, checklist, menu explainer, timing guide, or style-selection framework.
  - TikTok Script: conversational, punchy explanation with a strong first line and clear payoff.
  - Facebook Post: local/community-friendly post that explains the service, booking reason, and next step.
  - LinkedIn Post: only use if the beauty business serves professionals, bridal/event clients, salon owners, or premium service buyers; otherwise keep it practical and local.
  - YouTube Shorts Script: timed or beat-by-beat version with a clear hook, payoff, and CTA.
- Beauty lead magnets should change based on the campaign angle. Do not always use a checklist. Use guide, lookbook, style menu, prep sheet, timing guide, aftercare card, event planner, service matcher, consultation questions, or booking prep note when it fits better.
- Beauty Action Plans should not repeat the same CTA every day. Day 1 should publish the main asset, Day 2 should reply and qualify, Day 3 should send the resource, Day 4 should answer an objection, Day 5 should invite booking, Day 6 should post a lighter reminder or behind-the-scenes proof, and Day 7 should review replies and plan next week’s campaign angle.
- For lash artists: use the user's prompt to choose between lash style guide, refill reminder, full set booking, refill booking, aftercare reminders, lash care checklist, classic/hybrid/volume education, appointment-readiness, event lashes, product add-ons, or client FAQ content. Use DM keywords like LASHES, REFILL, STYLE, or BOOK.
- For lash/refill outputs, do not invent exact refill windows such as 2-4 weeks, 4+ weeks, 5 weeks, or any appointment timing rule unless the user provides it. Use safer wording like "when was your last appointment?", "what does your set look like right now?", "are you deciding between a refill and a full set?", or "send what you are deciding between."
- Lash content must not claim lash health outcomes, natural lash damage, natural lash stress, restoration, volume restoration, guaranteed retention, or medical-ish lash care benefits unless the user provided support. Keep it to booking, refill timing questions, style preference, appointment fit, aftercare reminders, and consultation-style guidance.
- Lash content should not tell clients to send a photo/picture for diagnosis or say the artist will recommend the best/right service from a photo. Prefer safer wording: "Tell me when your last appointment was", "Tell me what you want your set to look like", "Are you leaning refill or full set?", or "Send what you are deciding between."
- Lash Action Plans should not recommend a refill or full set based on exact weeks unless the user gives their policy. They should ask when the last appointment was, ask what the client wants the set to look like, ask whether they want a refill or full set, and invite them to share their preferred day or service goal.
- Lash Action Plans should not invent availability, priority booking, held appointment spots, booking links, or immediate scheduling. Use "send your preferred day if you are ready to book", "send what you are deciding between", "are you leaning refill or full set?", or "tell me the look you want next." Avoid "right service option", "appointment fits best", "booking link", "warm leads", "lead capture", and "conversion chances."
- Lash Money Plans should not create priority booking, guaranteed openings, appointment availability, booking links, diagnosis-by-photo, "best fit", "right service", "right-fit", "appointment fits best", or "best service" recommendations unless provided. Default to refill appointment inquiry, full set appointment inquiry, appointment planner, style preference question, refill timing question, or service question conversation.
- Lash follow-ups should sound like a real lash artist texting a client. Prefer: "When was your last appointment?", "Are you leaning refill or full set?", "What do you want your lashes to look like next?", "Send your preferred day if you are ready to book", and "I can answer booking questions." Avoid marketer phrases like "personalized message", "qualified lead", "lead capture", "conversion", "warm lead", or "direct booking invite."
- For nail artists: use the user's prompt to choose between design menus, appointment-readiness, fill timing, nail prep, aftercare, seasonal sets, event/bridal nails, gel/acrylic/dip education, design polls, retention reminders, or client FAQ content. Use DM keywords like NAILS, DESIGN, FILL, SET, or BOOK.
- For nail artists, prefer "DM NAILS", "DM DESIGN", "Comment NAILS", "Comment DESIGN", "DM FILL", or "DM SET" over "DM STYLE" unless the user specifically uses the word style as the main CTA.
- For hair stylists and barbers: use the user's prompt to choose between consultation prompts, color service education, haircut maintenance, style upkeep, product recommendations, transformation explanations, appointment-readiness, seasonal changes, event hair, or client FAQ content. Use DM keywords like HAIR, COLOR, CUT, STYLE, or CONSULT.
- For estheticians, brows, makeup, skincare, and med-spa style services: use the user's prompt to choose between consultation prompts, prep and aftercare checklists, maintenance timing, skin-goal questions, service education, event/bridal packages, seasonal skin content, brow mapping, makeup prep, or client FAQ content. Use DM keywords like GLOW, BROWS, SKIN, BEAUTY, or CONSULT.
- Beauty content should sound polished, trust-building, specific, and booking-focused. Avoid generic beauty fluff like "look beautiful", "feel confident", "glow up", or "treat yourself" unless tied to a specific service, timing, aftercare step, style choice, or booking reason.
- Beauty content must avoid fear-based, medical-ish, guarantee-heavy, or unsafe claims. Do not say guaranteed, flawless, perfect, damage-free, lasts forever, instant transformation, best in town, ruin your lashes, ruin your set, stop lash loss, lash loss, damage, damaged lashes, premature shedding, natural lash damage, overload natural lashes, save money, wasted money, costly mistakes, or fix damage unless the user gave support.
- Prefer safer beauty language: keep your set looking fresh, avoid unnecessary gaps, plan your refill timing, choose the right style for your routine, maintenance-friendly, personalized recommendation, results vary, book a consultation first, aftercare matters, refill rhythm, appointment reminder, style refresh, service match, and keep your look consistent between appointments.
- Beauty CTAs should be direct but calm: DM REFILL, DM LASHES, DM STYLE, Comment REFILL, Book your refill, Send your preferred day, Send your current routine, or DM CONSULT. Do not use panic language like "don’t wait" unless the user specifically requests urgency.
- Beauty CTAs should be easy for a real client to follow. Prefer one clear action per post: DM one keyword, comment one keyword, request a prep sheet, send a preferred day, or reply with a service goal. Avoid stacking multiple actions in one CTA.
- Beauty booking language must not invent availability, open spots, limited spots, same-week openings, exact scheduling options, booking links, held spots, or urgency unless the user provides those details. Prefer natural client-first CTA language like "DM REFILL with when your last appointment was", "Send what you are deciding between", "Reply with your preferred day and service goal", or "I can answer booking questions." Avoid robotic phrases like "ask about the next step", "next steps if they fit", "right next step fit", "right-fit", "appointment fits best", "booking link", "lock in your spot", or "find a spot."
- Beauty Action Plans should feel fresh and tied to the weekly prompt. Include what to post, what to ask in DMs, what service or appointment to offer, how to qualify the client, and how to follow up without sounding pushy or fear-based.
- Beauty outputs should sound like a real solo service provider talking to local clients, not a marketer. Avoid stiff phrases like "buyer indecision", "direct inquiries", "lead capture", "smooth booking experience", "take care of the rest", "book hassle-free", "personalized service recommendations", "exactly what you need", or "professionalise/professionalize".
- For nail artists, do not default every gel or nail-art campaign to events. Include everyday reasons when relevant: regular maintenance, fresh set, refill/fill timing, vacation, birthday, photos, work, personal style, or wanting help choosing a design.
- Nail content should help the client decide between style, design level, maintenance, appointment type, and timing. Do not imply the artist can guarantee durability, perfect fit, best design, or exact service recommendation unless the user provided those details.
- Beauty short-form video Scene 1 / 0-3 seconds is the most important part of the asset. It must be the strongest line in the Reel, TikTok, or Short.
- Beauty Scene 1 must create immediate curiosity, tension, or recognition before explaining the topic. Avoid generic setup questions like "Not sure if...", "Want to know...", "Here are...", "Let's talk about...", or "If you need..." unless the full line is unusually specific and scroll-stopping.
- Beauty Scene 1 should name a specific client moment, decision point, or booking problem. Strong examples: "If your lash set looks uneven but you do not know what to book, watch this.", "Your next nail set should match your week, not just your Pinterest board.", "Before you book nail art, decide this first.", "If you always panic-pick your nail design, save this.", "If your clients wait until their lashes look empty, this post is for them.", "The wrong beauty appointment usually starts with one unclear question."
- For beauty Reels, Scene 1 spoken_line must be sharper than the carousel title. It should not merely repeat the lead magnet name, CTA keyword, or strategy topic.
- For beauty Reels/TikToks/Shorts, do not open Scene 1 with "Not sure if..." or "Are you wondering..." for lash, nail, hair, brow, or skin outputs. Rewrite those into a more specific client moment.
- For lash short-form videos, Scene 1 should name the visible/booking tension immediately. Strong examples: "If your lash set looks uneven but you do not know what to book, watch this.", "If your lashes still look good but feel hard to plan around, start here.", "Before you book a refill or full set, answer this one question.", or "The refill vs full set decision starts before you DM for an appointment."
- Lash short-form videos should avoid weak opening lines like "Not sure if it is time for a refill or full set?", "Wondering when to book?", or "Here is how to decide." Use those ideas only after Scene 1.
- Beauty follow-up messages should feel helpful and low-pressure. Prefer: "What are you hoping your nails look like this time?", "Is this for everyday wear or something coming up?", "Are you thinking simple, detailed, or still unsure?", "Send what you are deciding between and I’ll point you toward the right service option", or "Send me your inspo and I’ll tell you what to ask for at booking."
- Do not invent held spots, limited openings, immediate availability, deposits, policies, price ranges, service timing, or appointment guarantees. Use "send your preferred day", "send what you are deciding between", "ask for the booking link", or "I can point you toward the right service option" unless the user provided availability or policy details.
- For nail outputs, never invent exact refill/fill timing such as "2-3 weeks", "2–3 weeks", "every 3 weeks", "every 4 weeks", or "usually every few weeks" unless the user provides their policy. Use safer wording like "when you notice grow-out", "when your current set starts feeling grown out", "before your next event or trip", "when you are ready for a refresh", or "ask about timing based on your current set."
- Nail outputs should not use fear or money-loss language such as "cost more to fix", "wasted money", "wrong prep", "look bad", "ruin", "damage", "nail health", "don’t wait", or "before it gets worse." Keep the tone calm: "choose a look that fits your routine", "plan your refresh", "ask what service fits your current set", or "send your inspo before booking."
- Nail follow-ups must not say "hold a spot", "I have openings this week", "openings soon", or "available times" unless the user provided availability. Prefer: "Do you want me to send the booking link?", "Send me your preferred day and I’ll check what works", or "Send what you are deciding between and I’ll point you toward the right service option."
- Beauty public calls to action should be natural and service-specific. Prefer "DM LASHES", "DM REFILL", "Comment LASHES", "Comment REFILL", "DM NAILS", "DM DESIGN", "Comment NAILS", "Comment DESIGN", "Comment FILL", "DM HAIR", "DM COLOR", "Comment GLOW", or "DM CONSULT" over awkward generic phrases like "DM me", "book now", "link in bio", or generic "DM STYLE" when a clearer service keyword would fit better.`;

const BUSINESS_RULES = String.raw`Business rules:
- For realtors: focus on homeowner questions, seller prep, home value curiosity, listing readiness, avoiding seller mistakes, downsizing, inherited homes, and seller consultations.
- For real estate: do not claim hot market, best time, quick sale, guaranteed value increase, or market trends unless the user provided that fact.
- For realtor content, avoid claim-heavy or risky real estate language. Do not imply guaranteed sale speed, guaranteed buyer exposure, guaranteed higher price, perfect timing, or that a seller should list immediately.
- Avoid phrases like "the best time is now", "the sooner the better", "sell fast", "sell quickly", "maximize sale price", "boost sale price", "get top buyer exposure", "smooth sale", "market is hot", "avoid delays", "speed up the sale", "perfect listing window", "could cost you more", "cost you money", "actually add value", "increase your home's value", "won't increase your home's value", "buyers see the potential", "serious buyers", "buyer concerns", or "best repairs" unless the user provided specific support.
- Prefer safer realtor language: seller readiness, listing prep, home value conversation, repair prioritization, timeline clarity, pricing questions, seller concerns, consultation readiness, understand your options, repairs worth discussing before listing, prep items buyers may notice, questions to ask before spending on upgrades, and prepare before listing.
- In realtor outputs, use "seller concerns", "seller questions", "homeowner concerns", or "listing prep questions" instead of "buyer concerns" when describing the lead's objections or follow-up topics.
- For repair content, do not claim a repair adds value, protects value, increases value, saves money, saves time, prevents loss, speeds up a sale, creates buyer interest, improves offers, improves pricing, or helps the home sell unless the user provided support. Safer wording: "repairs worth discussing before listing", "repair questions to ask before listing", "prep items to review", "which repairs may matter for your situation", or "questions to review before listing."
- Realtor outputs must avoid certainty, financial-outcome, buyer-behavior, and speed claims. Do not say: "right price", "price it right", "help you sell", "sell faster", "speed up", "avoid costly", "cost-effective", "costly mistakes", "really matters", "actually matters", "buyers actually notice", "buyers care about", "increase buyer interest", "maximize buyer interest", "maximize value", "save time", "save money", "saving time/money", "affect offers", "won't affect offers", "pay off", or "smooth sale".
- Realtor outputs should be framed as neutral readiness questions, not promises. Prefer: "pricing questions", "timeline questions", "repair questions", "prep questions", "seller concerns", "home preparation questions", "market value conversation", "Seller Readiness Review", and "consultation conversation."
- In realtor outputs, the strongest safe content format is a question-based checklist. Use wording like: "What is your selling timeline?", "Which repair questions should you review before listing?", "What prep questions are you unsure about?", "What pricing questions do you want answered?", and "What documents should you gather before listing?"
- Realtor CTAs should invite a checklist or review conversation, not imply a guaranteed sale result. Strong CTA: "Comment READY and I’ll send you the Seller Readiness Checklist." Strong follow-up: "What is your selling timeline, and what is your biggest question before listing?"
- Realtor CTAs should usually invite a Seller Readiness Checklist, Seller Prep Review, Listing Prep Consultation, Home Value Conversation, Home Value Review, or Seller Timeline Check.
- For realtor lead magnets, prefer practical resources such as Seller Readiness Checklist, Listing Prep Checklist, Home Value Question Guide, Seller Timeline Planner, Repair Priority Checklist, or Before You List Checklist.
- For realtor follow-up messages, ask specific qualifying questions: "What is your selling timeline?", "What is your biggest concern before listing?", "Are you trying to sell soon or just understand your options?", "Do you want help prioritizing repairs before listing?", or "Would a home value conversation help you plan your next step?"
- Do not use "free consultation" as the default realtor CTA. Prefer "Seller Readiness Review", "Listing Prep Consultation", "Home Value Conversation", or "Seller Prep Call."
- Do not use broad phrases like "professional guidance" or "expert advice" without tying them to a specific seller question, timeline, home value concern, repair decision, or listing prep step.
- For fitness coaches: focus on safe transformation language, buyer situations, habits, consistency, accountability, beginner plans, assessments, coaching calls, and realistic next steps.
- For restaurants and caterers: focus on catering inquiries, event orders, party trays, office lunches, menus, quote requests, and repeat orders.
- For catering outputs, do not invent delivery guarantees, exact delivery windows, guest count ranges, booking deadlines, freshness promises, stress-free outcomes, kid-friendly claims, dietary coverage, dessert trays, setup advice, happy guests, happy clients, date-holding, or confirmed availability unless the user provided those details.
- Catering content should default to safe lead-generation language: event date, guest count, pickup or delivery preference, menu needs, dietary notes, budget range if relevant, catering menu request, party tray inquiry, quote request, office lunch order, family event order, or repeat catering inquiry.
- If the user does not provide specific menu categories or service terms, do not name specific foods, dietary options, guest-count ranges, subscriptions, dessert trays, setup support, delivery reliability, or ordering deadlines. Use "menu options", "event details", "guest count", "pickup or delivery preference", "dietary notes", "quote request", and "catering inquiry" instead.
- Catering Money Plans should not invent subscriptions, bundles, exact guest ranges, delivery guarantees, or included services. Default offers should be catering menu inquiry, event quote request, party tray inquiry, office lunch inquiry, family event inquiry, or repeat catering inquiry.
- Catering CTAs should usually ask for event type, event date, guest count, menu needs, and pickup/delivery preference. Strong CTA example: "Comment MENU or DM your event date and guest count, and I’ll send the catering menu."
- Catering Action Plans should avoid fake urgency and guaranteed outcomes. They should tell the owner what to post, what event detail to ask for, what menu/quote information to send, and how to follow up with a clear catering inquiry or quote next step.
${LOCAL_SERVICE_PLAYBOOK}
- For coaches and consultants: focus on audits, starter sessions, discovery calls, assessments, clarity offers, and trust-building content.
- For clothing brands and ecommerce product brands: focus on product details, fit, fabric, sizing, colorways, styling ideas, drop date, waitlist signups, drop updates, product questions, customer use case, and purchase questions.
- For vague clothing/ecommerce prompts, avoid early access, preorder, bundles, discounts, VIP access, styling consultations, purchase access before launch, previous-drop claims, quality claims, packing/shipping claims, and scarcity language unless the user provided those details.
${WELLNESS_SERVICE_PLAYBOOK}
${BEAUTY_SERVICE_PLAYBOOK}
- Do not default to vague scarcity language like "exclusive", "limited edition", "before it is gone", "do not miss out", "secure your spot", "VIP membership", or "hype" unless the user clearly gave a real limited drop, inventory limit, or membership program.
- Do not invent production details such as expert sewing, skilled team, every stitch, handcrafted details, premium fabric, perfect fit, sustainable materials, or limited quantities unless the user provided those facts.
- If production details are missing, use safe behind-the-scenes ideas: fabric close-up, fit check, styling clip, packing orders, choosing colorways, checking samples, product flat lay, founder explaining the design choice, try-on clip, size guide, or waitlist page.
- Product-brand CTAs should usually invite a waitlist signup, drop update, sizing question, fit question, styling question, drop reminder, or product question. Only mention early access, preorder, bundles, discounts, or fit guides if the user provided those details.
- Strong product-brand CTA examples: "Comment DROP and I’ll send you the waitlist link.", "Comment FIT and I’ll send one sizing question to help you decide.", "Comment STYLE and I’ll send one styling idea for the piece.", "Join the waitlist for the drop update.", "Reply SIZE with your sizing question."
- Product-brand Money Plans should lead to product sales, waitlist signups, drop updates, sizing/fit questions, product questions, repeat purchases, or drop reminders — not consulting, creator education, vague community engagement, invented preorders, invented early access, invented bundles, or invented discounts.
- For clothing brands, each content asset should include at least one concrete product-sale angle: fit, material feel, styling situation, size question, colorway, drop timing, waitlist reason, outfit use case, or why someone would wear it.
- Do not say "build excitement" or "create hype" as the main strategy. Show the specific product reason someone would want to join the waitlist or buy.
- For service businesses: prioritize leads, bookings, calls, quotes, consultations, assessments, custom plans, and repeat customers.`;

function cleanMakeMyPostAudioDirection(value: unknown) {
  const direction = normalizeString(value);

  if (!direction) {
    return '';
  }

  let cleaned = direction
    .replace(
      /\s*(or|and)?\s*(a\s+)?(soft|short|quick|light|calm|low-volume|low volume|simple)?\s*voiceover[^.,;]*[.,;]?/gi,
      ''
    )
    .replace(/\bvoiceover\b/gi, 'on-screen text')
    .replace(/\s+([.,;])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Use light background music or natural sound with simple on-screen text for the hook and CTA.';
  }

  if (!/on-screen text|text overlay/i.test(cleaned)) {
    cleaned += ' Use simple on-screen text for the hook and CTA.';
  }

  return cleaned;
}

function limitShotOrderToUploadedPhotoCount(shotOrder: string[], uploadedImageCount: number) {
  if (uploadedImageCount > 1) {
    return shotOrder;
  }
  return shotOrder.slice(0, 1);
}

function cleanMakeMyPostShotOrder(
  value: unknown,
  ctaKeyword: string,
  shouldUseVideoOverlay: boolean
) {
  const shotOrder = normalizeStringList(value);

  if (shotOrder.length === 0) {
    return [];
  }

  const safeCta = ctaKeyword || 'DESIGN';

  const cleaned = shotOrder.map((item) => {
    let cleanedItem = item
      .replace(
        /text overlay inviting DMs?\.\s*Text overlay:\s*DM\s+[A-Z]+\.?/gi,
        shouldUseVideoOverlay ? `text overlay: DM ${safeCta}.` : ''
      )
      .replace(
        /text overlay inviting DMs?/gi,
        shouldUseVideoOverlay ? `text overlay: DM ${safeCta}` : ''
      )
      .replace(
        /\s*text overlay\s+(and\s+)?CTA\.?/gi,
        shouldUseVideoOverlay ? ` text overlay: DM ${safeCta}.` : ''
      )
      .replace(
        /\s*text overlay:?\s*CTA\.?/gi,
        shouldUseVideoOverlay ? ` text overlay: DM ${safeCta}.` : ''
      )
      .replace(
        /\s*Text overlay:\s*DM\s+[A-Z]+\.?/gi,
        shouldUseVideoOverlay ? ` Text overlay: DM ${safeCta}.` : ''
      )
      .replace(
        /\s*text overlay:\s*DM\s+[A-Z]+\.?/gi,
        shouldUseVideoOverlay ? ` text overlay: DM ${safeCta}.` : ''
      )
      .replace(
        /\s*\bCTA\.?$/i,
        shouldUseVideoOverlay ? ` text overlay: DM ${safeCta}.` : ''
      )
      .replace(/\s+([.,;])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    cleanedItem = cleanedItem.replace(/\s+\.\s*$/g, '.').trim();

    return cleanedItem;
  }).filter(Boolean);

  if (!shouldUseVideoOverlay) {
    return cleaned;
  }

  const hasExactOverlay = cleaned.some((item) =>
    new RegExp(`DM\\s+${safeCta}`, 'i').test(item)
  );

  if (!hasExactOverlay && cleaned.length > 0) {
    cleaned[cleaned.length - 1] = `${cleaned[cleaned.length - 1]} Text overlay: DM ${safeCta}.`;
  }

  return cleaned;
}

function cleanDuplicateCtaWords(value: unknown) {
  const text = normalizeString(value);

  if (!text) {
    return '';
  }

  return text
    .replace(
      /\b(DM|comment|reply|text|send|message)\s+([A-Z]{2,20})\s+\2\b/gi,
      '$1 $2'
    )
    .replace(/\bDM\s+([A-Z]{2,20})\s+and\s+DM\s+\1\b/gi, 'DM $1')
    .replace(/\bclear spoken lines or captions\b/gi, 'simple on-screen captions')
    .replace(/\bspoken lines\b/gi, 'on-screen text')
    .replace(/\bvoice lines\b/gi, 'on-screen text')
    .replace(/\bnarration\b/gi, 'on-screen text')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanUnsupportedCleaningClaims(
  value: unknown,
  allowDeepClean: boolean,
  allowCarpetCleaning: boolean
) {
  let cleaned = cleanDuplicateCtaWords(value);

  if (!cleaned) {
    return '';
  }

  cleaned = cleaned
    .replace(/\bbusiness contact screen\b/gi, 'final text overlay')
    .replace(/\bcontact screen\b/gi, 'text overlay')
    .replace(/\bbooking screen\b/gi, 'text overlay')
    .replace(/\bwebsite screen\b/gi, 'text overlay')
    .replace(/\blogo screen\b/gi, 'text overlay')
    .replace(/\bend card\b/gi, 'final text overlay')
    .replace(/\bvisual proof\b/gi, 'finished result')
    .replace(/\bas proof\b/gi, 'as the finished result')
    .replace(/\bin one cleaning session\b/gi, 'after the clean')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  if (!allowCarpetCleaning) {
    cleaned = cleaned
      .replace(/\bcarpet cleaning\b/gi, 'home cleaning')
      .replace(/\bclean carpets\b/gi, 'clean the room')
      .replace(/\bcleaning carpets\b/gi, 'cleaning the room')
      .replace(/\bcarpet condition\b/gi, 'room details')
      .replace(/\bcarpet fibers\b/gi, 'the floor area')
      .replace(/\bcarpet section\b/gi, 'finished room area')
      .replace(/\bcarpet with vacuum\b/gi, 'room with vacuum')
      .replace(/\bvisual proof\b/gi, 'finished room')
      .replace(/\s+([.,;!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  if (!allowDeepClean) {
    cleaned = cleaned
      .replace(/\bdeep clean\b/gi, 'cleaning reset')
      .replace(/\bdeep cleaning\b/gi, 'cleaning')
      .replace(/\bstandard clean\b/gi, 'cleaning')
      .replace(/\bmove[- ]?out clean\b/gi, 'cleaning')
      .replace(/\brecurring clean\b/gi, 'cleaning')
      .replace(/\s+([.,;!?])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return cleaned;
}

function getPromptOnlyPostStructure(content: string, ctaKeyword: string) {
  const lowerContent = content.toLowerCase();
  const safeCta = ctaKeyword || 'QUOTE';

  if (/detail|detailing|car|auto|vehicle/.test(lowerContent)) {
    return [
      'Open with one plain local-service sentence a real owner would post. Do not create an educational comparison, service menu, checklist, or "help them decide" angle.',
      'Keep the post focused on mobile detailing in the service area without making unsupported claims about price, timing, packages, comparisons, or exact service details.',
      `End with a simple CTA like: DM ${safeCta}. Keep the public post short and put only one casual follow-up question in Reply To Send.`,
    ];
  }

  if (/clean|cleaning|home|room|house/.test(lowerContent)) {
    return [
      'Open with a specific quote-request question that fits this business type.',
      'Keep the post focused on the service request without making unsupported claims about price, timing, promises, or specialty services.',
      `Final CTA: DM ${safeCta} and ask one simple service-specific question.`,
    ];
  }

  return [
    'Start with a specific first slide or shot that shows the service or result clearly.',
    'Use short, viewer-facing text that sounds natural and specific to the business.',
    `Final CTA: DM ${safeCta} and ask one simple next-step question.`,
  ];
}

function cleanPromptOnlyInventedDetails(value: unknown, userContent: string) {
  let cleaned = normalizeString(value);

  if (!cleaned) {
    return '';
  }

  const lowerUserContent = userContent.toLowerCase();

  const replacements: Array<[RegExp, string, RegExp]> = [
    [/\bfloor mats?\b/gi, 'interior areas', /\bfloor mats?\b/i],
    [/\bdoor frames?\b/gi, 'interior areas', /\bdoor frames?\b/i],
    [/\bcup holders?\b/gi, 'interior spots', /\bcup holders?\b/i],
    [/\btrunk\b/gi, 'interior area', /\btrunk\b/i],
    [/\bpet hair\b/gi, 'specific mess', /\bpet hair\b/i],
    [/\bstains?\b/gi, 'specific spots', /\bstains?\b/i],
    [/\bcrumbs?\b/gi, 'everyday mess', /\bcrumbs?\b/i],
    [/\ball the corners\b/gi, 'the areas that need attention', /\ball the corners\b/i],
  ];

  replacements.forEach(([pattern, replacement, allowedPattern]) => {
    if (!allowedPattern.test(lowerUserContent)) {
      cleaned = cleaned.replace(pattern, replacement);
    }
  });

  cleaned = cleaned
    .replace(/\bthe whole car gets cleaned\b/gi, 'every area is handled')
    .replace(/\bregular wash\b/gi, 'basic car wash')
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

function getServiceAreaFromPrompt(content: string) {
  const match = content.match(/\bin\s+([a-z][a-z\s.-]{1,60})$/i);

  if (!match) {
    return '';
  }

  return match[1].replace(/[.]+$/g, '').replace(/\s+/g, ' ').trim();
}

function getServiceAreaHashtagBase(serviceArea: string) {
  const words = serviceArea
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function uniqueHashtags(hashtags: string[]) {
  return Array.from(new Set(hashtags.filter(Boolean)));
}

function getFallbackVariationMemoryText(value: unknown) {
  if (!value || typeof value !== 'object') {
    return '';
  }

  const variation = value as { caption?: unknown; title?: unknown };
  const caption = normalizeString(variation.caption);
  const title = normalizeString(variation.title);

  return `${title}\n${caption}`.toLowerCase();
}

function chooseFallbackVariation<T>(
  variations: T[],
  variationIndex?: number,
  recentCampaignsPrompt?: string
) {
  if (variations.length === 0) {
    return undefined;
  }

  const recentText = normalizeString(recentCampaignsPrompt).toLowerCase();
  const availableVariations = recentText
    ? variations.filter((variation) => {
        const variationText = getFallbackVariationMemoryText(variation);

        if (!variationText) {
          return true;
        }

        const meaningfulLines = variationText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 24);

        return !meaningfulLines.some((line) => recentText.includes(line));
      })
    : variations;

  const usableVariations =
    availableVariations.length > 0 ? availableVariations : variations;

  if (typeof variationIndex === 'number' && Number.isFinite(variationIndex)) {
    const safeIndex = Math.abs(Math.floor(variationIndex));

    return usableVariations[safeIndex % usableVariations.length] || usableVariations[0];
  }

  return (
    usableVariations[Math.floor(Math.random() * usableVariations.length)] ||
    usableVariations[0]
  );
}

function getVaguePromptOnlyMobileDetailingFallback(content: string, variationIndex?: number, recentCampaignsPrompt?: string) {
  const trimmedContent = normalizeString(content);
  const lowerContent = trimmedContent.toLowerCase();

  if (!/mobile\s+detail|detailing|car\s+detail|auto\s+detail/.test(lowerContent)) {
    return null;
  }

  const hasSpecificDetails =
    /\b(interior|exterior|inside|outside|wash|wax|ceramic|paint correction|engine|headlight|suv|truck|sedan|pet hair|stain|stains|seat|seats|carpet|mat|mats|monthly|maintenance|before|after|photo|photos|video|clip|dirty|fleet|luxury|boat|rv)\b/.test(
      lowerContent
    );

  const wordCount = lowerContent.split(/\s+/).filter(Boolean).length;

  if (hasSpecificDetails || wordCount > 8) {
    return null;
  }

  const serviceArea = getServiceAreaFromPrompt(trimmedContent);
  const areaText = serviceArea ? ` in ${serviceArea}` : '';
  const serviceAreaHashtagBase = getServiceAreaHashtagBase(serviceArea);
  const hashtags = uniqueHashtags([
    serviceAreaHashtagBase ? `#${serviceAreaHashtagBase}Detailing` : '#MobileDetailing',
    '#MobileDetailing',
    '#CarCare',
  ]);

  const variation = chooseFallbackVariation([
    {
      title: `Mobile detailing${areaText}`,
      caption: `Still driving around saying, “I need to get this car cleaned”?\n\nMobile detailing${areaText} 🚗\n\nSkip the drop-off and the waiting around.

DM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Car cleaning still sitting on your to-do list?\n\nMobile detailing${areaText} 🚗\n\nSkip the shop visit and get it handled.

DM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Need the car cleaned before the week gets busy?\n\nMobile detailing${areaText} 🚗\n\nSave yourself the trip to a shop.

DM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `If getting the car cleaned keeps getting pushed back, this is your reminder.\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Need the car cleaned but don’t want to spend part of your day at a shop?\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `If you notice the car needs a clean every time you get in, this is your sign.\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Busy week and the car still needs to get cleaned?\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `If you keep saying you’ll clean the car this weekend, I can help you get it off the list.\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Been meaning to get the car cleaned?\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `Driving around with “clean the car” still on your list?\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `One less thing to handle this week: get the car cleaned.\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
    {
      title: `Mobile detailing${areaText}`,
      caption: `If the car keeps ending up at the bottom of your to-do list, let’s get it handled.\n\nMobile detailing${areaText} 🚗\n\nDM CAR and I’ll send pricing.`,
      dmReply:
        'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
    },
  ], variationIndex, recentCampaignsPrompt);

  const replyVariation = chooseFallbackVariation(
    [
      'Hey! Do you know what type of service you’re interested in, or are you still deciding?',
      'Hey! Are you looking for a specific service, or are you still figuring out what you need?',
      'Hey! Tell me what you’re thinking and I’ll point you in the right direction.',
      'Hey! Do you already know what you want done, or are you still deciding?',
      'Hey! Do you know what type of service you are interested in, or are you still deciding?',
      'Hey! What service are you leaning toward?',
    ],
    variationIndex
  );

  return {
    title: variation?.title || `Mobile detailing${areaText}`,
    cta: 'CAR',
    hashtags,
    caption: variation?.caption || '',
    dmReply: replyVariation || variation?.dmReply || '',
  };
}


function getVaguePromptOnlyLashRefillFallback(content: string, variationIndex?: number, recentCampaignsPrompt?: string) {
  const trimmedContent = normalizeString(content);
  const lowerContent = trimmedContent.toLowerCase();

  if (!/lash|lashes/.test(lowerContent) || !/refill|fill|appointment reminder|reminder/.test(lowerContent)) {
    return null;
  }

  const hasSpecificDetails =
    /\b(2 weeks|3 weeks|4 weeks|two weeks|three weeks|four weeks|classic|hybrid|volume|mega|full set|foreign fill|price|discount|opening|openings|available|today|tomorrow|this week|next week|booked|policy|deposit)\b/.test(
      lowerContent
    );

  const wordCount = lowerContent.split(/\s+/).filter(Boolean).length;

  if (hasSpecificDetails || wordCount > 8) {
    return null;
  }

  const variation = chooseFallbackVariation([
    {
      title: 'Lash refill reminder',
      caption: `If your lashes are starting to feel grown out, this is your reminder to check in.\n\nLash refill reminder ✨\n\nTell me when your last appointment was and what you want your set to look like next.

DM REFILL and I’ll help you figure out what to book.`,
      dmReply: 'Hey! When was your last lash appointment?',
    },
    {
      title: 'Lash refill reminder',
      caption: `Not sure if it’s refill time or time for something new?\n\nLash refill reminder ✨\n\nTell me when your last appointment was and what you want your lashes to look like next.

DM REFILL and I’ll help you figure out what to book.`,
      dmReply: 'Hey! When was your last lash appointment?',
    },
    {
      title: 'Lash refill reminder',
      caption: `If your set is starting to feel grown out, send a quick message before guessing what to book.\n\nLash refill reminder ✨\n\nTell me when your last appointment was and what look you want next.

DM REFILL.`,
      dmReply: 'Hey! When was your last lash appointment?',
    },
  ], variationIndex, recentCampaignsPrompt);

  return {
    title: variation?.title || 'Lash refill reminder',
    cta: 'REFILL',
    hashtags: ['#lashrefill', '#lashappointment', '#lashreminder'],
    caption: variation?.caption || '',
    dmReply: variation?.dmReply || '',
  };
}


function getPromptOnlyReadyPostOverride(content: string, variationIndex?: number, recentCampaignsPrompt?: string) {
  const trimmedContent = normalizeString(content);
  const lowerContent = trimmedContent.toLowerCase();
  const serviceArea = getServiceAreaFromPrompt(trimmedContent);
  const areaText = serviceArea ? ` in ${serviceArea}` : '';
  const serviceAreaHashtagBase = getServiceAreaHashtagBase(serviceArea);
  const cleaningHashtags = uniqueHashtags([
    serviceAreaHashtagBase ? `#${serviceAreaHashtagBase}Cleaning` : '#HomeCleaning',
    '#HouseCleaning',
    '#CleaningQuote',
  ]);

  if (/cleaning|home\s+clean|house\s+clean|room\s+clean/.test(lowerContent)) {
    const variation = chooseFallbackVariation([
      {
        title: `Home cleaning${areaText}`,
        caption: `House starting to feel like a lot?\n\nHome cleaning${areaText} 🧼\n\nI help with the rooms you keep putting off.

DM QUOTE and tell me what area you want help with.`,
        dmReply: 'Hey! What area are you looking to have cleaned?',
      },
      {
        title: `Home cleaning${areaText}`,
        caption: `Which room keeps getting pushed off?\n\nHome cleaning${areaText} 🧼\n\nI help with the cleaning that’s been sitting on your list.

DM QUOTE and tell me what area you want help with.`,
        dmReply: 'Hey! What area are you looking to have cleaned?',
      },
      {
        title: `Home cleaning${areaText}`,
        caption: `Need help getting the house back in order?\n\nHome cleaning${areaText} 🧼\n\nTell me which area you want help with.

DM QUOTE.`,
        dmReply: 'Hey! What area are you looking to have cleaned?',
      },
    ], variationIndex, recentCampaignsPrompt);

    return {
      title: variation?.title || `Home cleaning${areaText}`,
      cta: 'QUOTE',
      hashtags: cleaningHashtags,
      caption: variation?.caption || '',
      dmReply: variation?.dmReply || '',
    };
  }

  if (/landscap|lawn|yard care|yard cleanup|garden service/.test(lowerContent)) {
    const landscapingHashtags = uniqueHashtags([
      serviceAreaHashtagBase ? `#${serviceAreaHashtagBase}Landscaping` : '#Landscaping',
      '#LawnCare',
      '#YardCare',
    ]);

    const variation = chooseFallbackVariation([
      {
        title: `Landscaping${areaText}`,
        caption: `Does the yard keep getting pushed to next weekend?

Landscaping${areaText} 🌿

DM QUOTE and tell me what part of the yard you want help with.`,
        dmReply: 'Hey! What part of the yard are you looking to have worked on?',
      },
      {
        title: `Landscaping${areaText}`,
        caption: `Is the yard starting to feel like more than you want to handle?

Landscaping${areaText} 🌿

DM QUOTE and tell me what kind of help you need.`,
        dmReply: 'Hey! What kind of yard work are you looking for help with?',
      },
      {
        title: `Landscaping${areaText}`,
        caption: `Been meaning to get the yard cleaned up?

Landscaping${areaText} 🌿

DM QUOTE and tell me what part of the yard you want help with.`,
        dmReply: 'Hey! Is this for the front yard, backyard, or both?',
      },
    ], variationIndex, recentCampaignsPrompt);

    return {
      title: variation?.title || `Landscaping${areaText}`,
      cta: 'QUOTE',
      hashtags: landscapingHashtags,
      caption: variation?.caption || '',
      dmReply: variation?.dmReply || '',
    };
  }

  if (/pet\s+groom|dog\s+groom|cat\s+groom|grooming|dog\s+wash|pet\s+wash/.test(lowerContent)) {
    const petHashtags = uniqueHashtags([
      serviceAreaHashtagBase ? `#${serviceAreaHashtagBase}PetGrooming` : '#PetGrooming',
      '#DogGrooming',
      '#PetCare',
    ]);

    const variation = chooseFallbackVariation([
      {
        title: `Pet grooming${areaText}`,
        caption: `Is your pet starting to look ready for a cleanup?

Pet grooming${areaText} 🐾

DM GROOM and tell me what kind of grooming you’re looking for.`,
        dmReply: 'Hey! What kind of pet is this for, and what kind of grooming are you looking for?',
      },
      {
        title: `Pet grooming${areaText}`,
        caption: `Been meaning to schedule your pet’s next grooming?

Pet grooming${areaText} 🐾

DM GROOM and tell me what you need help with.`,
        dmReply: 'Hey! What kind of grooming service are you looking for?',
      },
      {
        title: `Pet grooming${areaText}`,
        caption: `If grooming keeps getting pushed to next week, this is your reminder.

Pet grooming${areaText} 🐾

DM GROOM and tell me about your pet.`,
        dmReply: 'Hey! What kind of pet is this for, and what service are you interested in?',
      },
    ], variationIndex, recentCampaignsPrompt);

    return {
      title: variation?.title || `Pet grooming${areaText}`,
      cta: 'GROOM',
      hashtags: petHashtags,
      caption: variation?.caption || '',
      dmReply: variation?.dmReply || '',
    };
  }

  return null;
}

type MediaCaptionRewriteResponse = {
  caption?: string;
};

function normalizeForComparison(value: unknown) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isTooSimilarToRecentCampaign(caption: unknown, reply: unknown, recentCampaigns: unknown) {
  const normalizedCaption = normalizeForComparison(caption);
  const normalizedReply = normalizeForComparison(reply);
  if (!Array.isArray(recentCampaigns)) {
    return false;
  }
  return recentCampaigns.some((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    const entry = item as { caption?: unknown; reply?: unknown };
    const recentCaption = normalizeForComparison(entry.caption);
    const recentReply = normalizeForComparison(entry.reply);
    const captionMatch = Boolean(
      normalizedCaption &&
        recentCaption &&
        (normalizedCaption === recentCaption ||
          normalizedCaption.slice(0, 60) === recentCaption.slice(0, 60))
    );
    const replyMatch = Boolean(
      normalizedReply &&
        recentReply &&
        (normalizedReply === recentReply ||
          normalizedReply.slice(0, 40) === recentReply.slice(0, 40))
    );
    return captionMatch || replyMatch;
  });
}

async function rewriteRepeatedContent(params: {
  apiKey: string;
  originalPrompt: string;
  currentCaption: string;
  currentReply: string;
  cta: string;
  voice: string;
  businessContext: string;
  recentCampaignsPrompt: string;
}) {
  try {
    const promptLines: string[] = [];
    promptLines.push('Rewrite the caption and DM reply below because they are too similar to a recent post.');
    promptLines.push('Recent saved campaigns to avoid matching:');
    promptLines.push(params.recentCampaignsPrompt);
    promptLines.push('Original request:');
    promptLines.push(params.originalPrompt);
    promptLines.push('Business context:');
    promptLines.push(params.businessContext);
    promptLines.push('Requested voice: ' + (params.voice || 'natural'));
    promptLines.push('Current caption:');
    promptLines.push(params.currentCaption);
    promptLines.push('Current DM reply:');
    promptLines.push(params.currentReply);
    promptLines.push('CTA keyword or instruction: ' + (params.cta || 'Use one simple, low-pressure next step.'));
    promptLines.push('Requirements:');
    promptLines.push('- Return valid JSON only: {"caption": "...", "reply": "..."}.');
    promptLines.push('- Both the caption and the reply must use a genuinely different opening, structure, and wording than the recent campaigns shown above.');
    promptLines.push('- Keep the same underlying facts about the business, but change how they are expressed.');
    promptLines.push('- Do not use markdown.');
    const rewritePrompt = promptLines.join('\n');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + params.apiKey },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'system', content: 'You rewrite a caption and DM reply so they sound genuinely different from recent posts. Return valid JSON only.' },
          { role: 'user', content: rewritePrompt },
        ],
        max_completion_tokens: 2000,
        reasoning_effort: 'minimal',
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      return null;
    }
    const parsed = JSON.parse(messageContent);
    if (typeof parsed?.caption === 'string' && typeof parsed?.reply === 'string') {
      return { caption: parsed.caption, reply: parsed.reply };
    }
    return null;
  } catch (error) {
    console.warn('Repeated content rewrite warning:', error);
    return null;
  }
}

async function runGroundingCheckOnce({
  apiKey,
  originalPrompt,
  caption,
  dmReply,
  uploadedImages,
}: {
  apiKey: string;
  originalPrompt: string;
  caption: string;
  dmReply: string;
  uploadedImages: UploadedImage[];
}): Promise<{ hasViolation: boolean; violationNotes: string } | null> {
  try {
    const verifyPrompt = `
You are a strict fact-checker reviewing a social media caption and DM reply for a local service business, written from an uploaded photo.

Your ONLY job: find any claim about the business's policies, practices, routines, process, pricing approach, or promises (e.g. how quotes are calculated, when inspections happen, what determines price, claims about honesty or "no surprises"/"no guesswork"/"no hidden fees", habitual actions like "I always" or "we start by") that the business owner did NOT explicitly state in their own words below and that is NOT clearly, unambiguously visible in the photo.

This includes indirect or reworded versions of the same idea, not just exact phrases - for example "skip the guesswork", "straightforward pricing", "I don't surprise customers", "I rinse X first so Y" are all violations if the user never said them.

ALSO flag any invented diagnostic test, method, or technique the caption claims the business uses to assess the item or decide next steps (e.g. spraying water to see if it beads or clings, checking how something reacts to touch or light, any "if X then Y" diagnostic the user never described). These are just as fabricated as invented policies, even when they sound plausible or technical.

ALSO flag any invented customer request, feedback, complaint, or statement (e.g. "customers asked for...", "clients love how...", "someone said...", "people always tell us...") that the business owner did not state in their original input. This is fabricated even when it sounds like a plausible, common customer request - the business owner never said a customer asked for it, so it must not be claimed as a customer's words or wish.

ALSO flag any meta-narration where the caption describes the photo as an object from outside it, rather than reading as the post itself (e.g. "this photo shows...", "in this image...", "pictured here is...", "this was taken...", "here's a look at...", "here we're..."). This includes indirect versions, not just exact phrases - any construction that frames the caption as commentary ABOUT a picture rather than the actual post a business owner would write. A real owner captions the moment or result directly; they don't describe a photograph of it.

Owner's original input:
${originalPrompt || '(no additional text provided)'}

Caption to check:
${caption}

DM reply to check:
${dmReply || '(none provided)'}

Return valid JSON only. If there are NO violations, return exactly: {"has_violation": false}

If there IS a violation, return: {"has_violation": true, "violation_notes": "quote the exact offending phrase(s) from the caption/DM reply and briefly say why each is fabricated"}
`.trim();
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a precise fact-checking editor. Always return valid JSON only.',
            },
            {
              role: 'user',
              content: uploadedImages.length
                ? [
                    { type: 'text', text: verifyPrompt },
                    ...uploadedImages.map((image) => ({
                      type: 'image_url',
                      image_url: { url: image.dataUrl },
                    })),
                  ]
                : verifyPrompt,
            },
          ],
          max_completion_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      }
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      return null;
    }
    const parsedResult = JSON.parse(messageContent) as {
      has_violation?: boolean;
      violation_notes?: string;
    };
    return {
      hasViolation: !!parsedResult.has_violation,
      violationNotes: parsedResult.violation_notes || '',
    };
  } catch (error) {
    console.warn('runGroundingCheckOnce warning:', error);
    return null;
  }
}

async function rewriteGroundedCaption({
  apiKey,
  originalPrompt,
  caption,
  dmReply,
  uploadedImages,
  violationNotes,
}: {
  apiKey: string;
  originalPrompt: string;
  caption: string;
  dmReply: string;
  uploadedImages: UploadedImage[];
  violationNotes: string;
}): Promise<{ caption: string; dmReply: string } | null> {
  try {
    const rewritePrompt = `
You are editing a social media caption and DM reply for a local service business to remove fabricated claims.

A fact-checker found the following problem(s) with this content:
${violationNotes || 'Contains an unstated claim about business policy, routine, or process.'}

Owner's original input:
${originalPrompt || '(no additional text provided)'}

Caption:
${caption}

DM reply:
${dmReply || '(none provided)'}

Rewrite ONLY the offending portion(s) so the caption and DM reply describe just what is visible in the photo or what the owner actually said. Keep everything else (tone, CTA keyword, structure, length) unchanged. Prefer a general truthful phrase over removing the line entirely. Grammar must stay natural - do not produce broken or awkward phrasing to force out a fabricated detail.

If the flagged phrase uses a first-person or collective ownership framing ("I prefer...", "I always...", "we start by...", "what I love about...", "our approach is..."), you must remove that framing entirely, not just swap out the claim inside it. For example, "I prefer giving quotes based on X" is STILL a violation even if X is now truthful - the fix is to drop "I prefer" and state the fact plainly instead (e.g. "Quotes are based on X" or simply describe what's in the photo). Keeping the "I prefer/I always" sentence shape and only changing its object is not a valid fix.

Before returning, double-check your own rewritten caption and DM reply against ALL of the following, not just the flagged issue above: they must not still contain the flagged phrase(s) or framing, must not contain the same type of fabricated claim reworded differently, and must not introduce a NEW problem while fixing the old one - especially meta-narration ("this photo shows...", "here's a look at...", "this was taken...", "in this image..."). When removing a flagged phrase, replace it with something the caption itself would naturally say (a direct statement, a question, a CTA line) - never with a description of the photograph as a fallback, even as a "safe" neutral option.

Return valid JSON only: {"caption": "...", "dm_reply": "..."}
`.trim();
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          messages: [
            {
              role: 'system',
              content:
                'You are a precise editor who removes fabricated claims while preserving voice, tone, and structure. Always return valid JSON only.',
            },
            {
              role: 'user',
              content: uploadedImages.length
                ? [
                    { type: 'text', text: rewritePrompt },
                    ...uploadedImages.map((image) => ({
                      type: 'image_url',
                      image_url: { url: image.dataUrl },
                    })),
                  ]
                : rewritePrompt,
            },
          ],
          max_completion_tokens: 1200,
          response_format: { type: 'json_object' },
        }),
      }
    );
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) {
      return null;
    }
    const parsedResult = JSON.parse(messageContent) as {
      caption?: string;
      dm_reply?: string;
    };
    if (!parsedResult.caption) {
      return null;
    }
    return {
      caption: parsedResult.caption,
      dmReply: parsedResult.dm_reply || dmReply,
    };
  } catch (error) {
    console.warn('rewriteGroundedCaption warning:', error);
    return null;
  }
}

async function verifyCaptionIsGrounded({
  apiKey,
  originalPrompt,
  caption,
  dmReply,
  uploadedImages,
}: {
  apiKey: string;
  originalPrompt: string;
  caption: string;
  dmReply: string;
  uploadedImages: UploadedImage[];
}): Promise<{ caption: string; dmReply: string } | null> {
  const args = { apiKey, originalPrompt, caption, dmReply, uploadedImages };
  const [first, second] = await Promise.all([
    runGroundingCheckOnce(args),
    runGroundingCheckOnce(args),
  ]);

  const flagged = [first, second].filter((r) => r?.hasViolation);
  if (flagged.length === 0) {
    return null;
  }

  const violationNotes = flagged
    .map((r) => r?.violationNotes)
    .filter(Boolean)
    .join(' | ');

  return rewriteGroundedCaption({
    apiKey,
    originalPrompt,
    caption,
    dmReply,
    uploadedImages,
    violationNotes,
  });
}

async function rewriteWeakMediaCaption({
  apiKey,
  originalPrompt,
  currentCaption,
  cta,
  voice,
  businessContext,
  uploadedImages,
}: {
  apiKey: string;
  originalPrompt: string;
  currentCaption: string;
  cta: string;
  voice: string;
  businessContext: string;
  uploadedImages: UploadedImage[];
}) {
  let captionToRewrite = currentCaption;
  const postType = inferMediaCaptionPostType(originalPrompt);
  const postTypeGuidance =
    getMediaCaptionPostTypeGuidance(postType);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const rewritePrompt = `
Rewrite only the social-media caption below.

The current opening failed because it sounds generic, formulaic, or like an inventory of what is visible.

Original request:
${originalPrompt}

Business context:
${businessContext}

Requested voice:
${voice || 'natural'}

Current caption:
${captionToRewrite}

CTA keyword or instruction:
${cta || 'Use one simple, low-pressure next step.'}

Best-fitting post type:
${postType.replaceAll('_', ' ')}

Post-type structure:
${postTypeGuidance}

Requirements:
- Return valid JSON only: {"caption": "..."}.
- Use the post type only to guide the structure. Do not name the post type in the caption.
- Write 1-3 short, natural sentences. Add one separate CTA line only when useful.
- The first line must sound like a real business owner speaking to a client.
- Base the opening on a real preference, decision, contrast, small story, honest opinion, or customer question that fits these specific images.
- Do not start with generic praise, "Okay", "I am obsessed", "Loving this", "Can we talk about", "Look at this", "When you want", "For the person who", "POV", or a polished marketing headline.
- Do not invent a client preference, client story, or phrases such as "Some clients want..." unless the user supplied that information.
- Avoid polished marketing clichés such as "tell a story", "unique touch", "stands out", "fresh look", "perfect balance", "one-of-a-kind", or "without overwhelming the design".
- Do not begin by listing colors, shapes, products, tools, rooms, vehicle parts, flowers, finishes, or other visible details.
- Do not use phrases like "This set mixes", "This features", "This includes", "The flowers add", or "You can see".
- Mention no more than two visual details.
- Do not invent prices, availability, guarantees, client history, service details, or outcomes.
- Do not invent a pre-quote inspection, routine, habit, or process the business owner did not state (examples to avoid: "I always start by", "we do a quick inspection", "before we quote", "to avoid unexpected add-ons", "hidden dirt/grime", "so your estimate is accurate"). Describe only the visible result or a simple, generic next step.
- End with one simple, low-pressure CTA using the provided CTA when possible.
- Do not use markdown.
- Make this caption specific enough that it could not be pasted onto dozens of unrelated posts.
${attempt > 1 ? '- The previous rewrite still failed the human-opening check. Use a completely different opening structure.' : ''}
`.trim();

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
              {
                role: 'system',
                content:
                  'You rewrite one social-media caption so it sounds natural, specific, and human. Return valid JSON only.',
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: rewritePrompt,
                  },
                  ...uploadedImages.map((image) => ({
                    type: 'image_url',
                    image_url: {
                      url: image.dataUrl,
                    },
                  })),
                ],
              },
            ],
            max_completion_tokens: 1600,
            reasoning_effort: 'minimal',
            response_format: { type: 'json_object' },
          }),
        }
      );

      if (!response.ok) {
        console.warn(
          'Media caption rewrite warning:',
          await response.text()
        );
        return null;
      }

      const data = await response.json();
      const messageContent = data.choices?.[0]?.message?.content;

      if (!messageContent) {
        return null;
      }

      const parsedRewrite = JSON.parse(
        messageContent
      ) as MediaCaptionRewriteResponse;

      let rewrittenCaption = cleanInvisibleMakeMyPostLine(
        normalizeString(parsedRewrite.caption)
      );

      const cleanedCta = cleanInvisibleMakeMyPostCta(cta);

      if (
        rewrittenCaption &&
        cleanedCta &&
        !hasNaturalMakeMyPostCta(rewrittenCaption)
      ) {
        rewrittenCaption = `${rewrittenCaption}\n\n${cleanedCta}`;
      }

      if (
        rewrittenCaption &&
        !needsHumanMediaCaptionRewrite(rewrittenCaption)
      ) {
        return rewrittenCaption;
      }

      captionToRewrite = rewrittenCaption || captionToRewrite;
    } catch (error) {
      console.warn('Media caption rewrite warning:', error);
      return null;
    }
  }

  return null;
}

const ipHits = new Map<string, { count: number; day: string }>();

export async function POST(req: Request) {
  const { userId } = await auth();
  const cookieStore = await cookies();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const ipDay = new Date().toISOString().slice(0, 10);
  const ipEntry = ipHits.get(clientIp);
  if (ipEntry && ipEntry.day === ipDay && ipEntry.count >= 30) {
    return NextResponse.json(
      {
        error:
          'Daily generation limit reached from this network. Please try again tomorrow.',
      },
      { status: 429 }
    );
  }
  ipHits.set(clientIp, {
    day: ipDay,
    count: ipEntry && ipEntry.day === ipDay ? ipEntry.count + 1 : 1,
  });
  if (ipHits.size > 5000) {
    for (const [k, v] of ipHits) {
      if (v.day !== ipDay) ipHits.delete(k);
    }
  }
  let generationsUsed = 0;
  let isProUser = false;
  if (!userId) {
    if (cookieStore.get('elua_guest_used')) {
      return NextResponse.json(
        { error: 'You used your free guest post. Create a free account to get 5 more.' },
        { status: 401 }
      );
    }
    cookieStore.set('elua_guest_used', '1', {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  } else {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    generationsUsed =
      (clerkUser.privateMetadata?.generationsUsed as number) || 0;
    isProUser = clerkUser.privateMetadata?.isPro === true;
    if (!isProUser && generationsUsed >= 5) {
      return NextResponse.json(
        { error: 'You have used all 5 free generations. Upgrade to Pro to continue.' },
        { status: 403 }
      );
    }
    await clerk.users.updateUserMetadata(userId, {
      privateMetadata: { generationsUsed: generationsUsed + 1 },
    });
  }

  try {
    const {
      content,
      selectedVoice,
      goal,
      generationMode,
      selectedOutputs,
      businessProfile,
      recentCampaigns,
      fallbackVariationIndex,
      uploadedImages,
    } = await req.json();

    const normalizedFallbackVariationIndex =
      typeof fallbackVariationIndex === 'number' &&
      Number.isFinite(fallbackVariationIndex)
        ? Math.max(0, Math.floor(fallbackVariationIndex))
        : undefined;

    const normalizedUploadedImages = normalizeUploadedImages(uploadedImages);
    const hasUploadedImages = normalizedUploadedImages.length > 0;
    const hasUploadedVideoFrames = normalizedUploadedImages.some(
      (image) => image.sourceType === 'video_frame'
    );
    const uploadedVisualSummary = normalizedUploadedImages
      .map((image, index) => {
        const sourceLabel =
          image.sourceLabel || image.sourceName || image.name || `visual ${index + 1}`;

        return `- Visual ${index + 1}: ${
          image.sourceType === 'video_frame'
            ? `video frame from ${sourceLabel}`
            : `photo ${sourceLabel}`
        }`;
      })
      .join('\n');

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content idea is required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY in environment variables.' },
        { status: 500 }
      );
    }

    const mode = generationMode || 'growth_system';

    const allowedContentOutputs = [
      'Instagram Reel',
      'Instagram Carousel',
      'TikTok Script',
      'LinkedIn Post',
      'Facebook Post',
      'YouTube Shorts Script',
    ];

    const requestedContentOutputs =
      Array.isArray(selectedOutputs) && selectedOutputs.length > 0
        ? selectedOutputs.filter((output) =>
            allowedContentOutputs.includes(output)
          )
        : ['Instagram Carousel', 'Facebook Post'];

    const finalContentOutputs =
      requestedContentOutputs.length > 0
        ? requestedContentOutputs
        : ['Instagram Carousel', 'Facebook Post'];

    const contentJsonShape = finalContentOutputs
      .map((output) => `    "${output}": ""`)
      .join(',\n');

    const structuredContentEntries: string[] = [];

    if (finalContentOutputs.includes('Instagram Reel')) {
      structuredContentEntries.push(`    "Instagram Reel": {
      "scenes": [
        {
          "visual": "",
          "spoken_line": "",
          "on_screen_text": ""
        }
      ]
    }`);
    }

    if (finalContentOutputs.includes('Instagram Carousel')) {
      structuredContentEntries.push(`    "Instagram Carousel": {
      "slides": [
        {
          "slide_number": 1,
          "text": ""
        }
      ]
    }`);
    }

    const structuredContentJsonShape =
      structuredContentEntries.length > 0
        ? `{
${structuredContentEntries.join(',\n')}
  }`
        : '{}';

    const selectedOutputList = finalContentOutputs.join(', ');

    const lowercaseContent = content.toLowerCase();
    const businessProfilePrompt = formatBusinessProfileForPrompt(businessProfile);
    const recentCampaignsPrompt = formatRecentCampaignsForPrompt(recentCampaigns);
    const freshCampaignInstruction = formatFreshCampaignInstruction({
      content,
      businessProfilePrompt,
      recentCampaignsPrompt,
    });

    const uploadedImagePromptContext = hasUploadedImages
      ? `
UPLOADED VISUAL CONTEXT:
The user uploaded ${normalizedUploadedImages.length} visual reference(s). Analyze the actual visuals and make the post from what is visible.
This number is the number of uploaded files. A collage or split before-and-after inside one file is still one visual, not multiple photos.

${uploadedVisualSummary}

${hasUploadedVideoFrames ? '- Some uploaded visuals are frames extracted from video clips. Treat those as moments from short clips, not separate still photos.' : '- The uploaded visuals are photos.'}

Rules for uploaded visuals:
- Treat each listed visual as exactly one uploaded file. Never split panels inside a collage into separate uploaded photos.
- When exactly one photo is uploaded, production_plan.shot_order must describe one visual only. Do not invent Photo 1, Photo 2, or a carousel sequence from panels inside that file.
- Describe visible results only. Do not infer specific work performed such as edging, mowing, trimming, pressure washing, shampooing, or deep cleaning unless the user supplied it or the action itself is clearly shown.
- Choose the strongest visual to use first.
- If there are video frames, build a simple clip structure: opening visual, middle proof/detail/process moment, ending CTA.
- If there are multiple uploaded photos, order the files in the clearest carousel or post sequence. If there is one uploaded photo, use it as one visual.
- If there are both photos and video frames, use the best mix and explain the visual order clearly.
- If the selected platform is Instagram Reel, TikTok Script, or YouTube Shorts, make the output video-friendly with an opening hook, on-screen text, visual pacing, and a clear CTA.

TRADE-SPECIFIC LANGUAGE (what to ask for, not what to claim):
- For cleaning captions, prefer quote-request language: room details, home size, service area, quote request, and which rooms need attention. If a cleaning video shows vacuuming, tidying, wiping, organizing, or a room reset, call it home cleaning, living room cleaning, room reset, or cleaning in progress unless the user specifically says carpet cleaning, upholstery cleaning, deep cleaning, move-out cleaning, or another specialty service.
- For landscaping/lawn care captions, use yard-specific quote language: yard size, front yard/backyard/full yard, service requested, problem spots, service area, and preferred timing. Do not use cleaning-specific terms like rooms, home size, standard clean, deep clean, or move-out clean for landscaping.
- For mobile detailing captions, use car-specific quote language: vehicle type, interior/exterior/maintenance interest, service area, and preferred timing. Do not ask for photos unless the user provided that as part of their process.
- For beauty (nail/lash/hair) captions, prefer "next set", "next look", or "this style" over assuming "manicure", "fill", "refill", or a specific appointment type unless the user provided that context. Safer CTA phrasing: "DM DESIGN if you want help planning your next set", "DM STYLE and tell me your favorite color", or "DM BOOK with the look you want."
- For cleaning/local service CTA keywords, prefer QUOTE, CLEAN, ESTIMATE, or BOOK only when the caption clearly explains what the person should send. Never duplicate CTA keywords - write "DM QUOTE", not "DM QUOTE QUOTE".

VIDEO VS PHOTO OUTPUT FORMAT:
- For TikTok Script, Instagram Reel, or YouTube Shorts, treat uploaded photos as visual beats for a short-form video or slideshow, not a static photo carousel. production_plan.shot_order should use video language such as "Beat 1", "0-2 seconds", "Opening shot", "Detail shot", or "Final CTA shot." Do not write "Photo 1 first" for video-platform outputs.
- Every video flow should include exact on-screen text or CTA wording in at least one beat. Do not say vague phrases like "simple text overlay" without giving the exact text. Good example: "Beat 4: Final close-up with text overlay: DM DESIGN for help planning your next set."
- production_plan.audio_direction should be useful and specific: audio mood, pacing, edit rhythm, and on-screen text direction. Recommend checking the platform's own trending audio tab before posting for an algorithmic boost. Do not name copyrighted songs, artists, or trending sounds.
- Do not make voiceover the default. Most users should be able to make the post without speaking, showing their face, or recording new audio. Default video direction should use uploaded visuals, simple text overlays, natural sound, salon/shop/workspace audio if relevant, or light background music. Only suggest voiceover if the user specifically asks for voiceover, talking, narration, or spoken lines.
- Do not invent a business contact screen, booking screen, website screen, logo screen, or end card unless the user uploaded it or provided that asset. Use a simple final text overlay instead.
- For Instagram Carousel, Facebook Post, LinkedIn Post, or other photo/text outputs, do not use video language such as text overlay, audio, spoken lines, clip flow, beat, final frame, or CTA screen. Use photo order, caption, hashtags, and reply only. production_plan.shot_order should describe the photo, clip, or visual order. production_plan.what_to_film should say what uploaded visual to use first, not ask the user to film extra footage unless extra footage is optional.
- production_plan.hashtags is REQUIRED: an array of 3-6 short hashtag strings, each starting with #. Never put sentences, questions, or instructions in the hashtags field.
- The post title/concept must be a short COMPLETE phrase - never cut off mid-sentence.
- CTA keyword should usually be one simple word such as DESIGN, QUOTE, BOOK, MENU, STYLE, FIT, START, CHECK, GUIDE, or CLEAN. Do not write CTA keywords as "DM DESIGN"; use "DESIGN" or a clear sentence separately.

STRATEGY AND CONCEPT:
- strategy.core_angle should be a short, natural post title under 9 words. It should sound like a finished post title, not an instruction. Never start with "Post a", "Post this", "Create a", "Make a", "Use a", "Show a", "Show this", "Feature a", or "Highlight a". Avoid awkward terms like "booking prompt", "appointment bookings", "lead generation asset", "content asset", "conversion path", "social media post", or "carousel" unless truly needed.
  Good examples: "Pastel nails with floral detail", "Colorful mixed-design nail inspo", "Fresh manicure with soft pink detail", "Before-and-after clean home reset", "Fresh detail for a cleaner car interior".
- production_plan.concept should explain the finished post in plain language, not marketing jargon.

==============================================================
NEVER FABRICATE - the single most important rule in this prompt. Everything else here is about format; this is about trust. A business owner posts this caption under their own name, so every claim must trace back to the photo or to what the owner actually said. Check the caption against all five categories below before returning it:

1. Unseen physical conditions or substances: no salt build-up, handprints, stains, grime, scratches, wear, mess, or seasonal/situational context (winter, summer, before-an-event) unless plainly visible in the photo.
2. Invented owner preferences, habits, or routines: no "I prefer...", "I always...", "I start by...", "we always...", "what I love about...", "our approach is...", "most people..." - or any reworded version of this pattern - unless the owner actually said it. If a rewrite is needed, drop the first-person/collective framing entirely rather than swapping new content into the same sentence shape.
3. Invented customer statements: no "customers asked for...", "clients love how...", "someone said...", "people always tell us..." unless the owner said a customer said it. A plausible-sounding customer request is still fabricated if the owner didn't say it happened.
4. Invented diagnostic tests or methods: no invented technique the business claims to use to assess the item or decide next steps (e.g. spraying water to check how it beads, checking texture or reaction to touch) unless the owner described it.
5. Meta-narration: never describe the photo as an object from outside it ("this photo shows...", "in this image...", "pictured here is..."). Write the caption as the post itself - the way a real owner captions their own work - not as a description of a picture.

Also: for cleaning, landscaping, detailing, and beauty, do not invent service categories (carpet cleaning, deep clean, move-out clean), licensed/insured status, guarantees, exact pricing, exact availability, fill/refill timing, maintenance needs, product durability, or health claims (nail/lash health) unless the user provided them.

When tempted to name a specific unseen detail, use a general truthful phrase instead: "a full clean" not "removing the salt build-up"; "a tidy result" not "wiped away the handprints".

Also avoid ungrounded generic filler even when it isn't a fabrication: "perfect for any occasion", "fits every style", "for everyone", "low-maintenance", "best choice", "book now", "check this out", "don't miss out" - unless the user provided that context. Do not tell people when or where the style/service is for unless the user gave that occasion or use-case.
==============================================================

VOICE AND ENERGY - equally important as the grounding rules above, not an afterthought to them:
A caption can be 100% grounded in what's visible AND still sound like a real, confident business owner who's proud of their work. The grounding rules above are a ceiling on WHAT you can claim; they are not a reason to write flat, cautious, or form-like. Favor specific, sensory, energetic language over generic safe phrasing. Make the visible detail do the selling: color, shape, shine, texture, finish, contrast, or visible transformation - turn it into a reason someone might DM, comment, book, request a quote, ask a question, or buy. Do not merely describe the photo.

Good example (nails): "Pastel swirls, tiny flowers, polka dots, and soft color on every nail. This set is for someone who wants detail without every nail looking the same. DM DESIGN and tell me your favorite color if you want help planning your next set."
Good example (car detailing, #1): "Fresh off the lot and looking like it just rolled out of the showroom. DM QUOTE with your vehicle type and I'll get you a price."
Good example (car detailing, #2): "Wheels this clean don't happen by accident. DM QUOTE with your vehicle type and whether you want interior, exterior, or the full package - I'll get you a number fast."
Good example (car detailing, #3): "That just-detailed shine, every time. Send me your vehicle type and what you're after (interior, exterior, or both) and I'll reply with a price."
Avoid flat/form-like: "DM QUOTE with your vehicle type and service for an estimate." / "Save this if you like colorful nails with mixed designs" (unless saving is the actual goal).
Avoid category-page language entirely: "Car wash services available for cars, SUVs, and trucks" or "Need a car wash or detailing service?" describe the business in general, not this specific photo - they could be posted by any car wash anywhere and sell nothing. Anchor every caption in the specific photo and moment, the way an owner posting their own work would, never in a company or category overview.

Before returning the caption, silently check it against both sections above: (1) does every claim trace back to the photo or the owner's own words, and (2) does it sound like an owner excited to show off their work, or like a cautious intake form? If either check fails, rewrite - tightening grounding never means flattening voice, and adding energy never means inventing a claim.

The caption should be as long as needed to showcase the uploaded visual and create action, but should not become a dense paragraph. Use 2-5 short lines when helpful: showcase the visual, create desire/relevance, invite a simple next step, or start a conversation. Do not force a strict line count. production_plan.caption must be copy-paste-ready for the business owner to publish.

The caption can include "DM DESIGN" as a full instruction sentence, but production_plan.cta itself must stay one clean keyword like "DESIGN".

DM replies should feel like a real business owner responding, not a bot. Ask one simple question that moves the conversation forward.
- Do not invent anything not visible or provided by the user: prices, availability, guarantees, client outcomes, medical claims, service packages, discounts, or exact timing.
- If you are unsure what a visual shows, say it as a cautious visual observation and create a safe post angle around what the business owner can truthfully say.
`
      : mode === 'make_my_post'
        ? `
PROMPT-ONLY MAKE MY POST CONTEXT:
The user did not upload photos or video clips. Build the post from the user's short idea only.

Rules for prompt-only Make My Post:
- Do NOT invent uploaded photos, video clips, before/after visuals, close-ups, final reveals, messy/clean images, photo order, clip order, camera angles, or visual proof unless the user explicitly described those visuals.
- Do NOT write as if the user already has a before/after, close-up, or finished visual.
- production_plan.shot_order should be a simple post structure, not a fake media sequence. Use structure like: Hook, body point, CTA line, reply/follow-up.
- If no media is uploaded, do not mention photos, images, shots, clips, footage, visual proof, tools shot, van shot, before/after, close-up, final reveal, or local visual unless the user explicitly described having those visuals.
- If the selected platform is Instagram Reel, TikTok, or YouTube Shorts, you may suggest an optional simple video/text-overlay idea the user could create, but do not claim footage already exists.
- If the selected platform is Facebook Post or LinkedIn Post, write a text-first post structure only. Do not suggest camera shots or visual assets.
- For mobile detailing, cleaning, local services, home services, beauty, wellness, catering, or fitness, do not invent prices, availability, guarantees, same-day service, licensed/insured claims, packages, before/after results, or exact service details unless provided.
- For mobile detailing, do not invent service levels, package names, comparison angles, or exact service details like quick clean, full detail, shampooing carpets, polishing surfaces, cleaning vents, treating spots, cup holders, floor mats, pet hair, stains, door frames, or all corners unless the user mentions them.
- For vague prompt-only local service requests such as "mobile detailing in Irvine", do not create an educational comparison, service menu, checklist, "which service do you need", "not sure if", or "help them decide" post unless the user asks for that.
- Default vague prompt-only mobile detailing and local service captions to a short local DM post: where the service is, what the owner does, who it helps, and one simple CTA.
- Public captions should sound like a real owner posting from their phone. Avoid stiff phrases like "what needs attention", "areas need the most attention", "what would you like cleaned up", "what you'd like taken care of", "pick the right option", "right option", "next step", or "quote details".
- CTA keyword should usually be one simple word such as CAR, QUOTE, CLEAN, BOOK, DESIGN, STYLE, START, CHECK, or GUIDE. The caption can say "DM CAR" or "DM QUOTE", but production_plan.cta itself should stay one clean keyword.
- The caption should turn the short idea into a post that can start a real conversation, quote request, booking question, or DM. For vague local-service prompts, keep it short, direct, and human instead of educational.
- Reply To Send should sound like a real text reply. Ask one simple follow-up question only. Do not ask a multi-part intake-form question.
- For vague prompt-only local service posts, keep the finished caption under 55 words unless the user provided real details.
- Avoid fake-local phrases like "I’m your local", "without the hassle", "what needs the most attention", "areas need attention", "get back to you with details", "help you decide", or "pick the right option."
- Use plain owner language. Good direction: "I do mobile detailing around Irvine. DM CAR if you want a quote." Bad direction: "I’m your local mobile detailer helping car owners decide which service is right for them."
`
        : '';

    const isClothingOrEcommercePrompt =
      /clothing|fashion|apparel|streetwear|brand|ecommerce|e-commerce|product brand|drop|waitlist|launch|release/.test(
        lowercaseContent
      );

    const hasSpecificClothingProductDetails =
      /\b(jacket|hoodie|shirt|tee|t-shirt|pants|trousers|dress|skirt|denim|jeans|sneaker|sneakers|shoe|shoes|hat|hats|bag|bags|accessory|accessories|cotton|leather|wool|silk|linen|polyester|fleece|canvas|size guide|fit guide|colorway|black|white|blue|red|green|brown|pink|price|discount|preorder|bundle|limited|inventory|launch date|drop date|collection includes)\b/.test(
        lowercaseContent
      );

    const clothingEcommerceContextRules =
      isClothingOrEcommercePrompt && !hasSpecificClothingProductDetails
        ? `
IMPORTANT VAGUE CLOTHING/ECOMMERCE CONTEXT:
The user did not provide the exact product, material, fit, colorways, production process, launch date, inventory, discount, bundle, preorder terms, drop-update perk, sizing guide, or fulfillment details.

For this generation:
- Do NOT invent a product type like jacket, hoodie, tee, pants, dress, or accessory.
- Do NOT invent fabric, material, stitching, durability, softness, breathability, quality, fit testing, model try-ons, branded packaging, customer requests, previous drops, number of colorways, bundles, discounts, preorder terms, VIP access, drop-update perks, guaranteed sizing, scarcity, shipping, fulfillment, careful packing, launch urgency, or purchase access before launch.
- Do NOT use the words "exclusive", "preorder", "VIP", "guaranteed", "secure", "spots", "limited", "early access", "previous drops", "quality", "be first", "first chance", or "purchase before launch" unless the user clearly provided those exact details.
- Use product-agnostic wording: "the item", "the piece", "the product detail", "the drop", "a detail close-up", "a fit or sizing question", "a styling/use-case idea", "a color/design option", "a prep shot if available", "a waitlist reminder", "drop update", and "a product question follow-up."
- Write finished, copy-ready audience-facing content, but keep it truthful. When details are missing, turn claims into questions or filming prompts.
- Good vague examples: "Film one close-up detail from the piece and ask: What detail would help you decide before joining the waitlist?" / "Show one styling idea and ask: Would you wear it this way or style it differently?" / "Post a waitlist reminder and ask: What question do you want answered before the drop?"
- Bad vague examples: "This soft cotton jacket is designed for all-day comfort and tested on real bodies." / "Join early access before spots fill." / "Preorder now to secure your size." / "Every order is packed with care before shipping."
- Money Plan must default to waitlist signup, drop update, product question follow-up, fit/sizing question, styling question, or reminder signup. Do not create VIP upgrades, paid priority access, discounts, bundles, guaranteed size holds, preorder offers, styling consultations, or early purchase opportunities unless the user provided them.
`
        : '';

    const isCateringPrompt =
      /catering|caterer|restaurant|office lunch|party tray|party trays|birthday party|family event|family gathering|event food|event menu/.test(
        lowercaseContent
      );

    const hasSpecificCateringDetails =
      /\b(sandwich|sandwiches|salad|salads|hot meals|finger foods|dessert|desserts|vegetarian|gluten-free|kid-friendly|vegan|pickup|delivery|deliver|delivered|buffet|boxed lunch|boxed lunches|party tray|party trays|office lunch|birthday party|family gathering|guest count|guests|10-30|10–30|15-40|15–40|10-50|10–50|weekly|monthly|subscription|on-time|same-day|next-day|setup|servers|staffing)\b/.test(
        lowercaseContent
      );

    const cateringContextRules =
      isCateringPrompt && !hasSpecificCateringDetails
        ? `
IMPORTANT VAGUE CATERING/RESTAURANT CONTEXT:
The user did not provide exact menu items, dietary options, delivery terms, pickup terms, guest-count ranges, booking deadlines, freshness claims, staffing/setup services, subscription offers, or package details.

For this generation:
- Do NOT invent specific foods like sandwiches, salads, hot meals, finger foods, desserts, party trays, or boxed lunches unless the user provided them.
- Do NOT invent vegetarian, gluten-free, vegan, kid-friendly, adult-favorite, dietary coverage, dessert trays, delivery reliability, on-time delivery, exact guest-count ranges, weekly/monthly subscriptions, setup help, staff help, date-holding, or booking deadlines unless provided.
- Do NOT use claims like "stress-free", "hassle-free", "right-fit", "dependable", "reliable", "on time", "fresh delivery", "no surprises", "everyone will enjoy", or "perfect for your event" unless the user provided support.
- Use safe catering wording: "menu options", "event details", "event date", "guest count", "pickup or delivery preference", "dietary notes", "budget range if relevant", "catering menu request", "quote request", "office lunch inquiry", "family event inquiry", and "repeat catering inquiry."
- Write finished, copy-ready audience-facing content, but keep it truthful. When details are missing, ask for the detail instead of claiming the restaurant offers it.
- Good vague example: "Comment MENU or DM your event date, guest count, and pickup or delivery preference, and I’ll send the catering menu."
- Bad vague example: "We deliver fresh, on-time sandwich platters for 10–50 guests with gluten-free and kid-friendly options."
- Money Plan must default to catering menu inquiry, quote request, party tray inquiry if relevant, office lunch inquiry, family event inquiry, or repeat catering inquiry. Do not invent subscriptions, bundles, exact guest ranges, delivery guarantees, or included services.
`
        : '';

    const isLashPrompt =
      /lash|lashes|refill|full set|lash artist|extensions/.test(lowercaseContent);

    const hasSpecificLashBusinessDetails =
      /\b(2 weeks|3 weeks|4 weeks|5 weeks|two weeks|three weeks|four weeks|five weeks|classic|hybrid|volume|mega volume|wispy|cat eye|doll eye|open eye|foreign fill|removal|deposit|price|pricing|available|availability|openings|spots|policy|retention|aftercare|natural lash|lash health|lash bath|fill policy|booking policy)\b/.test(
        lowercaseContent
      );

    const lashContextRules =
      isLashPrompt && !hasSpecificLashBusinessDetails
        ? `
IMPORTANT VAGUE LASH ARTIST CONTEXT:
The user did not provide refill policy, exact timing windows, lash style menu, prices, availability, booking policy, retention claims, aftercare policy, natural lash claims, or service recommendation rules.

For this generation:
- Do NOT invent exact refill timing like 2 weeks, 3 weeks, 4 weeks, 5 weeks, "a few weeks", "regular refill period", or "recommended refill period."
- Do NOT diagnose lash condition or tell clients the artist can choose the best/right service from a photo.
- Do NOT invent natural lash health claims, lash stress claims, lash damage claims, retention claims, restoration claims, volume restoration, or medical-ish lash care benefits.
- Do NOT invent available appointments, open spots, priority booking, held spots, immediate scheduling, discounts, bundles, deposits, or appointment availability unless the user provided them.
- Do NOT use aggressive or fear-based language like "losing your lash shape", "wrong service", "costs more money", "patchy", "sparse", "damaged", "weak", "restore", "best service", or "recommend what's best."
- Use safe lash wording: "when was your last appointment?", "what do you want your set to look like?", "are you leaning refill or full set?", "ask about openings", "refill appointment inquiry", "full set appointment inquiry", "style preference", "booking question", and "appointment fit."
- Write finished, copy-ready audience-facing content, but keep it truthful. When details are missing, ask a booking question instead of making a service recommendation.
- Good vague example: "DM REFILL and tell me when your last appointment was and what you want your set to look like."
- Bad vague example: "Send me a photo and I’ll recommend the best service so you can restore volume and book today."
- Money Plan must default to refill appointment inquiry, full set appointment inquiry, appointment planner, style match question, refill timing question, or openings request. Do not invent bundles, discounts, priority booking, diagnosis-by-photo, availability, or service recommendations.
`
        : '';

    // Let the model generate clothing/ecommerce outputs instead of returning a canned fallback.
    // Safety is handled by the product-brand prompt rules and the context-specific instructions above.
    const isVagueClothingWaitlistPrompt = false;

    if (isVagueClothingWaitlistPrompt) {
      const safeContent: Record<string, string> = {};

      finalContentOutputs.forEach((output) => {
        if (output === 'Instagram Reel') {
          safeContent[output] = `Scene 1
Visual: Product close-up or teaser from the upcoming drop
Spoken Line: We are getting the next drop ready, and I want your input before we share the full details.
On-Screen Text: Next Drop Preview

Scene 2
Visual: Flat lay, detail close-up, or behind-the-scenes table
Spoken Line: Which product type do you want us to preview first?
On-Screen Text: What should we show first?

Scene 3
Visual: Founder holding a product, sample, or drop reminder graphic
Spoken Line: Comment DROP and I’ll send you the waitlist link.
On-Screen Text: Comment DROP

Scene 4
Visual: Waitlist page or comment screenshot
Spoken Line: When the drop details are ready, we’ll send them to the waitlist first.
On-Screen Text: Join the waitlist

Scene 5
Visual: Simple text overlay with the CTA
Spoken Line: Comment DROP below and tell us what you want to see in the next drop.
On-Screen Text: Comment DROP for the waitlist link`;
        } else if (output === 'Instagram Carousel') {
          safeContent[output] = `Slide 1: Next Drop Preview: Help Us Decide What To Show First

Slide 2: Which product type should we preview first?

Slide 3: What color or style would you want to see in the next drop?

Slide 4: We are collecting interest before sharing the full drop details.

Slide 5: Join the waitlist if you want the drop update when it is ready.

Slide 6: Comment DROP and I’ll send you the waitlist link.

Slide 7: After you join, reply with what you want to see first.`;
        } else if (output === 'TikTok Script') {
          safeContent[output] = `Hook: We are working on the next clothing drop, and I want your input before we share the full details.

Point 1: Tell us what product type you want to see first.

Point 2: Tell us what color or style you are hoping for.

Point 3: We will use those replies to understand what people want before the drop details are ready.

Payoff: The waitlist is where we will send the update when it is ready.

CTA: Comment DROP and I’ll send you the waitlist link.`;
        } else if (output === 'LinkedIn Post') {
          safeContent[output] = `A waitlist should do more than collect emails.

For a clothing drop, it can also help the brand understand what people actually want before the full details are ready.

The simple campaign:
Ask what product type people want to see.
Ask what color or style they are hoping for.
Invite interested people to join the waitlist.
Send the drop details when they are ready.

The goal is not to claim scarcity or invent product benefits. The goal is to turn product curiosity into a clear list of interested shoppers.

Comment DROP and I’ll send you the waitlist link.`;
        } else if (output === 'Facebook Post') {
          safeContent[output] = `We are getting the next clothing drop ready and want your input before we share the full details.

What product type, color, or style would you want to see first?

Comment DROP and I’ll send you the waitlist link so you can get the update when the drop details are ready.`;
        } else if (output === 'YouTube Shorts Script') {
          safeContent[output] = `0-3 seconds: We are getting the next clothing drop ready, and we want your input first.

3-10 seconds: Tell us what product type you want to see, what color you are hoping for, or what style you would be most excited about.

10-20 seconds: We will send the drop details to the waitlist when they are ready.

20-30 seconds: Comment DROP and I’ll send you the waitlist link.`;
        }
      });

      const structuredContent: StructuredContent = {};

      if (finalContentOutputs.includes('Instagram Reel')) {
        structuredContent['Instagram Reel'] = {
          scenes: [
            {
              visual: 'Product close-up or teaser from the upcoming drop',
              spoken_line:
                'We are getting the next drop ready, and I want your input before we share the full details.',
              on_screen_text: 'Next Drop Preview',
            },
            {
              visual: 'Flat lay, detail close-up, or behind-the-scenes table',
              spoken_line: 'Which product type do you want us to preview first?',
              on_screen_text: 'What should we show first?',
            },
            {
              visual: 'Founder holding a product, sample, or drop reminder graphic',
              spoken_line: 'Comment DROP and I’ll send you the waitlist link.',
              on_screen_text: 'Comment DROP',
            },
            {
              visual: 'Waitlist page or comment screenshot',
              spoken_line:
                'When the drop details are ready, we’ll send them to the waitlist first.',
              on_screen_text: 'Join the waitlist',
            },
            {
              visual: 'Simple text overlay with the CTA',
              spoken_line:
                'Comment DROP below and tell us what you want to see in the next drop.',
              on_screen_text: 'Comment DROP for the waitlist link',
            },
          ],
        };
      }

      if (finalContentOutputs.includes('Instagram Carousel')) {
        structuredContent['Instagram Carousel'] = {
          slides: [
            {
              slide_number: 1,
              text: 'Next Drop Preview: Help Us Decide What To Show First',
            },
            {
              slide_number: 2,
              text: 'Which product type should we preview first?',
            },
            {
              slide_number: 3,
              text: 'What color or style would you want to see in the next drop?',
            },
            {
              slide_number: 4,
              text: 'We are collecting interest before sharing the full drop details.',
            },
            {
              slide_number: 5,
              text: 'Join the waitlist if you want the drop update when it is ready.',
            },
            {
              slide_number: 6,
              text: 'Comment DROP and I’ll send you the waitlist link.',
            },
            {
              slide_number: 7,
              text: 'After you join, reply with what you want to see first.',
            },
          ],
        };
      }

      const bestPlatform = finalContentOutputs.includes('Instagram Carousel')
        ? 'Instagram Carousel'
        : finalContentOutputs[0];

      const safeResponse: GeneratedResponse = {
        mode: 'growth_system',
        strategy: {
          target_audience:
            'People who are interested in the next clothing drop but need more product details before deciding whether to follow along or join the waitlist.',
          core_angle:
            'Use a waitlist-interest campaign that asks what product type, color, or style people want to see, then collects waitlist signups before the full drop details are ready.',
          content_goal:
            'Turn product curiosity into waitlist signups by asking preference questions, sending the waitlist link, and saving interested replies for follow-up when drop details are ready.',
          hook_strategies: [
            'Ask which product type people want to see first.',
            'Ask what color or style people are hoping for.',
            'Invite interested followers to comment DROP for the waitlist link.',
          ],
          emotional_triggers: [
            'Curiosity about the next drop',
            'Wanting input before details are released',
            'Being notified when drop details are ready',
          ],
          content_style:
            'Keep the campaign simple, visual, and preference-driven. Use product previews, behind-the-scenes visuals, and direct waitlist CTAs without inventing product claims.',
          why_it_works:
            'It gives interested followers a low-pressure way to raise their hand, helps the brand learn what people want, and creates a list to notify when the drop details are ready.',
          best_platform: bestPlatform,
        },
        best_output: {
          platform: bestPlatform,
          reason:
            'This platform is the strongest fit because it can show a simple preview, ask a preference question, and drive a clear waitlist action.',
          content: safeContent[bestPlatform],
        },
        content: safeContent,
        structured_content: structuredContent,
        monetization: {
          offer_ideas: [
            'Next Drop Waitlist: collect interested shoppers before the full drop details are ready.',
            'Drop Update List: notify people who asked to see the product details first.',
            'Product Interest Follow-Up: ask interested leads what product type, color, or style they want to see.',
          ],
          lead_magnet: 'Next Drop Waitlist',
          funnel: {
            step_1:
              'Post the selected content asking what product type, color, or style people want to see.',
            step_2:
              'Use the CTA: Comment DROP and I’ll send you the waitlist link.',
            step_3:
              'When someone comments DROP, send the waitlist link and ask what they want to see first.',
          },
          cta_strategy:
            'Comment DROP and I’ll send you the waitlist link. Then ask what product type, color, or style they want to see first.',
          action_plan: [
            {
              day: 'Day 1',
              action:
                'Post the main waitlist-interest content asking what people want to see in the next drop.',
              cta: 'Comment DROP and I’ll send you the waitlist link.',
              follow_up:
                'Send the waitlist link and ask what product type, color, or style they want to see first.',
            },
            {
              day: 'Day 2',
              action: 'Reply to every comment and DM with the waitlist link.',
              cta: 'Ask: What do you want us to preview first?',
              follow_up:
                'Save common product, color, or style requests for future drop content.',
            },
            {
              day: 'Day 3',
              action:
                'Post a short reminder using a product close-up, flat lay, or behind-the-scenes visual.',
              cta: 'DM DROP for the waitlist link.',
              follow_up:
                'Ask each interested person what they are hoping to see in the drop.',
            },
            {
              day: 'Day 4',
              action:
                'Share a simple poll or question about what followers want to see first.',
              cta: 'Reply with the product type or color you want to see.',
              follow_up: 'Invite warm replies to join the waitlist.',
            },
            {
              day: 'Day 5',
              action: 'Send a waitlist reminder to people who showed interest.',
              cta: 'Join the waitlist for drop updates.',
              follow_up:
                'Let them know the drop details will be shared when they are ready.',
            },
            {
              day: 'Day 6',
              action:
                'Post one more behind-the-scenes or drop reminder graphic.',
              cta: 'Comment DROP if you want the waitlist link.',
              follow_up: 'Send the link and ask one preference question.',
            },
            {
              day: 'Day 7',
              action:
                'Review replies and identify the most requested product types, colors, or styles.',
              cta: 'Use the most common request as next week’s content angle.',
              follow_up:
                'Prepare the next post around what followers said they wanted most.',
            },
          ],
          conversion_tips: [
            'Ask one simple preference question after sending the waitlist link.',
            'Track which product types, colors, or styles get the most replies.',
            'Notify waitlist signups when the drop details are ready.',
          ],
        },
      };

      return NextResponse.json(cleanGeneratedValue(safeResponse));
    }

    const viralHooksPrompt = `
You are Elua's Master Hook Writer.

The user gives one business/content idea. Your job is to create 10 strong hooks that help them get attention without fake claims.

USER INPUT:
Content idea: ${content}
Business profile:
${businessProfilePrompt}
Recent saved campaigns:
${recentCampaignsPrompt}
Freshness instruction:
${freshCampaignInstruction}
Goal: ${goal}
Brand voice: ${selectedVoice}

Return ONLY valid JSON. Do not include markdown or explanation outside JSON.

JSON shape:
{
  "mode": "viral_hooks",
  "best_hook": {
    "hook": "",
    "reason": ""
  },
  "hooks": [
    {
      "hook": "",
      "angle": "",
      "why_it_works": ""
    }
  ]
}

Rules:
- Return exactly 10 hooks.
- Hooks should be short, specific, and scroll-stopping.
- Avoid vague hooks like "Here are tips for..." or "How to improve..."
- Do not invent numbers, results, proof, income, testimonials, or guarantees.
- Match the user's selected goal and brand voice.
- best_hook must be one of the 10 hooks.
`;

    const postAngles = [
      'DESCRIBE THE WORK: describe the visible details of the work in plain, natural language. Stay strictly to what is visible - no invented condition, process, routine, or service-delivery detail.',
      'SERVICE MOMENT: frame the post around the experience of getting this service or seeing this result, using only what is visible in the photos. No invented names, quotes, or outcomes.',
      'EDUCATIONAL TIP: teach one practical, genuinely useful tip related to what is visible (care, upkeep, choosing a style or service), then invite the DM. The tip must be general, truthful, widely-applicable advice - not a claim about this specific photo, this business, or an invented condition in the image.',
      'BEHIND THE SCENES: talk about the process, craft, or care behind the visible work, not just the finished result. Describe process only in general, truthful terms (e.g. "a full wash", "careful attention to detail") - do not invent a specific step, routine, personal preference, or condition the user did not state and that is not clearly visible.',
      'BOOKING PUSH: a direct, natural invitation to book this service, anchored on one visible detail. Stay factual - no invented availability, urgency, or discounts.',
      'ENGAGEMENT QUESTION: open with a question that makes viewers pick, compare, or react to something visible in the photos, then give the CTA. The question must reference only what is visible - no invented comparison points, conditions, or scenarios.',
    ];
    const chosenAngle =
      postAngles[Math.floor(Math.random() * postAngles.length)];
    const ctaKeywords = ['BOOK', 'QUOTE', 'INFO', 'START', 'DETAILS', 'DESIGN'];
    const chosenCtaKeyword =
      ctaKeywords[Math.floor(Math.random() * ctaKeywords.length)];
    const replyStyles = [
      'PREFERENCE QUESTION: warmly ask which style or option they are leaning toward.',
      'LOGISTICS FIRST: warmly ask for the one practical detail needed to give a price or time (size, area, date, or current state). No more than one question.',
      'NEXT STEP: thank them and give one clear, easy next step to lock in a time. No question stack.',
    ];
    const chosenReplyStyle =
      replyStyles[Math.floor(Math.random() * replyStyles.length)];
    const makeMyPostPromptExtras =
      mode === 'make_my_post'
        ? `
MAKE MY POST MODE:
TOP PRIORITY OVERRIDE: If the user gives explicit instructions in Post Details about voice, point of view, format, language, or content, those instructions override every style rule and default below. Follow them exactly, even when they conflict with the caption style guidance in this prompt.
The user is not asking for a big strategy report. They want the easiest possible ready-to-use posting pack.
${userId && businessProfilePrompt === 'No saved business profile provided.' ? `
PROFILE GUESS (required this run):
Also return a top-level "profile_guess" object with string keys businessType, services, idealClient, mainCta.
Base it only on the provided photos and the user's text. Plain owner language.
Do not invent specifics the user did not provide (no city, prices, years in business).
Keep each value short: businessType 2-4 words, services one line, idealClient one line, mainCta a few words.
` : ''}

ASSIGNED POST ANGLE (variety for repeat users - captions must never feel like the same post twice):
${chosenAngle}
- Build the caption around this assigned angle. The opening line type, caption structure, and CTA phrasing must follow the angle, and must clearly differ from the user's recent campaigns if any are provided in this prompt.
- When an assigned angle is present, adapt any fixed line-by-line caption structure below to the angle: the first line follows the angle, not always a visual description.
- Use ${chosenCtaKeyword} as the DM keyword in the caption CTA and in the dm_reply, unless it clearly does not fit this business or angle - then pick the closest natural alternative. Do not default to DESIGN.
- Write the dm_reply in this assigned style: ${chosenReplyStyle}
- Vary hashtag selection between generations: reuse at most 3 hashtags from any recent campaign, and order them differently.

Primary job:
Turn the user's real business photo description, service photo idea, before/after, client result, product photo, workspace photo, or service example into one clear post they can publish.

Important:
- If the user describes uploaded photos, visible work, a before/after, a client result, a room, a car, lashes, nails, hair, a studio, food, landscaping, or any real asset, build the post around that asset.
- When photos are provided, study them closely and build the caption around what is actually visible in them. Do not say you analyzed an image unless images are actually provided.
- If the user writes their description, Post Details, or Business Profile in a language other than English, write the caption, CTA, dm_reply, and on-screen text in that same language. Match the language the owner uses; do not translate back to English.
- Make the output practical enough that a tired solo business owner can copy it and post today.
- Do not create a long to-do list. Prefer one best post, one caption, one CTA, one follow-up reply, and one simple next step.
- production_plan.format should usually be Instagram Carousel, Instagram Reel, Facebook Post, or Photo Post depending on the selected platform.
- production_plan.concept should start with an action phrase like "Turn this photo into..." or "Post this as..."
- production_plan.what_to_film should become "what to use" when the user already has photos. Say which photo, angle, before/after, close-up, or detail should be used first.
- production_plan.shot_order should describe the order of photos/slides/clips.
- production_plan.on_screen_text should be short copy the user can place directly on the post or carousel.
- production_plan.caption must be the main copy-ready caption.
- production_plan.cta must be short and natural.
- production_plan.dm_reply must be the first message to send if someone comments or DMs.
- In the next-step / posting guidance, always include this pro checklist so the post performs like a seasoned owner posted it: tag your business location, tag any product brands visible in the photos, and add a trending audio track when posting.
- monetization.action_plan should be light and practical. It should not overwhelm the user.
- The top command center should feel like "Here is the post to make today."
- Avoid internal marketing language. Use owner language.
- Captions must sound like a real small business owner wrote them, not an AI marketer.
- The first visible caption line must earn attention immediately. Lead with recognition, curiosity, a relatable problem, a visible detail, or a timely reminder.
- Do not start with a generic business or service label when a stronger hook is available.
- The caption should sound natural when read out loud. Prefer short, direct sentences and varied sentence lengths.
- Avoid filler lines that could apply to any business. Every line should either create interest, explain the post, or move the reader toward the CTA.
- Do not repeat the same idea in the hook, service line, and CTA.
- The CTA should feel like the natural next sentence, not an advertisement added at the end.
- Avoid stiff transitions such as "whether you're", "look no further", "we've got you covered", "take the next step", "learn more", or "reach out today."
- Before returning the caption, silently ask: "Would a real owner post this from their phone without rewriting it?" If not, rewrite it more simply.
- Do not use hype phrases like "turn heads", "standout", "you won’t find anywhere else", "book now", "perfect", "flawless", "must-have", "elevate your look", "treat yourself", or "ready to slay".
- Do not invent uniqueness, quality, superiority, popularity, results, availability, discounts, or service claims that are not visible in the photo or provided by the user.
- For beauty photos, describe what is visibly in the photo in simple natural language: colors, shape, detail level, design style, finish, or appointment question.
- When the service or treatment in the photos is identifiable, you may include one genuinely useful, accurate fact about what it does or one practical tip - written like a knowledgeable owner sharing expertise, not a brochure. Keep it simple, true, and specific; never invent benefits, results, or claims.
- For cleaning/detailing/local service photos, describe the visible before/after, area, project type, or quote detail needed. Do not claim spotless, guaranteed, fast, same-day, or perfect results.
- Caption style should usually be 2-5 short lines with natural line breaks, not a big paragraph.
- Use plain language a real owner would post on Instagram or Facebook.
- Do not start Make My Post captions with "Here’s a", "Check out", "Introducing", "Looking for", "Ready for", or "Want to".
- For Instagram beauty captions, use this simple structure:
  Line 1: describe the visible details in plain language.
  Line 2: tell the viewer when to save/comment/DM.
  Line 3: give the CTA.
- Good nail caption example:
  "Pastel swirls, polka dots, tiny flowers, and a little 3D detail.
  
  Save this if you like colorful nails with mixed designs.
  
  DM DESIGN if you want help planning your next set."
- Bad nail caption example:
  "Here’s a fresh mix of pastel swirls, polka dots, and 3D flowers for your next nail set. Which design fits your style? DM DESIGN to chat about your next appointment."
- Keep captions short enough that the user can copy and post without editing.
- For multiple uploaded photos, production_plan.shot_order must clearly say the photo order AND why each file goes there. Use short lines like: "Photo 2 first — clearest full-set photo" and "Photo 1 second — best close-up detail."
- For one uploaded photo, production_plan.shot_order must describe that single visual only, such as: "Use the single before-and-after image as the Facebook post visual." Never treat panels inside one collage as separately uploaded photos.
- Do not return photo order as "Photo 1 first Photo 2 second" without reasons.
- For uploaded photos, production_plan.concept should not sound like a strategy headline. It should sound like: "Post these nail photos as a design-inspo carousel" or "Turn this before/after into a quote-request post."
- For Make My Post mode, avoid telling the user to film anything unless it is clearly optional. They already uploaded photos.
- Make My Post captions should usually be 2-4 short lines with natural spacing.
- For nail photos, write like a real nail tech: describe the visible colors, shapes, design details, texture, or vibe. Avoid generic phrases like "brighten your look", "fresh look", "unique design", "standout design", "attract clients", "questions about your next appointment", or "get a quote."
- For nail CTAs, prefer "DM DESIGN", "DM NAILS", or "Comment DESIGN." Do not say "get a quote" unless the user says they use quotes for nail work.
- For nail DM replies, sound like a real message: "Thank you! Are you thinking colorful like this, or something softer for your next set?" or "Thanks! Do you want something detailed like this or a simpler version?"
- For beauty captions, avoid claiming uniqueness or superiority. Only describe what is visible and invite a simple next step.
- For Make My Post mode, the result should feel like: photo order, caption, CTA, DM reply, and hashtags.
- For Make My Post mode, production_plan.on_screen_text must contain only 3-8 relevant hashtags as separate strings.
- Do not put carousel slide text, hook text, or post text in production_plan.on_screen_text for Make My Post mode.
- Hashtags should match the selected platform and visible content. Prefer natural niche hashtags like #nailinspo, #naildesign, #springnails, #nailtech, #nailart instead of broad spammy hashtags.
- Do not overdo hashtags. 3-8 is enough.
- For Make My Post mode, production_plan.spoken_lines can be empty unless the selected platform is a Reel, TikTok, or YouTube Short.
`
        : '';

    const growthSystemPrompt = `
You are Elua, an elite business-growth workspace for creators, small businesses, and service providers.

The user's core problem is:
"What should I post, and how does this help me make money?"

Your job is to turn one business idea into a focused, useful mini growth system:
1. A clear strategy
2. Selected platform-ready content
3. A simple path to leads, bookings, sales, or recurring revenue

Think like three experts working together:

MASTER STRATEGIST:
- Identify the most likely audience from the user's idea.
- Identify the buyer moment: awareness, consideration, decision, repeat purchase, or retention.
- Choose ONE sharp campaign angle.
- Choose ONE believable CTA.
- Make sure the whole result feels specific to the business.

MASTER CONTENT CREATOR:
- Write only the selected platform outputs.
- Make each selected output complete and ready to use.
- Make each platform feel native, not copied across platforms.
- Keep the content connected as one mini-campaign.

MASTER MONEY PLAN WIZARD:
- Connect the content to a realistic business outcome.
- Suggest practical offers the user could actually sell.
- Create a lead magnet or first step that naturally leads to the paid offer.
- Give simple follow-up actions that help turn attention into revenue.

COMMAND CENTER STYLE:
- The top result must feel like a simple weekly action plan, not a marketing strategy report.
- Write the campaign in plain owner language: what to post, what to film, what to say, what CTA to use, and how to reply.
- Avoid strategy-heavy phrases in the top result such as "capture leads", "lead capture", "conversion strategy", "buyer journey", "nurture", "campaign funnel", "positioning", or "monetization path."
- For cleaning examples, use direct sentences like: "Post a standard vs deep clean guide", "Film one messy room and one deep-clean example", "Use CTA: DM QUOTE", and "Reply by asking which rooms need attention."
- For landscaping examples, use direct sentences like: "Post a yard cleanup quote checklist", "Film the yard area or project type", "Use CTA: DM QUOTE", and "Reply by asking yard size, service needed, problem spots, and timing."
- For mobile detailing examples, use direct sentences like: "Post a mobile detailing intro", "Film the car or detail setup", "Use CTA: DM QUOTE", and "Reply by asking whether they are interested in interior, exterior, or maintenance detailing."
- The command center should be useful even if the user never opens the full plan.
- Keep production_plan.concept, production_plan.caption, production_plan.cta, production_plan.dm_reply, and production_plan.follow_up_message short, practical, and copy-ready.

USER INPUT:
Content idea: ${content}
Business profile:
${businessProfilePrompt}
Recent saved campaigns:
${recentCampaignsPrompt}
Freshness instruction:
${freshCampaignInstruction}
Goal: ${goal}
Brand voice: ${selectedVoice}
Selected platforms: ${selectedOutputList}
${makeMyPostPromptExtras}
${uploadedImagePromptContext}
${clothingEcommerceContextRules}
${cateringContextRules}
${lashContextRules}

Strategy field rules:
The Strategy tab should feel like the brain of the campaign, not a short summary.
Use the saved Business Profile when it is provided. Treat it as the user's real business context, but do not invent claims beyond it.
If the Business Profile provides a main CTA, prefer that CTA unless it conflicts with the user's current prompt.
If the Business Profile provides services, keep outputs aligned with those services instead of inventing unrelated offers.
If the Business Profile provides notes or style preferences, follow them unless the current prompt clearly overrides them.
Use Recent saved campaigns to avoid repetition. If recent campaigns are provided, do not repeat the same campaign angle, hook structure, lead magnet, CTA, Make This Post concept, or 7-day action plan pattern unless the user clearly asks to reuse it.
When recent campaigns exist, create a fresh weekly campaign angle that still fits the user's current goal and business profile.
If the user's current prompt is broad, such as "new weekly campaign", "what to post next", "what to book next", "more bookings", "more clients", or "more appointments", you MUST choose a different angle from the recent saved campaigns.
If a recent saved campaign focused on refill vs full set, do NOT create another refill vs full set decision-guide campaign unless the user explicitly asks for refill vs full set again. Choose a different lash angle such as style choice, classic vs hybrid vs volume education, appointment-readiness, aftercare, client FAQ, first-time client education, event lashes, maintenance reminder, or what to send before booking.
If a recent saved campaign focused on a color consultation mistake, do NOT create another color consultation mistake campaign unless the user explicitly asks for that. Choose a different hair angle such as goal photo prep, lived-in color expectations, gloss refresh education, maintenance questions, inspiration photo review, first appointment prep, or what to ask before booking.
If a recent saved campaign focused on a cleaning quote checklist, do NOT create another quote checklist campaign unless the user explicitly asks for that. Choose a different local-service angle such as room priority, before/after prep, service type comparison, project photos, customer FAQ, or estimate details.
Do not solve repetition by changing only the headline. The target audience, core_angle, hook_strategies, lead_magnet, Make This Post concept, platform content, and action_plan must all reflect the new angle.
Do not mention "I avoided repeating your last campaign" in the user-facing output. Just make the campaign feel fresh.

Fill strategy fields this way:
- target_audience: Describe the buyer situation, urgency, awareness level, decision moment, or service need. Do not use broad demographics.
- core_angle: Write a short, action-first headline for This Week’s Campaign. Keep it under 18 words when possible. Start with a direct action like "Post", "Make", "Film", "Share", or "Create" when it fits. Do NOT cram the audience problem, lead capture step, and paid next step into this field; those belong in content_goal, why_it_works, and the Money Plan. Good: "Post a standard vs deep clean guide." Bad: "Use a service type comparison campaign that helps homeowners identify their cleaning needs and request a quote."
- content_goal: Explain the path from attention to lead or sale. Mention what the selected content should do first, what action the audience should take next, and how that connects to the offer.
- hook_strategies: Give 3 distinct hook angles. Each should be a usable angle tied to a buyer problem, objection, mistake, decision point, or desired outcome.
- emotional_triggers: Give 3 practical buyer motivations or concerns, such as uncertainty, convenience, confidence, readiness, avoiding wasted effort, saving time, comparing options, or knowing the right next step.
- content_style: Explain how the campaign should be executed across the selected platforms. Include tone, format, and what to emphasize.
- why_it_works: Explain why this plan can turn attention into a lead, booking, consultation, quote, order, waitlist signup, or sale.
- best_platform: Choose exactly one selected platform and explain why it is the strongest platform for this campaign.

Weak Strategy style to avoid:
- "Educate the audience and build trust."
- "Create engaging content to drive leads."
- "Use helpful posts to generate interest."
- "Professional, clear, and actionable."

Strong Strategy style examples:
- "Use a seller-readiness checklist campaign to attract homeowners who are thinking about selling but feel unsure about timing, repairs, pricing, or preparation. Start with a practical carousel, capture leads with the checklist, ask about timeline and biggest concern, then guide serious replies into a Seller Readiness Review."
- "Use a fitness-obstacle campaign to attract people who miss workouts because of busy schedules, nutrition confusion, or lack of accountability. Start with a carousel that names the problem, offer a Fitness Goal Check, ask one qualifying question, then invite serious replies to a Starter Coaching Call."
- "Use a product-fit campaign to turn product curiosity into waitlist signups. Show the item, explain fit and styling use cases, invite sizing questions, then send warm replies to the early-access page."

Selected goal rules:
The user's selected goal must noticeably change the output.

If Goal is "growth":
- Prioritize audience growth, education, trust, saves, shares, repeat visibility, and helpful content.
- Use softer calls to action such as save this, comment for a checklist, reply with a question, join the list, or request a useful resource.
- The content should help the audience understand the problem before asking them to buy or book.
- Money Plan should still show a revenue path, but it should focus on nurturing interested leads rather than pushing an immediate sale.
- Action Plan should include posting helpful content, replying to comments, sending the resource, and identifying warm leads.
- Avoid overly direct booking pressure unless the user specifically asked for sales.

If Goal is "viral":
- Prioritize strong hooks, curiosity, pattern interrupts, common mistakes, myth-vs-truth, contrarian angles, surprising buyer problems, and shareable content.
- Open every selected platform output with a sharper hook than normal.
- Make the content more punchy, memorable, and likely to be saved, shared, or commented on.
- The call to action should be lighter than Sales mode, such as comment a keyword, share with someone, save this, or reply with the biggest mistake/question.
- Money Plan should connect attention to a simple lead capture step without making the post feel overly salesy.
- Action Plan should include reposting or reusing the strongest hook/angle based on comments and saves.

If Goal is "sales":
- Prioritize lead capture, qualified replies, bookings, quote requests, consultations, discovery calls, orders, waitlist signups, preorders, or paid next steps.
- Every selected platform output must include a clear business next step.
- Calls to action must be direct, copy-ready, and connected to the user's actual paid offer or sales path.
- Money Plan must be more direct and practical: what to post, what keyword to use, what resource to send, what question to ask, and what paid next step to offer.
- Action Plan should focus on turning replies into leads, leads into conversations, and conversations into bookings, orders, quotes, consultations, or sales.
- Avoid vague education-only endings.

Return ONLY valid JSON. Do not include markdown. Do not include explanations outside the JSON.

The JSON must follow this exact structure:

{
  "mode": "growth_system",
  "strategy": {
    "target_audience": "",
    "core_angle": "",
    "content_goal": "",
    "hook_strategies": ["", "", ""],
    "emotional_triggers": ["", "", ""],
    "content_style": "",
    "why_it_works": "",
    "best_platform": ""
  },
  "best_output": {
    "platform": "",
    "reason": "",
    "content": ""
  },
  "content": {
${contentJsonShape}
  },
  "structured_content": ${structuredContentJsonShape},
  "production_plan": {
    "format": "",
    "concept": "",
    "what_to_film": ["", "", ""],
    "shot_order": ["", "", "", ""],
    "transition_idea": "",
    "audio_direction": "",
    "on_screen_text": ["", "", ""],
    "spoken_lines": ["", "", ""],
    "caption": "",
    "hashtags": ["#example1", "#example2", "#example3"],
    "cta": "",
    "dm_reply": "",
    "follow_up_message": ""
  },
  "monetization": {
    "offer_ideas": ["", "", ""],
    "lead_magnet": "",
    "funnel": {
      "step_1": "",
      "step_2": "",
      "step_3": ""
    },
    "cta_strategy": "",
    "action_plan": [
      {
        "day": "Day 1",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 2",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 3",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 4",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 5",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 6",
        "action": "",
        "cta": "",
        "follow_up": ""
      },
      {
        "day": "Day 7",
        "action": "",
        "cta": "",
        "follow_up": ""
      }
    ],
    "conversion_tips": ["", "", ""]
  }
}

Selected platform rules:
- Generate ONLY these content keys: ${selectedOutputList}
- The content object must include exactly those selected keys and no others.
- Every selected output is mandatory.
- Never return empty strings for selected outputs.
- Do not summarize selected outputs. Write the actual content asset.
- best_output.platform must exactly match one selected platform key.
- best_output.content must contain the full strongest selected content asset.

Structured content rules:
- The content object must still contain the full copy-ready string for every selected platform.
- structured_content is optional display data for the frontend. It does not replace content.
- If Instagram Reel is selected, structured_content["Instagram Reel"].scenes must include 5-7 scene objects.
- Each Instagram Reel scene object must include visual, spoken_line, and on_screen_text.
- If Instagram Carousel is selected, structured_content["Instagram Carousel"].slides must include 6-8 slide objects.
- Each Instagram Carousel slide object must include slide_number and text.
- If neither Instagram Reel nor Instagram Carousel is selected, structured_content must be an empty object.

Make This Post / Production Plan rules:
- production_plan must help the user actually create the strongest selected content asset.
- production_plan.format must name the selected asset it is based on, such as "Instagram Reel", "TikTok Script", "Instagram Carousel", "YouTube Shorts Script", "Facebook Post", or "LinkedIn Post".
- production_plan.concept must summarize the post idea in one specific action sentence. Avoid "campaign that helps..." phrasing when a simpler "Post a..." or "Make a..." sentence would work.
- production_plan.what_to_film must include practical filming directions or asset directions, not vague strategy.
- production_plan.shot_order must tell the user what to capture or show in order.
- production_plan.transition_idea must explain the change, reveal, cut, swipe, or shift between parts of the post.
- production_plan.audio_direction must give safe audio guidance without inventing exact trending songs. Use directions like "use calm salon-style audio", "use a trending audio with a clear beat drop for the reveal", or "use low-volume voiceover with captions".
- production_plan.on_screen_text must include copy-ready text overlays, slide text, or post text.
- production_plan.spoken_lines must sound like a real business owner speaking naturally. Avoid stiff AI phrases.
- production_plan.caption must be copy-ready and should sound like a real owner wrote it, not a marketing strategist.
- The first line of production_plan.caption must sound natural, specific to this post, and like something the business owner would genuinely say to a client.
- Do not use generic reaction openings such as "Okay...", "This is way too cute", "I am obsessed", "Loving this", "Can we talk about...", "Look at this", or similar reusable praise.
- Do not use manufactured headline formulas such as "When you want...", "For the person who...", "This is what happens when...", "Ready to...", "Looking for...", or "POV".
- Do not open by inventorying visible colors, shapes, flowers, finishes, products, tools, rooms, vehicle parts, or service details.
- Choose an opening based on the actual meaning of the media: a client preference, a real decision, a useful contrast, a small story, an honest owner opinion, or a question customers genuinely ask.
- Frame the caption around the customer, not the product: what this means for them, how it could make them feel, or an invitation to imagine themselves with this result. Do not simply describe the item, finish, or technique on its own.
- The first sentence specifically must address the customer directly (you, your, imagine, picture yourself) rather than opening with a description of the item, finish, shape, or technique. Example of what to avoid: "Soft pink nails with a subtle shine." Example of the right shape: "Your nails should feel as put-together as the rest of your day."
- Vary the opening structure. Do not default to the same reaction, sentence pattern, or phrase across generations.
- After the opening, write only one or two natural context sentences. Explain the overall look, feeling, result, contrast, or why the details work together instead of cataloguing everything visible.
- Mention at most two visual details unless the user explicitly asks for a detailed description.
- Avoid inventory phrases such as "It mixes...", "This features...", "The flowers add...", "This includes...", or "You can see...".
- End with one simple, low-pressure CTA that sounds like the next sentence a real owner would write.
- The caption must earn attention in the first 0-3 seconds without sounding like a slogan, advertisement, polished headline, or AI copywriting formula.
- Before returning the caption, silently ask: "Could this opening be pasted onto dozens of unrelated posts?" If yes, rewrite it to be more specific and human.
- production_plan.cta must be copy-ready and match the Money Plan.
- production_plan.cta should use a short, natural keyword when possible. Prefer service-specific CTAs such as "DM QUOTE", "Comment QUOTE", "DM LASHES", "DM REFILL", "DM NAILS", "DM DESIGN", "Comment NAILS", "DM COLOR", or "DM CONSULT" over generic or long resource names.
- production_plan.dm_reply must be a copy-ready first reply to someone who comments, DMs, or asks for the resource.
- production_plan.follow_up_message must be a copy-ready next message after the first reply.
- For Reels, TikToks, and Shorts, include pacing, timing, transition moment, and audio direction.
- For carousels or static posts, make shot_order and on_screen_text describe slide/layout direction.
- Do not invent operational claims, exact availability, guarantees, trending song names, discounts, bundles, consultations, packages, priority booking, or service details the user did not provide.
- For beauty services, avoid overconfident or marketer-ish phrases like "book the right appointment", "pick the right service", "right-fit appointment", "right-fit", "appointment fits best", "best service", "diagnose", "lead capture", "warm leads", "conversion chances", or "I will choose for you." Use safer language like "help you decide what to ask about", "help you compare refill vs full set", "send your last appointment date", "send the look you want", or "answer your booking questions."
- For beauty services, CTAs should feel natural and low-pressure. Prefer "DM REFILL or FULL SET with your last appointment date and the look you want" over pushy lines like "DM me now to book your appointment."
- For hair color services, avoid outcome guarantees or assumption-heavy phrases like "color you love", "color you regret", "saves time and money", "perfect color", "right-fit shade", "right-fit color", "exactly what you want", "what suits you best", "shade that fits you", "skin tone", "tailored to your hair type", "personalized plan", "hair condition", "hair health", "damage", "prevents", "fixes", or "fewer surprises" unless the user provided those claims.
- For hair stylists, do not invent service length, packages, maintenance plans, treatments, product recommendations, recurring plans, exact consultation format, skin tone analysis, exact service inclusions, or exact outcome claims. Default to safe next steps like color consultation inquiry, current color question, goal photo/reference question, hair history question, booking question, or prep checklist.
- For hair color CTAs, prefer: "DM COLOR CONSULT with your current color, your goal photo, and what you want to change." Avoid "book now", "reserve your spot", "exactly what you want", or "I will pick the right shade."
- production_plan.spoken_lines should sound casual and human. Avoid exclamation-heavy sales lines, stiff template wording, and generic beauty phrases like "let's get your lashes looking fresh" unless the user wrote that style.
- This section must feel more practical than ChatGPT by telling the user exactly how to make the post.

Campaign route rules:
Before writing, silently choose ONE campaign route that best fits the user's idea.
Do not output the route name by itself. Turn it into a specific core_angle sentence.

Use varied campaign routes such as:
- First-step plan
- Common mistake
- Readiness checklist
- Buyer questions
- Myth vs truth
- Behind-the-scenes process
- Objection handling
- Story lesson
- Comparison
- Quick audit
- Decision guide
- Weekly plan

The chosen route must control:
- the hooks
- the platform content
- the CTA
- the lead magnet
- the funnel
- the money plan

Do not default to the same CTA, lead magnet, or offer style every time.

${PLATFORM_WRITING_RULES}\n\nInstagram Reel rules:
- Write a scene-by-scene filming plan.
- Include 5-7 short scenes.
- Each scene must include: Visual, Spoken Line, On-Screen Text.
- Scene 1 must be the strongest 0-3 second hook in the entire Reel.
- Scene 1 spoken_line must create immediate curiosity, tension, recognition, or a clear reason to keep watching.
- Scene 1 must not be a generic setup or explanation. Start with the sharpest buyer problem, mistake, objection, myth, or surprising insight.
- The middle scenes must give useful steps, questions, examples, or a simple process.
- The final scene must include a specific CTA.
- Keep spoken lines natural, short, and camera-ready.
- Do not use fake client names, fake outcomes, or placeholder visuals.

Instagram Carousel rules:
- Write 6-8 slides.
- Each slide must have exact slide text the audience would actually read on the carousel.
- Slide 1 must be a strong title.
- Slides 2-6 must build a useful swipe-through lesson, checklist, framework, or decision guide.
- The second-to-last slide should summarize the key takeaway.
- The final slide must include a specific CTA.
- Do not use image placeholders.
- Do not write slide planning notes or creator instructions.
- Do not write carousel slides that start with planning labels like "Week 1 - Starting Problem:", "Week 2 - Coaching Process:", "Week 3 - Consistency Obstacle:", "Week 4 - First Coaching Step:", "Key Takeaway:", or "CTA:" unless the rest of the slide is written as finished audience-facing copy.
- Bad carousel slide: "Week 1 - Starting Problem: Share how a busy schedule or no clear plan leads to inconsistent workouts."
- Good carousel slide: "Busy week? No clear plan? That is usually when workouts disappear first."
- Bad carousel slide: "Week 2 - Coaching Process: Show how a beginner-friendly plan and weekly check-ins help clients stay on track."
- Good carousel slide: "A beginner-friendly plan works better when you know exactly what to do this week, not someday."
- Do not write vague slides like "valuable insights" or "learn more."

TikTok Script rules:
- Write a fast spoken script for one person talking to camera.
- TikTok Script must be formatted as separate labeled sections exactly like this:
  Hook:
  Point 1:
  Point 2:
  Point 3:
  Payoff:
  CTA:
- Do not return TikTok Script as one paragraph.
- Each TikTok section must be short, recordable, and camera-ready.
- Hook must be 1 punchy sentence only.
- Point 1, Point 2, and Point 3 should each be 1 short spoken beat.
- Payoff should clearly explain why the viewer should care.
- CTA should be one clear action using the campaign CTA keyword.
- Keep the tone direct, useful, and conversational.
- Make it feel like something someone could record immediately without rewriting.
- The Hook must be a 0-3 second spoken line that creates immediate curiosity, tension, recognition, or a clear reason to keep watching.
- Start with the sharpest buyer problem, mistake, objection, myth, or surprising insight. Do not start with a greeting, setup, or generic explanation.
- Strong TikTok hook examples:
  "Your workouts are not failing because you are lazy. They are failing because your plan is too random."
  "If every busy week kills your workouts, motivation is not the real problem."
  "Most people do not need a harder workout plan. They need a plan they can actually repeat."
  "You do great Monday through Wednesday, then the whole week falls apart. That is the real problem."
- Strong TikTok format example:
  Hook: Your workouts are not failing because you are lazy. They are failing because your plan is too random.
  Point 1: If your schedule changes every week, your workout plan has to fit real life.
  Point 2: Most people do not need harder workouts. They need a repeatable system.
  Point 3: Weekly check-ins help catch the problem before you quit.
  Payoff: A simple plan plus accountability keeps you from starting over every Monday.
  CTA: Comment CHECK and I’ll send you the Fitness Goal Check.
- Weak TikTok style to avoid: "Hey everyone, here’s a quick tip."
- Weak TikTok style to avoid: "I’m not using private details, but..."
- Weak TikTok style to avoid: one long paragraph with all points merged together.

YouTube Shorts Script rules:
- Write a tight short-form script with clear timestamped sections.
- YouTube Shorts Script must be formatted as separate labeled sections exactly like this:
  0-3s Hook:
  4-10s Problem:
  11-17s Insight:
  18-24s Solution:
  25-30s CTA:
- Do not return YouTube Shorts Script as one paragraph.
- Each timestamped section must be short, polished, and camera-ready.
- 0-3s Hook must be the strongest line in the Short and create immediate curiosity, tension, recognition, or a clear reason to keep watching.
- 4-10s Problem should name the specific buyer problem or mistake.
- 11-17s Insight should explain the surprising or useful shift.
- 18-24s Solution should give the practical next step or framework.
- 25-30s CTA should include one clear action using the campaign CTA keyword.
- Make it more polished and educational than TikTok.
- Avoid filler and generic motivational language.
- Start with a clear educational promise, contrarian insight, buyer problem, mistake, objection, myth, or surprising insight.
- Strong YouTube Shorts format example:
  0-3s Hook: Most people do not need a harder workout plan. They need one they can repeat.
  4-10s Problem: Random workouts fall apart the second your week gets busy.
  11-17s Insight: Consistency usually comes from a simpler plan, not more motivation.
  18-24s Solution: Start with a realistic weekly plan, one habit to track, and one check-in.
  25-30s CTA: Comment CHECK and I’ll send you the Fitness Goal Check.
- Weak YouTube Shorts style to avoid: "Want the full plan?"
- Weak YouTube Shorts style to avoid: one long paragraph with all beats merged together.

LinkedIn Post rules:
- Write a finished professional post that sounds like a real founder, coach, consultant, or business owner.
- Start with a strong plain-English insight.
- Include a useful framework, lesson, example, or decision filter.
- Use short paragraphs with natural spacing.
- End with a soft but specific CTA.
- Do not write a strategy summary, outline, or numbered plan about what the user should post later.
- Do not sound like a corporate ad.
- Do not start with a question unless it is unusually specific and strong.
- Strong LinkedIn style: "Client transformations are not just proof. They are content systems when you break them into the starting problem, the coaching process, the obstacle, and the next step."
- Weak LinkedIn style to avoid: "Are you struggling with your fitness goals?"

Facebook Post rules:
- Write a community-friendly post that feels human and practical.
- Use a warm opening, helpful body, and clear next step.
- Make it suitable for a local business, coach, service provider, or community page.
- End with a specific comment or DM CTA.
- Do not sound overly polished, hypey, or corporate.
- Make the opening feel like a real small business owner talking, not a template.
- Strong Facebook style: "I’m not posting private client details, but I can still teach the process behind progress."
- Weak Facebook style to avoid: "Hey everyone!"

${TRUST_RULES}\n\n${QUALITY_RULES}\n\n${BUSINESS_RULES}\n\nOffer rules:
- Offer names should feel like real named products or services.
- Each offer idea must include: offer name, what it is, who buys it, when it fits, and why they would want it.
- Do not write visible phrases like "buyer stage", "awareness stage", "consideration stage", "decision stage", "repeat purchase stage", or "retention stage" in Money Plan offers. Use plain customer-fit language instead, such as "best for first-time clients", "best for clients comparing options", "best for repeat clients", "best for clients ready to book", or "best for clients maintaining their look."
- The AI may think about buyer stage silently, but the user-facing Money Plan should sound like a practical offer plan, not marketing strategy jargon.
- At least one offer should be a simple starter offer the user could realistically sell soon.
- The paid offers must sell the user's actual business, not the topic of the content.
- If the user is a fitness coach, the paid offers should be fitness coaching, assessments, starter plans, accountability programs, personal training, nutrition coaching, or check-in packages — not content consulting, ethical content creation, marketing services, or creator education.
- If the content angle is about how to share proof, client wins, testimonials, or transformations ethically, the lead magnet can teach that process, but the paid next step must still lead back to the user's real service.
- Do not suggest random PDFs, courses, webinars, landing pages, email sequences, discounts, or limited-time offers unless the user clearly asked for them.
- For service businesses, prefer leads, bookings, calls, quotes, consultations, audits, assessments, starter sessions, and simple packages.
- The lead magnet should be free, useful, named, and connected to the paid next step.
- Do not default to the same lead magnet name every time. The lead magnet name must match the campaign route, buyer problem, platform content, and paid offer.
- Do not use "Ethical Client-Win Checklist" as the default lead magnet name. Avoid using the word "ethical" in the lead magnet name unless the user specifically asks for ethics, compliance, legal-safe posting, or permission rules.
- Vary lead magnet names based on the situation. Prefer lead magnets that help the business owner turn attention into a real coaching/sales conversation. Examples: "Client Story Sales Planner", "Transformation Content Calendar", "Fitness Goal Conversation Starter", "Proof-to-Post Calendar", "First-Step Fitness Assessment", "Client Progress Story Planner", "Consistency Breakthrough Starter", "Coaching Conversation Starter", "Before You Post a Client Win Worksheet".
- The funnel must connect the lead magnet to the user's real paid offer.
- If the lead magnet teaches content, proof, testimonials, client wins, story prep, or safe sharing, the convert step must still invite the audience into the user's real business offer.
- For a fitness coach, the final step should be a fitness assessment, starter plan, coaching session, accountability program, personal training package, nutrition coaching offer, or transformation package.
- Do not leave the funnel ending at content education, creator education, or marketing advice.
- In funnel.step_3, do not ask whether the lead wants content help unless the user's actual business sells content help.
- For a fitness coach, funnel.step_3 should ask a fitness-related qualifying question and invite the lead to a fitness coaching next step.
- Example for a fitness coach: After they request the checklist, ask what fitness goal they are working toward, what is keeping them stuck, and invite serious replies to a Fitness Transformation Assessment or starter coaching call.
- The conversion_strategy must sell the user's actual business offer, not the lead magnet topic.
- For a fitness coach, conversion_strategy should invite people into a fitness assessment, starter coaching call, transformation plan, accountability check-in, personal training package, or nutrition coaching next step.
- For a fitness coach, do not write conversion_strategy copy like “the checklist I use before turning client wins into sales content” because that makes the paid offer sound like content/marketing help instead of fitness coaching.
- For a fitness coach, conversion_strategy must speak to the audience as potential fitness clients, not as creators. It should ask about their fitness goal, biggest obstacle, consistency/accountability needs, or readiness for coaching.
- For a fitness coach, if the lead magnet is about ethical client wins, the CTA should still transition to fitness coaching. Example: “Comment START and I’ll send you the checklist, then I’ll ask one question about your fitness goal so I can point you to the right first step.”
- Do not use phrases like “turn your own progress into content,” “content help,” “creator education,” or “sales content” in the funnel or conversion strategy unless the user's business sells content or marketing services.
- The Money Plan must never let the content topic become the paid offer.
- The lead magnet may be related to the content topic, but funnel.step_3 and conversion_strategy must move the lead toward the user's real paid service.
- monetization.lead_magnet must be more than a title. Write it as: "Name — one sentence explaining what it helps the prospect diagnose, decide, calculate, prepare, compare, or do next."
- Weak lead magnet: "Offer Clarity Checklist"
- Strong lead magnet: "Offer Clarity Checklist — a short checklist that helps freelancers spot whether their offer is unclear because of audience, outcome, pricing, proof, or next step."
- Weak lead magnet: "Fitness Goal Check"
- Strong lead magnet: "Fitness Goal Check — a quick self-check that helps busy adults identify whether time, workouts, nutrition, or accountability is the main reason they are not staying consistent."
- Weak lead magnet: "Seller Readiness Checklist"
- Strong lead magnet: "Seller Readiness Checklist — a simple checklist that helps homeowners organize timeline, prep questions, repair priorities, and next steps before a listing conversation."
- For a fitness coach using a client story, proof, or transformation-related lead magnet, funnel.step_3 should NOT ask if the lead wants to turn progress into content. It should ask what fitness goal they want help with and invite them to a fitness assessment, starter plan, coaching call, or accountability program.
- For a fitness coach, conversion_strategy should sound like: “Comment START and I’ll send the checklist. After that, I’ll ask one question about your fitness goal and point you to the right first coaching step.”
- conversion_tips should be practical follow-up actions, not vague advice.
- Each conversion_tip must include either a copy-ready message, a specific qualifying question, a decision rule, or the exact next step to offer.
- Weak conversion tip: "Follow up with interested leads."
- Strong conversion tip: "After sending the checklist, ask: 'Which part of your offer feels hardest to explain right now — who it is for, what they get, the price, or the next step?' If they answer with a real business problem, invite them to the Offer Clarity Coaching Call."

Action Plan rules:
- monetization.action_plan must include exactly 7 steps.
- Each step must include day, action, cta, and follow_up.
- The action plan must feel like a practical weekly roadmap, not generic advice.
- Day 1 should tell the user exactly what content asset to post first.
- Day 2 should tell the user exactly how to reply to comments, DMs, or early engagement.
- Day 3 should tell the user what lead magnet, checklist, assessment, quote request, starter step, or resource to send.
- Day 4 should tell the user what follow-up content to post, usually answering the strongest objection or buyer question.
- Day 5 should tell the user how to invite warm leads toward the paid next step.
- Day 6 should tell the user what second content asset, reminder, behind-the-scenes post, or proof-safe post to publish.
- Day 7 should tell the user how to review responses and reuse the strongest angle next week.
- Every cta must be copy-paste-ready.
- Every follow_up must include an exact message, question, or next step.
- Follow-up messages should sound like a real human business owner wrote them, not a template. Avoid stiff phrases like "I would like to invite you" unless they match the user's voice.
- When possible, write the follow_up as direct copy the user can paste after a comment or DM, starting with phrases like "Send this:", "Reply with:", or "DM them:".
- The action plan must connect the selected platform content, lead magnet, CTA, funnel, and real paid offer.
- Do not write generic follow-ups like "reply to comments", "engage with warm leads", "send the resource", "invite them to book", or "follow up promptly" unless paired with the exact message the user should send.
- At least 4 of the 7 follow_up fields must include copy-ready wording the user can send directly in a DM, comment reply, text, or email.
- Strong follow_up style: "Send this: 'Here’s the Fitness Goal Check. Quick question before I point you to the right first step: is your biggest obstacle time, workouts, nutrition, or accountability?'"
- Strong follow_up style: "Reply with: 'I sent it over. What is your selling timeline, and what feels most confusing before listing?'"
- Strong follow_up style: "Send this message: 'Here’s the catering menu. What date is your event, how many guests are you feeding, and do you need pickup or delivery?'"
- Weak follow_up style to avoid: "Reply to comments and answer questions."
- Weak follow_up style to avoid: "Invite warm leads to book a call."
- Weak follow_up style to avoid: "Send the checklist and follow up."
- Day 2, Day 3, and Day 5 must be especially specific because those are the conversion moments where comments, DMs, lead magnets, and paid offers connect.
- For fitness coaches, follow_up messages must ask fitness-related questions, not content/marketing questions.
- For realtors, follow_up messages must ask seller-readiness, home-value, timeline, property, or consultation questions.
- For restaurants and caterers, follow_up messages must ask event date, guest count, menu needs, budget range, pickup/delivery, or quote-request questions.
- For service businesses, follow_up messages must ask a qualifying question that leads to a call, quote, audit, consultation, assessment, or starter package.
- Do not use vague action plan steps like "engage with your audience", "build trust", "share value", "promote your offer", or "follow up with leads."
- Do not invent fake results, testimonials, urgency, discounts, or scarcity in the action plan.
- Do not use vague action plan follow-ups like "engage with comments," "keep the conversation going," "encourage participation," "adjust future content," or "refine your strategy."
- Replace vague follow-ups with exact messages, for example: "Thanks for commenting PLAN — what fitness goal are you working toward right now?"
- Days 4-7 must be as specific as Days 1-3. They must name the content topic, CTA keyword or message, and exact follow-up question.
- Action Plan steps should be realistic for a solo business owner. Do not create fake urgency, a fake launch, or vague engagement tasks.
- If the content angle is a 4-week content system, the action plan should show exactly how to use that system: post the main asset, reply to comments, send the resource, ask a qualifying question, post an objection follow-up, invite warm leads to the paid next step, and review which buyer problem got the most replies.

Money Plan output standard:
- The Money Plan must feel like a revenue operator wrote it, not a generic marketer.
- The funnel must be immediately usable this week.
- step_1 must say exactly what to post or publish.
- step_2 must include the exact call-to-action keyword or reply, written as user-facing copy. Do not write phrases like "Include the CTA." Prefer "End the post with..." or "Use this line...".
- step_3 must include the exact follow-up message, question, booking step, or consultation invite.
- cta_strategy must include copy-paste-ready wording the user can put in the post or DM. Do not use internal labels like "CTA" in the generated user-facing text.
- conversion_tips must be concrete actions, not broad advice.
- conversion_tips must not repeat the same idea in three different ways. Each tip should cover a different conversion moment: qualifying, inviting to the paid next step, and following up with non-bookers.
- The lead_magnet field must explain the resource clearly enough that the user understands what they are giving away and why a prospect would want it.
- Do not say vague phrases like "promote on social media", "encourage engagement", "collect responses", "provide value", "capture leads", "follow up with potential clients", or "create urgency".
- Do not recommend fake urgency, fake scarcity, fake discounts, fake testimonials, invented proof, or invented outcomes.

Good Money Plan style:
- Step 1: Post the Instagram Carousel about the biggest reason busy adults fall off their workouts: the plan does not match their real week.
- Step 2: End with: "Comment CHECK and I’ll send you the Fitness Goal Check."
- Step 3: When someone replies, send the Fitness Goal Check and ask: "What feels hardest right now — time, workouts, nutrition, or accountability?"
- CTA Strategy: "Comment CHECK and I’ll send you the Fitness Goal Check. After that, I’ll ask one question about what is getting in the way and point you to the right first coaching step."
- Action Plan Day 1: Post the Instagram Carousel about why busy adults need a simple weekly plan instead of random workouts. CTA: "Comment CHECK and I’ll send you the Fitness Goal Check." Follow-up: "Here’s the Fitness Goal Check. Quick question before I point you to the right first step: is your biggest obstacle time, workouts, nutrition, or accountability?"
- Action Plan Day 2: Reply to every comment or DM with the Fitness Goal Check and ask the first qualifying question. CTA: "Reply with your biggest obstacle." Follow-up: "If they mention busy schedule, missed workouts, nutrition confusion, or accountability, invite them to a Starter Fitness Assessment or Consistency Audit."
- Lead Magnet: "Fitness Goal Check — a quick self-check that helps busy adults identify whether time, workouts, nutrition, or accountability is the main reason they are not staying consistent."
- Conversion Tip: "After sending the Fitness Goal Check, ask one qualifying question: What feels hardest right now — time, workouts, nutrition, or accountability? If they mention consistency, nutrition confusion, accountability, a busy schedule, or not knowing where to start, invite them to a First-Step Fitness Assessment."
- Conversion Tip: "For people who reply but do not book, send: 'No pressure — based on what you shared, the first thing I’d fix is your weekly plan. Want me to show you what that would look like in a Starter Fitness Assessment?'"

Hard rewrite gate:
Before returning JSON, scan the entire response and rewrite any output that contains these weak phrases:
- fitness journey
- achieve your goals
- achieve their health goals
- health goals
- take the first step
- get started
- ready to transform
- unlock your potential
- stay motivated
- accountability is key
- consistency is key
- engage with your audience
- promote your offer
- contact me today
- learn more
- free consultation
- free coaching consultation
- what’s holding you back
- what are you hoping to achieve
- tailored plan
- personalized guidance
- accessible and necessary

Replace weak phrases with specific fitness-business language:
- busy schedule
- weekend eating
- inconsistent workouts
- no clear plan
- nutrition confusion
- missed check-ins
- needs accountability
- beginner-friendly plan
- first fitness assessment
- starter coaching call
- consistency audit
- workout habit check
- nutrition habit check
- weekly check-in package

Carousel quality gate:
- Every carousel slide must be copy-ready and useful by itself.
- Do not write slides that only label a week, such as "Week 1: Starting Problem."
- Every slide must include a specific example, question, checklist item, or action.
- Slide text should sound like a real post, not an outline.
- Bad slide: "Week 1: Identify the starting problem."
- Good slide: "Week 1: Turn the starting problem into a post. Talk about the moment someone realizes random workouts are not enough: busy schedule, no plan, skipped check-ins, or nutrition confusion."

Reel quality gate:
- Every reel scene must include a concrete filming action and a useful spoken line.
- Do not use vague visuals like "talking to camera" unless the spoken line is specific.
- Bad spoken line: "Week 3 addresses consistency obstacles."
- Good spoken line: "Week 3 is the post about why people fall off: busy weeks, weekend eating, missed workouts, or no accountability."

Public CTA alignment gate:
- If the user's business sells fitness coaching, platform content must sell the coaching next step, not a content-planning resource.
- Bad public CTA for fitness coaches: "Comment PLAN and I’ll send you the 4-week client-win content map."
- Good public call-to-action for fitness coaches: "Comment CHECK and I’ll send you the Fitness Goal Check."
- Good public call-to-action for fitness coaches: "Comment AUDIT and I’ll send you the Consistency Audit."
- Good public call-to-action for fitness coaches: "DM STARTER and I’ll send you the beginner plan checklist."
- Bad user-facing wording: "Include the CTA: Comment CHECK..."
- Better user-facing wording: "End the post with: Comment CHECK and I’ll send you the Fitness Goal Check."
- The content map can be mentioned only inside the user's internal Action Plan, not as the main public lead magnet for potential fitness clients.

Money Plan quality gate:
- Do not default to "Comment START."
- Use a keyword that matches the lead magnet, such as PLAN, CHECK, AUDIT, GOAL, or STARTER.
- Do not use "free consultation" as the CTA.
- Prefer for creators/business owners: "Comment PLAN and I’ll send you the 4-week client-win content map."
- Prefer for fitness clients: "Comment CHECK and I’ll send you the Fitness Goal Check."
- Prefer for fitness clients: "Comment AUDIT and I’ll send you the Consistency Audit."
- The lead magnet and paid offer must work together.
- If the user is a fitness coach trying to get coaching clients, the public CTA and lead magnet must be for potential fitness clients, not for other creators or content planners.
- Public-facing platform content must NOT say "Comment PLAN and I’ll send you the 4-week client-win content map" for fitness coach lead generation.
- For fitness coaches, public CTAs should point to a fitness-client resource such as Fitness Goal Check, Consistency Audit, Beginner Plan Checklist, First-Step Fitness Assessment, Workout Habit Check, or Starter Coaching Call.
- Strong fitness-client CTA examples: "Comment CHECK and I’ll send you the Fitness Goal Check." "Comment AUDIT and I’ll send you the Consistency Audit." "DM STARTER and I’ll send you the beginner plan checklist."
- The internal Action Plan can mention a 4-week content map for the business owner, but the public CTA shown in platform content should point potential clients to a fitness-related next step.
- The CTA must not confuse creators with fitness clients.

Action Plan quality gate:
- Every action plan step must include a specific post, CTA, and follow-up message.
- Do not write "review responses and analyze engagement."
- Better: "Review which reply came up most: busy schedule, nutrition confusion, or accountability. Use that as next week’s first post."
- Do not write "invite them to discuss their goals further."
- Better: "Ask: Are you looking for a beginner plan, accountability, or help with nutrition consistency?"

Final silent check:
- If Make My Post is prompt-only and the prompt is a vague local service request, rewrite any educational comparison, service menu, checklist, "not sure if", "help you decide", or service-level explanation into a short local DM post.
- For prompt-only mobile detailing, remove invented service levels and tasks such as quick clean, full detail, vacuuming, shampooing carpets, cleaning vents, polishing surfaces, treating spots, and "pick the right option" unless the user provided those exact details.
- Does this answer what to post?
- Does this explain how it can lead to money?
- Are all selected platform outputs present?
- Did you avoid invented proof?
- Does the result clearly match the selected goal: growth, viral, or sales?
- If the goal is growth, is it more educational/trust-building than sales-heavy?
- If the goal is viral, are the hooks sharper and more shareable?
- If the goal is sales, is the lead/sales path direct and copy-ready?
- Does the result feel specific, useful, and ready to use?
`;
    const prompt = mode === 'viral_hooks' ? viralHooksPrompt : growthSystemPrompt;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: mode === 'viral_hooks' ? 'gpt-4.1-mini' : 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Elua, a focused business-growth strategist, content creator, and monetization planner. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: hasUploadedImages
              ? [
                  {
                    type: 'text',
                    text: prompt,
                  },
                  ...normalizedUploadedImages.map((image) => ({
                    type: 'image_url',
                    image_url: {
                      url: image.dataUrl,
                    },
                  })),
                ]
              : prompt,
          },
        ],
        max_completion_tokens: mode === 'viral_hooks' ? 4000 : 9000,
        ...(mode === 'viral_hooks' ? {} : { reasoning_effort: 'minimal' as const }),
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API Error:', errorData);

      return NextResponse.json(
        { error: 'Failed to generate content.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return NextResponse.json(
        { error: 'No content returned from AI.' },
        { status: 500 }
      );
    }

    let parsed = JSON.parse(messageContent) as GeneratedResponse;
    const originalModelHashtags = Array.isArray(parsed.production_plan?.hashtags) ? [...parsed.production_plan.hashtags] : [];

    if (mode !== 'viral_hooks') {
      const normalizedContent: Record<string, string> = {};

      finalContentOutputs.forEach((output) => {
        const generatedValue = findGeneratedOutput(parsed.content, output);

        normalizedContent[output] =
          typeof generatedValue === 'string' && generatedValue.trim()
            ? generatedValue
            : `Elua could not generate ${output} in this run. Please regenerate or choose fewer outputs.`;
      });

      parsed.content = normalizedContent;

      const normalizedStructuredContent: StructuredContent = {};

      if (finalContentOutputs.includes('Instagram Reel')) {
        const structuredReel = normalizeStructuredReel(
          parsed.structured_content?.['Instagram Reel']
        );

        if (structuredReel) {
          normalizedStructuredContent['Instagram Reel'] = structuredReel;
        }
      }

      if (finalContentOutputs.includes('Instagram Carousel')) {
        const structuredCarousel = normalizeStructuredCarousel(
          parsed.structured_content?.['Instagram Carousel']
        );

        if (structuredCarousel) {
          normalizedStructuredContent['Instagram Carousel'] = structuredCarousel;
        }
      }

      parsed.structured_content = normalizedStructuredContent;
      parsed.production_plan = normalizeProductionPlan(parsed.production_plan);

      const currentBestPlatform =
        typeof parsed.best_output?.platform === 'string' &&
        finalContentOutputs.includes(parsed.best_output.platform)
          ? parsed.best_output.platform
          : finalContentOutputs[0];

      const currentBestContent =
        typeof parsed.best_output?.content === 'string' &&
        parsed.best_output.content.trim()
          ? parsed.best_output.content
          : normalizedContent[currentBestPlatform];

      parsed.best_output = {
        platform: currentBestPlatform,
        reason:
          typeof parsed.best_output?.reason === 'string' &&
          parsed.best_output.reason.trim()
            ? parsed.best_output.reason
            : 'This selected output is the strongest fit for the current goal.',
        content: currentBestContent,
      };

      parsed.mode = mode === 'make_my_post' ? 'make_my_post' : 'growth_system';

      if (mode === 'make_my_post' && parsed.production_plan?.caption) {
        parsed.production_plan.caption = parsed.production_plan.caption
          .replace(/\.\s+(Save\s)/g, '.\n\n$1')
          .replace(/\.\s+(DM\s)/g, '.\n\n$1')
          .replace(/\.\s+(Comment\s)/g, '.\n\n$1')
          .replace(/\.\s+(Reply\s)/g, '.\n\n$1')
          .replace(/\s{2,}/g, ' ')
          .replace(/\n\s+/g, '\n')
          .trim();
      }
    }

    parsed = strengthenBeautyShortFormOpening(parsed, content);
    parsed = cleanGeneratedValue(parsed);

    if (mode === 'make_my_post' && parsed.production_plan?.caption) {
      parsed.production_plan.caption = parsed.production_plan.caption
        .replace(/\.\s+(Save\s)/g, '.\n\n$1')
        .replace(/\.\s+(DM\s)/g, '.\n\n$1')
        .replace(/\.\s+(Comment\s)/g, '.\n\n$1')
        .replace(/\.\s+(Reply\s)/g, '.\n\n$1')
        .replace(/\n\s+/g, '\n')
        .trim();
    }

    if (mode === 'make_my_post') {
      const cleanCta = cleanMakeMyPostCta(
        parsed.production_plan?.cta || parsed.monetization?.cta_strategy
      );

      if (cleanCta) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          cta: cleanCta,
        };

        parsed.monetization = {
          ...(parsed.monetization || {}),
          cta_strategy: cleanCta,
        };
      }
    }

    if (mode === 'make_my_post') {
      const cleanTitle = cleanMakeMyPostTitle(
        parsed.strategy?.core_angle || parsed.production_plan?.concept
      );

      if (cleanTitle) {
        parsed.strategy = {
          ...(parsed.strategy || {}),
          core_angle: cleanTitle,
        };
      }
    }

    if (mode === 'make_my_post') {
      const ctaKeyword = cleanMakeMyPostCta(
        parsed.production_plan?.cta || parsed.monetization?.cta_strategy
      );

      const cleanedAudioDirection = cleanMakeMyPostAudioDirection(
        parsed.production_plan?.audio_direction
      );

      const shouldUseVideoOverlay = finalContentOutputs.some((output) =>
        ['Instagram Reel', 'TikTok Script', 'YouTube Shorts Script'].includes(output)
      );

      const cleanedShotOrder = limitShotOrderToUploadedPhotoCount(
        cleanMakeMyPostShotOrder(
          parsed.production_plan?.shot_order,
          ctaKeyword,
          shouldUseVideoOverlay
        ),
        normalizedUploadedImages.length
      );

      if (cleanedAudioDirection || cleanedShotOrder.length > 0) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          ...(cleanedAudioDirection
            ? { audio_direction: cleanedAudioDirection }
            : {}),
          ...(cleanedShotOrder.length > 0 ? { shot_order: cleanedShotOrder } : {}),
        };
      }
    }

    if (mode === 'make_my_post') {
      const providedContext = `${content || ''}`.toLowerCase();
      const allowDeepClean = /\bdeep\s+clean|deep\s+cleaning\b/i.test(
        providedContext
      );
      const allowCarpetCleaning = /\bcarpet\s+clean|carpet\s+cleaning|rug\s+clean|rug\s+cleaning\b/i.test(
        providedContext
      );

      const cleanedCaption = cleanUnsupportedCleaningClaims(
        parsed.production_plan?.caption,
        allowDeepClean,
        allowCarpetCleaning
      );
      const cleanedDmReply = cleanUnsupportedCleaningClaims(
        parsed.production_plan?.dm_reply,
        allowDeepClean,
        allowCarpetCleaning
      );
      const cleanedFollowUp = cleanUnsupportedCleaningClaims(
        parsed.production_plan?.follow_up_message,
        allowDeepClean,
        allowCarpetCleaning
      );
      const cleanedAudioDirection = cleanDuplicateCtaWords(
        parsed.production_plan?.audio_direction
      );
      const cleanedShotOrder = normalizeStringList(
        parsed.production_plan?.shot_order
      ).map((item) =>
        cleanUnsupportedCleaningClaims(item, allowDeepClean, allowCarpetCleaning)
      );

      if (
        cleanedCaption ||
        cleanedDmReply ||
        cleanedFollowUp ||
        cleanedAudioDirection ||
        cleanedShotOrder.length > 0
      ) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          ...(cleanedCaption ? { caption: cleanedCaption } : {}),
          ...(cleanedDmReply ? { dm_reply: cleanedDmReply } : {}),
          ...(cleanedFollowUp ? { follow_up_message: cleanedFollowUp } : {}),
          ...(cleanedAudioDirection
            ? { audio_direction: cleanedAudioDirection }
            : {}),
          ...(cleanedShotOrder.length > 0 ? { shot_order: cleanedShotOrder } : {}),
        };
      }
    }

    if (mode === 'make_my_post' && !hasUploadedImages) {
      const promptOnlyCta = cleanMakeMyPostCta(
        parsed.production_plan?.cta || parsed.monetization?.cta_strategy
      );

      parsed.production_plan = {
        ...(parsed.production_plan || {}),
        shot_order: getPromptOnlyPostStructure(content, promptOnlyCta),
      };
    }

    if (mode === 'make_my_post' && !hasUploadedImages) {
      const cleanedPromptCaption = cleanPromptOnlyInventedDetails(
        parsed.production_plan?.caption,
        content
      );
      const cleanedPromptDmReply = cleanPromptOnlyInventedDetails(
        parsed.production_plan?.dm_reply,
        content
      );
      const cleanedPromptFollowUp = cleanPromptOnlyInventedDetails(
        parsed.production_plan?.follow_up_message,
        content
      );
      const cleanedPromptShotOrder = normalizeStringList(
        parsed.production_plan?.shot_order
      ).map((item) => cleanPromptOnlyInventedDetails(item, content));

      parsed.production_plan = {
        ...(parsed.production_plan || {}),
        ...(cleanedPromptCaption ? { caption: cleanedPromptCaption } : {}),
        ...(cleanedPromptDmReply ? { dm_reply: cleanedPromptDmReply } : {}),
        ...(cleanedPromptFollowUp
          ? { follow_up_message: cleanedPromptFollowUp }
          : {}),
        ...(cleanedPromptShotOrder.length > 0
          ? { shot_order: cleanedPromptShotOrder }
          : {}),
      };
    }

    if (mode === 'make_my_post' && !hasUploadedImages) {
      const promptOnlyOverride = getPromptOnlyReadyPostOverride(content, normalizedFallbackVariationIndex, recentCampaignsPrompt);

      if (promptOnlyOverride) {
        parsed.strategy = {
          ...(parsed.strategy || {}),
          core_angle: promptOnlyOverride.title,
        };

        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: promptOnlyOverride.caption,
          cta: promptOnlyOverride.cta,
          dm_reply: promptOnlyOverride.dmReply,
          hashtags: promptOnlyOverride.hashtags,
          on_screen_text: promptOnlyOverride.hashtags,
          shot_order: [],
        };

        parsed.monetization = {
          ...(parsed.monetization || {}),
          cta_strategy: promptOnlyOverride.cta,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: promptOnlyOverride.caption,
        };
      }
    }

    if (mode === 'make_my_post') {
      parsed = applyInvisibleMakeMyPostQualityGate(parsed, {
        hasUploadedImages,
        selectedOutputs: finalContentOutputs,
      });
      parsed = cleanGeneratedValue(parsed);
    }

    if (mode === 'make_my_post' && !hasUploadedImages) {
      const promptOnlyDisplayOverride = getPromptOnlyReadyPostOverride(content, normalizedFallbackVariationIndex);

      if (promptOnlyDisplayOverride) {
        parsed.strategy = {
          ...(parsed.strategy || {}),
          core_angle: promptOnlyDisplayOverride.title,
        };

        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: promptOnlyDisplayOverride.caption,
          cta: promptOnlyDisplayOverride.cta,
          dm_reply: promptOnlyDisplayOverride.dmReply,
          hashtags: promptOnlyDisplayOverride.hashtags,
          on_screen_text: promptOnlyDisplayOverride.hashtags,
          shot_order: [],
        };

        parsed.monetization = {
          ...(parsed.monetization || {}),
          cta_strategy: promptOnlyDisplayOverride.cta,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: promptOnlyDisplayOverride.caption,
        };
      }

      const vagueLashRefillFallback =
        getVaguePromptOnlyLashRefillFallback(content, normalizedFallbackVariationIndex, recentCampaignsPrompt);

      if (vagueLashRefillFallback) {
        parsed.strategy = {
          ...(parsed.strategy || {}),
          core_angle: vagueLashRefillFallback.title,
        };

        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: vagueLashRefillFallback.caption,
          cta: vagueLashRefillFallback.cta,
          dm_reply: vagueLashRefillFallback.dmReply,
          hashtags: vagueLashRefillFallback.hashtags,
          on_screen_text: vagueLashRefillFallback.hashtags,
          shot_order: [],
        };

        parsed.monetization = {
          ...(parsed.monetization || {}),
          cta_strategy: vagueLashRefillFallback.cta,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: vagueLashRefillFallback.caption,
        };
      }

      const vagueMobileDetailingFallback =
        getVaguePromptOnlyMobileDetailingFallback(content, normalizedFallbackVariationIndex, recentCampaignsPrompt);

      if (vagueMobileDetailingFallback) {
        parsed.strategy = {
          ...(parsed.strategy || {}),
          core_angle: vagueMobileDetailingFallback.title,
        };

        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: vagueMobileDetailingFallback.caption,
          cta: vagueMobileDetailingFallback.cta,
          dm_reply: vagueMobileDetailingFallback.dmReply,
          hashtags: vagueMobileDetailingFallback.hashtags,
          on_screen_text: vagueMobileDetailingFallback.hashtags,
          shot_order: [],
        };

        parsed.monetization = {
          ...(parsed.monetization || {}),
          cta_strategy: vagueMobileDetailingFallback.cta,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          platform: parsed.best_output?.platform || 'Facebook Post',
          content: vagueMobileDetailingFallback.caption,
        };
      }
    }

    if (
      mode === 'make_my_post' &&
      hasUploadedImages &&
      parsed.production_plan?.caption &&
      needsHumanMediaCaptionRewrite(parsed.production_plan.caption)
    ) {
      const rewrittenCaption = await rewriteWeakMediaCaption({
        apiKey,
        originalPrompt: content,
        currentCaption: parsed.production_plan.caption,
        cta:
          parsed.production_plan.cta ||
          parsed.monetization?.cta_strategy ||
          '',
        voice: normalizeString(selectedVoice),
        businessContext:
          formatBusinessProfileForPrompt(businessProfile),
        uploadedImages: normalizedUploadedImages,
      });

      if (rewrittenCaption) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: rewrittenCaption,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: rewrittenCaption,
        };
      }
    }

    if (
      mode === 'make_my_post' &&
      hasUploadedImages &&
      parsed.production_plan?.caption
    ) {
      const originalCaptionBeforeCheck = parsed.production_plan.caption;
      const groundingCheck = await verifyCaptionIsGrounded({
        apiKey,
        originalPrompt: content,
        caption: parsed.production_plan.caption,
        dmReply: parsed.production_plan.dm_reply || '',
        uploadedImages: normalizedUploadedImages,
      });
      console.log('GROUNDING CHECK DIAGNOSTIC', {
        original: originalCaptionBeforeCheck,
        flaggedViolation: !!groundingCheck,
        rewrittenTo: groundingCheck ? groundingCheck.caption : null,
      });
      if (groundingCheck) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: groundingCheck.caption,
          dm_reply: groundingCheck.dmReply,
        };
        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: groundingCheck.caption,
        };
      }
    }
    if (
      mode === 'make_my_post' &&
      parsed.production_plan?.caption &&
      isTooSimilarToRecentCampaign(
        parsed.production_plan.caption,
        parsed.production_plan.dm_reply,
        recentCampaigns
      )
    ) {
      const rewrittenRepeat = await rewriteRepeatedContent({
        apiKey,
        originalPrompt: content,
        currentCaption: parsed.production_plan.caption,
        currentReply: parsed.production_plan.dm_reply || '',
        cta: parsed.production_plan.cta || parsed.monetization?.cta_strategy || '',
        voice: normalizeString(selectedVoice),
        businessContext: formatBusinessProfileForPrompt(businessProfile),
        recentCampaignsPrompt,
      });

      if (rewrittenRepeat) {
        parsed.production_plan = {
          ...(parsed.production_plan || {}),
          caption: rewrittenRepeat.caption,
          dm_reply: rewrittenRepeat.reply,
        };

        parsed.best_output = {
          ...(parsed.best_output || {}),
          content: rewrittenRepeat.caption,
        };
      }
    }

    if (mode === 'make_my_post' && hasUploadedImages) {
      const singlePhotoShotOrder =
        getSingleUploadedPhotoShotOrder({
          uploadedVisualCount: normalizedUploadedImages.length,
          hasUploadedVideoFrames,
          selectedOutputs: finalContentOutputs,
          originalRequest: content,
        });

      const usesVideoOutput =
        hasUploadedVideoFrames ||
        finalContentOutputs.some((output) =>
          [
            'Instagram Reel',
            'TikTok Script',
            'YouTube Shorts',
            'YouTube Shorts Script',
          ].includes(output)
        );

      const groundedHashtags = filterGroundedMediaHashtags(
        parsed.production_plan?.hashtags,
        content
      );
      const rawHashtagSource = Array.isArray(parsed.production_plan?.hashtags)
        ? parsed.production_plan.hashtags.join(' ')
        : String(parsed.production_plan?.hashtags || originalModelHashtags.join(' '));
      const strictHashtags = (
        (Array.isArray(groundedHashtags) && groundedHashtags.length > 0
          ? groundedHashtags.join(' ')
          : rawHashtagSource
        ).match(/#[A-Za-z0-9_]+/g) || []
      ).slice(0, 8);
      const bareTagFallback =
        strictHashtags.length === 0
          ? (Array.isArray(parsed.production_plan?.hashtags)
              ? parsed.production_plan.hashtags
              : originalModelHashtags)
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter((item) => item.length > 1 && item.length <= 30 && !item.includes(' '))
              .map((item) => (item.startsWith('#') ? item : '#' + item))
              .slice(0, 6)
          : [];
      const finalHashtags = strictHashtags.length > 0 ? strictHashtags : bareTagFallback;

      const groundedStaticPostTags = filterGroundedMediaHashtags(
        parsed.production_plan?.on_screen_text,
        content
      );

      parsed.production_plan = {
        ...(parsed.production_plan || {}),
        ...(singlePhotoShotOrder
          ? { shot_order: singlePhotoShotOrder }
          : {}),
        ...{ hashtags: finalHashtags },
        ...(!usesVideoOutput &&
        Array.isArray(parsed.production_plan?.on_screen_text)
          ? { on_screen_text: groundedStaticPostTags }
          : {}),
      };
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Generate route error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while generating content.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ generationsUsed: 0, isPro: false });
  }
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);
  return NextResponse.json({
    generationsUsed: (clerkUser.privateMetadata?.generationsUsed as number) || 0,
    isPro: clerkUser.privateMetadata?.isPro === true,
  });
}
