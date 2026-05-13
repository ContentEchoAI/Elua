import { NextResponse } from 'next/server';

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

function cleanGeneratedText(value: string) {
  return value
    .replace(/I['’]m not posting private client details,? but\s*/gi, '')
    .replace(/I['’]m not sharing private client details,? but\s*/gi, '')
    .replace(/Instead of sharing private details,?\s*/gi, '')
    .replace(/instead of sharing private details,?\s*/g, '')
    .replace(/without using private details or invented results/gi, 'built around real client-win patterns, buyer problems, and coaching steps')
    .replace(/without private details or invented results/gi, 'built around real client-win patterns, buyer problems, and coaching steps')
    .replace(/without sharing private details/gi, 'without inventing results')
    .replace(/private client details/gi, 'specific client details')
    .replace(/private details/gi, 'specific details')
    .replace(/Comment PLAN and I['’]ll send you the 4-week client-win content map/gi, 'Comment CHECK and I’ll send you the Fitness Goal Check')
    .replace(/Comment PLAN and I['’]ll send you the 4-Week Client-Win Content Map/gi, 'Comment CHECK and I’ll send you the Fitness Goal Check')
    .replace(/Comment PLAN for the 4-Week Client-Win Content Map/gi, 'Comment CHECK for the Fitness Goal Check')
    .replace(/Include the CTA:\s*/gi, 'Use this line: ')
    .replace(/Include the call to action:\s*/gi, 'Use this line: ')
    .replace(/I have 3 client wins, but I['’]m not just bragging\.?/gi, 'I have 3 client wins. Here’s how I’d turn them into sales content that helps the next person take action.')
    .replace(/I have 3 client wins, but I['’]m not just posting bragging rights\.?/gi, 'I have 3 client wins. Here’s how I’d turn them into sales content that helps the next person take action.')
    .replace(/not just posting bragging rights/gi, 'turning proof into useful sales content')
    .replace(/not just bragging/gi, 'turning proof into useful sales content')
    .replace(/the best time is now/gi, 'the best next step is to understand your options')
    .replace(/The best time is now/gi, 'The best next step is to understand your options')
    .replace(/the sooner, the better/gi, 'start by understanding your timeline')
    .replace(/The sooner, the better/gi, 'Start by understanding your timeline')
    .replace(/maximize sale price/gi, 'make a stronger listing plan')
    .replace(/Maximize sale price/gi, 'Make a stronger listing plan')
    .replace(/boost sale price/gi, 'improve listing readiness')
    .replace(/Boost sale price/gi, 'Improve listing readiness')
    .replace(/get top buyer exposure/gi, 'improve your listing strategy')
    .replace(/Get top buyer exposure/gi, 'Improve your listing strategy')
    .replace(/sell quickly/gi, 'plan your sale with more clarity')
    .replace(/Sell quickly/gi, 'Plan your sale with more clarity')
    .replace(/sell fast/gi, 'plan your sale with more clarity')
    .replace(/Sell fast/gi, 'Plan your sale with more clarity')
    .replace(/smooth sale/gi, 'clearer selling process')
    .replace(/Smooth sale/gi, 'Clearer selling process')
    .replace(/free consultation/gi, 'Seller Readiness Review')
    .replace(/Free consultation/gi, 'Seller Readiness Review')
    .replace(/no-obligation market evaluation/gi, 'Home Value Conversation')
    .replace(/No-obligation market evaluation/gi, 'Home Value Conversation')
    .replace(/market evaluation/gi, 'Home Value Conversation')
    .replace(/Market evaluation/gi, 'Home Value Conversation')
    .replace(/before it['’]s gone/gi, 'before the drop opens')
    .replace(/Before it['’]s gone/gi, 'Before the drop opens')
    .replace(/do not miss out/gi, 'join the waitlist for early access')
    .replace(/Don['’]t miss out/gi, 'Join the waitlist for early access')
    .replace(/secure your spot/gi, 'join the waitlist')
    .replace(/Secure your spot/gi, 'Join the waitlist')
    .replace(/VIP Waitlist Membership/gi, 'Early Access Waitlist')
    .replace(/VIP membership/gi, 'early access list')
    .replace(/limited edition clothing/gi, 'upcoming clothing drop')
    .replace(/limited-edition clothing/gi, 'upcoming clothing drop')
    .replace(/every stitch/gi, 'the product details')
    .replace(/Every stitch/gi, 'The product details')
    .replace(/expert sewing/gi, 'sample check')
    .replace(/Expert sewing/gi, 'Sample check')
    .replace(/skilled team/gi, 'team')
    .replace(/Skilled team/gi, 'Team')
    .replace(/perfect fit/gi, 'fit')
    .replace(/Perfect fit/gi, 'Fit')
    .replace(/build excitement/gi, 'show the product reason to join the waitlist')
    .replace(/Build excitement/gi, 'Show the product reason to join the waitlist')
    .replace(/create hype/gi, 'show the product reason to join the waitlist')
    .replace(/Create hype/gi, 'Show the product reason to join the waitlist')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
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


export async function POST(req: Request) {
  try {
    const { content, selectedVoice, goal, generationMode, selectedOutputs } =
      await req.json();

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
        : ['Instagram Reel', 'Instagram Carousel', 'LinkedIn Post'];

    const finalContentOutputs =
      requestedContentOutputs.length > 0
        ? requestedContentOutputs
        : ['Instagram Reel', 'Instagram Carousel', 'LinkedIn Post'];

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

    const viralHooksPrompt = `
You are Hummingbird AI's Master Hook Writer.

The user gives one business/content idea. Your job is to create 10 strong hooks that help them get attention without fake claims.

USER INPUT:
Content idea: ${content}
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

    const growthSystemPrompt = `
You are Hummingbird AI, an elite business-growth workspace for creators, small businesses, and service providers.

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

USER INPUT:
Content idea: ${content}
Goal: ${goal}
Brand voice: ${selectedVoice}
Selected platforms: ${selectedOutputList}

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

Platform writing rules:
- Every selected platform output must feel native to that platform, not like the same idea rewritten with a different label.
- Do not make all selected outputs repeat the same opening line, CTA sentence, or structure.
- Use the chosen campaign route, but adapt it differently for each platform.
- Write the actual post/script/carousel copy, not advice about what the post should say.
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
- For Facebook posts, write like a real coach explaining a useful system to potential clients. Do not write broad marketing language.

Instagram Reel rules:
- Write a scene-by-scene filming plan.
- Include 5-7 short scenes.
- Each scene must include: Visual, Spoken Line, On-Screen Text.
- The first scene must have a strong scroll-stopping hook.
- The middle scenes must give useful steps, questions, examples, or a simple process.
- The final scene must include a specific CTA.
- Keep spoken lines natural, short, and camera-ready.
- Do not use fake client names, fake outcomes, or placeholder visuals.

Instagram Carousel rules:
- Write 6-8 slides.
- Each slide must have exact slide text.
- Slide 1 must be a strong title.
- Slides 2-6 must build a useful swipe-through lesson, checklist, framework, or decision guide.
- The second-to-last slide should summarize the key takeaway.
- The final slide must include a specific CTA.
- Do not use image placeholders.
- Do not write vague slides like "valuable insights" or "learn more."

TikTok Script rules:
- Write a fast spoken script for one person talking to camera.
- Include: Hook, Point 1, Point 2, Point 3, Payoff, CTA.
- Keep the tone direct, useful, and conversational.
- Make it feel like something someone could record immediately.
- Start with a sharp spoken hook, not a greeting.
- Strong TikTok style: "I have 3 client wins. Here’s how I’d turn them into 4 weeks of sales content without making anything up."
- Weak TikTok style to avoid: "Hey everyone, here’s a quick tip."
- Weak TikTok style to avoid: "I’m not using private details, but..."

YouTube Shorts Script rules:
- Write a tight short-form script with timestamps or beats.
- Include: 0-3 second hook, useful middle, clear final takeaway, CTA.
- Make it more polished and educational than TikTok.
- Avoid filler and generic motivational language.
- Start with a clear educational promise or contrarian insight.
- Strong YouTube Shorts style: "Client transformations should not become brag posts. They should become lessons about the problem, the process, and the next step."
- Weak YouTube Shorts style to avoid: "Want the full plan?"

LinkedIn Post rules:
- Write a professional post that sounds like a real founder, coach, consultant, or business owner.
- Start with a strong plain-English insight.
- Include a useful framework, lesson, example, or decision filter.
- Use short paragraphs with natural spacing.
- End with a soft but specific CTA.
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

Trust rules:
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
- Use truthful general language when details are missing.

Quality rules:
- The output should feel like something a real business owner could use today.
- Avoid generic phrases like "boost engagement", "drive sales", "valuable insights", "learn more", and "contact me today."
- Also avoid filler phrases like "thought-provoking question", "surprising fact", "relatable scenario", "authenticity is key", "resonate with your audience", "builds trust", "share tips", "provide value", "take your business to the next level", and "unlock your potential."
- Replace generic language with specific wording tied to the user's business, buyer problem, objection, offer, platform, and next action.
- Do not say a hook is strong; write the strong hook.
- Do not say a post should be relatable; write the actual relatable angle.
- Do not say the content should build trust; show the trust-building proof process, checklist, question, or next step.
- Use concrete nouns and verbs. Prefer "comment START for the Client Story Prep Sheet" or "comment START for the Fitness Goal Conversation Starter" over "engage with this post."
- Make every CTA copy-paste-ready and specific, such as DM a keyword, comment a keyword, request a checklist, book a call, ask for a quote, request an assessment, join a list, or reply with a question.
- Make the lead magnet match the CTA.
- Make the Money Plan match the same campaign angle.
- If the user's idea is vague, choose a realistic business scenario, but do not invent proof.

Business rules:
- For realtors: focus on homeowner questions, seller prep, home value curiosity, listing readiness, avoiding seller mistakes, downsizing, inherited homes, and seller consultations.
- For real estate: do not claim hot market, best time, quick sale, guaranteed value increase, or market trends unless the user provided that fact.
- For realtor content, avoid claim-heavy or risky real estate language. Do not imply guaranteed sale speed, guaranteed buyer exposure, guaranteed higher price, perfect timing, or that a seller should list immediately.
- Avoid phrases like "the best time is now", "the sooner the better", "sell fast", "sell quickly", "maximize sale price", "boost sale price", "get top buyer exposure", "smooth sale", "market is hot", "avoid delays", "speed up the sale", or "perfect listing window" unless the user provided specific support.
- Prefer safer realtor language: seller readiness, listing prep, home value conversation, repair prioritization, timeline clarity, pricing questions, consultation readiness, understand your options, avoid wasting money on unnecessary repairs, and prepare before listing.
- Realtor CTAs should usually invite a Seller Readiness Checklist, Seller Prep Review, Listing Prep Consultation, Home Value Conversation, Home Value Review, or Seller Timeline Check.
- For realtor lead magnets, prefer practical resources such as Seller Readiness Checklist, Listing Prep Checklist, Home Value Question Guide, Seller Timeline Planner, Repair Priority Checklist, or Before You List Checklist.
- For realtor follow-up messages, ask specific qualifying questions: "What is your selling timeline?", "What is your biggest concern before listing?", "Are you trying to sell soon or just understand your options?", "Do you want help prioritizing repairs before listing?", or "Would a home value conversation help you plan your next step?"
- Do not use "free consultation" as the default realtor CTA. Prefer "Seller Readiness Review", "Listing Prep Consultation", "Home Value Conversation", or "Seller Prep Call."
- Do not use broad phrases like "professional guidance" or "expert advice" without tying them to a specific seller question, timeline, home value concern, repair decision, or listing prep step.
- For fitness coaches: focus on safe transformation language, buyer situations, habits, consistency, accountability, beginner plans, assessments, coaching calls, and realistic next steps.
- For restaurants and caterers: focus on catering inquiries, event orders, party trays, office lunches, menus, quote requests, and repeat orders.
- For coaches and consultants: focus on audits, starter sessions, discovery calls, assessments, clarity offers, and trust-building content.
- For clothing brands and ecommerce product brands: focus on product details, fit, fabric, sizing, colorways, styling ideas, drop date, waitlist signups, preorder interest, early access, product bundles, customer use case, and purchase questions.
- Do not default to vague scarcity language like "exclusive", "limited edition", "before it is gone", "do not miss out", "secure your spot", "VIP membership", or "hype" unless the user clearly gave a real limited drop, inventory limit, or membership program.
- Do not invent production details such as expert sewing, skilled team, every stitch, handcrafted details, premium fabric, perfect fit, sustainable materials, or limited quantities unless the user provided those facts.
- If production details are missing, use safe behind-the-scenes ideas: fabric close-up, fit check, styling clip, packing orders, choosing colorways, checking samples, product flat lay, founder explaining the design choice, try-on clip, size guide, or waitlist page.
- Product-brand CTAs should usually invite a waitlist signup, early access link, sizing help, drop reminder, preorder interest, fit guide, or product question.
- Strong product-brand CTA examples: "Comment DROP and I’ll send you the waitlist link.", "DM FIT if you want help choosing your size.", "Comment STYLE and I’ll send you 3 ways to wear it.", "Join the waitlist for early access.", "Reply SIZE and I’ll send the size guide."
- Product-brand Money Plans should lead to product sales, waitlist signups, preorders, early access, sizing help, bundles, repeat purchases, or drop reminders — not consulting, creator education, or vague community engagement.
- For clothing brands, each content asset should include at least one concrete product-sale angle: fit, material feel, styling situation, size question, colorway, drop timing, waitlist reason, outfit use case, or why someone would wear it.
- Do not say "build excitement" or "create hype" as the main strategy. Show the specific product reason someone would want to join the waitlist or buy.
- For service businesses: prioritize leads, bookings, calls, quotes, consultations, assessments, custom plans, and repeat customers.

Offer rules:
- Offer names should feel like real named products or services.
- Each offer idea must include: offer name, what it is, who buys it, buyer stage, and why they would want it.
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
- For a fitness coach using a client story, proof, or transformation-related lead magnet, funnel.step_3 should NOT ask if the lead wants to turn progress into content. It should ask what fitness goal they want help with and invite them to a fitness assessment, starter plan, coaching call, or accountability program.
- For a fitness coach, conversion_strategy should sound like: “Comment START and I’ll send the checklist. After that, I’ll ask one question about your fitness goal and point you to the right first coaching step.”
- conversion_tips should be practical follow-up actions, not vague advice.

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
- The action plan must connect the selected platform content, lead magnet, CTA, funnel, and real paid offer.
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
- Do not say vague phrases like "promote on social media", "encourage engagement", "collect responses", "provide value", "capture leads", "follow up with potential clients", or "create urgency".
- Do not recommend fake urgency, fake scarcity, fake discounts, fake testimonials, invented proof, or invented outcomes.

Good Money Plan style:
- Step 1: Post the Instagram Carousel about turning 3 client transformations into a 4-week sales content calendar built around real client-win patterns, buyer problems, and coaching steps.
- Step 2: End with: "Comment PLAN and I’ll send you the Transformation Content Calendar."
- Step 3: When someone replies, send the calendar and ask: "What fitness goal are you working toward right now, and what feels hardest to stay consistent with?"
- CTA Strategy: "Comment PLAN and I’ll send you the Transformation Content Calendar. After that, I’ll ask one question about your fitness goal and point you to the right first coaching step."
- Action Plan Day 1: Post the Instagram Carousel about turning 3 client transformations into a 4-week sales content calendar built around real client-win patterns, buyer problems, and coaching steps. CTA: "Comment PLAN and I’ll send you the Transformation Content Calendar." Follow-up: "When someone comments PLAN, send the calendar and say: What fitness goal are you working toward right now?"
- Action Plan Day 2: Reply to every comment or DM with the Fitness Goal Check and ask the first qualifying question. CTA: "Reply with your goal and biggest obstacle." Follow-up: "If they mention busy schedule, missed workouts, nutrition confusion, or accountability, invite them to a Starter Fitness Assessment or Consistency Audit."
- Conversion Tip: "After sending the content map, ask one qualifying question: What fitness goal are you working toward right now, and what keeps getting in the way? If they mention consistency, nutrition confusion, accountability, a busy schedule, or not knowing where to start, invite them to a First-Step Fitness Assessment."

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
- Does this answer what to post?
- Does this explain how it can lead to money?
- Are all selected platform outputs present?
- Did you avoid invented proof?
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
        model: mode === 'viral_hooks' ? 'gpt-4o-mini' : 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are Hummingbird AI, a focused business-growth strategist, content creator, and monetization planner. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: mode === 'viral_hooks' ? 0.75 : 0.62,
        max_tokens: mode === 'viral_hooks' ? 1800 : 4200,
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

    if (mode === 'growth_system') {
      const normalizedContent: Record<string, string> = {};

      finalContentOutputs.forEach((output) => {
        const generatedValue = findGeneratedOutput(parsed.content, output);

        normalizedContent[output] =
          typeof generatedValue === 'string' && generatedValue.trim()
            ? generatedValue
            : `Hummingbird could not generate ${output} in this run. Please regenerate or choose fewer outputs.`;
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

      parsed.mode = 'growth_system';
    }

    parsed = cleanGeneratedValue(parsed);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Generate route error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while generating content.' },
      { status: 500 }
    );
  }
}
