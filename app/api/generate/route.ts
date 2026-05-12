import { NextResponse } from 'next/server';

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
  monetization?: {
    offer_ideas?: string[];
    lead_magnet?: string;
    funnel?: {
      step_1?: string;
      step_2?: string;
      step_3?: string;
    };
    cta_strategy?: string;
    conversion_tips?: string[];
  };
};

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
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
  "monetization": {
    "offer_ideas": ["", "", ""],
    "lead_magnet": "",
    "funnel": {
      "step_1": "",
      "step_2": "",
      "step_3": ""
    },
    "cta_strategy": "",
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
- Instagram Reel: scene-by-scene filming plan with visual, spoken line, on-screen text, and CTA.
- Instagram Carousel: 5-7 slides with exact slide text and a CTA slide. Do not use image placeholders.
- TikTok Script: spoken script with hook, 2-3 fast points, payoff, and CTA.
- YouTube Shorts Script: tight spoken short-form script with hook, useful payoff, and CTA.
- LinkedIn Post: professional post with strong opening, useful insight, practical example, and soft CTA.
- Facebook Post: community-friendly post that feels natural, useful, and lead-focused.

Trust rules:
- Truth is more important than sounding impressive.
- Never invent names, numbers, testimonials, quotes, income, timelines, health results, client outcomes, guarantees, urgency, scarcity, discounts, or market claims.
- Never invent weight loss, muscle gain, confidence, plateaus, before/after results, dream body outcomes, improved energy, revenue, bookings, or client success details unless the user provided those exact facts.
- If the user says not to make up details, follow that instruction above everything else.
- If the user mentions transformations, testimonials, case studies, proof, or client wins but does not provide exact details, DO NOT describe what happened to the clients.
- Do not write “Client 1,” “Client 2,” “Client 3,” fake stories, fake outcomes, fake lessons from those outcomes, or fake testimonials unless the user provided those details.
- Instead, create content around the safe framework: questions to ask, ethical content process, what to collect before posting, how to turn proof into content, checklist, first-step plan, or next action.
- Safe wording when proof details are missing: “three real client transformations,” “client wins,” “the questions behind the wins,” “the process I use before sharing proof,” “how to turn client progress into content ethically.”
- Never use square-bracket placeholders like [client name], [image], [testimonial], or [insert link].
- Use truthful general language when details are missing.

Quality rules:
- The output should feel like something a real business owner could use today.
- Avoid generic phrases like "boost engagement", "drive sales", "valuable insights", "learn more", and "contact me today."
- Make the CTA specific, such as DM a keyword, comment a keyword, request a checklist, book a call, ask for a quote, request an assessment, join a list, or reply with a question.
- Make the lead magnet match the CTA.
- Make the Money Plan match the same campaign angle.
- If the user's idea is vague, choose a realistic business scenario, but do not invent proof.

Business rules:
- For realtors: focus on homeowner questions, seller prep, home value curiosity, listing readiness, avoiding seller mistakes, downsizing, inherited homes, and seller consultations.
- For real estate: do not claim hot market, best time, quick sale, guaranteed value increase, or market trends unless the user provided that fact.
- For fitness coaches: focus on safe transformation language, buyer situations, habits, consistency, accountability, beginner plans, assessments, coaching calls, and realistic next steps.
- For restaurants and caterers: focus on catering inquiries, event orders, party trays, office lunches, menus, quote requests, and repeat orders.
- For coaches and consultants: focus on audits, starter sessions, discovery calls, assessments, clarity offers, and trust-building content.
- For service businesses: prioritize leads, bookings, calls, quotes, consultations, assessments, custom plans, and repeat customers.

Offer rules:
- Offer names should feel like real named products or services.
- Each offer idea must include: offer name, what it is, who buys it, buyer stage, and why they would want it.
- At least one offer should be a simple starter offer the user could realistically sell soon.
- Do not suggest random PDFs, courses, webinars, landing pages, email sequences, discounts, or limited-time offers unless the user clearly asked for them.
- For service businesses, prefer leads, bookings, calls, quotes, consultations, audits, assessments, starter sessions, and simple packages.
- The lead magnet should be free, useful, named, and connected to the paid next step.
- conversion_tips should be practical follow-up actions, not vague advice.

Money Plan output standard:
- The Money Plan must feel like a revenue operator wrote it, not a generic marketer.
- The funnel must be immediately usable this week.
- step_1 must say exactly what to post or publish.
- step_2 must include the exact CTA keyword or reply.
- step_3 must include the exact follow-up message, question, booking step, or consultation invite.
- cta_strategy must include copy-paste-ready wording the user can put in the post or DM.
- conversion_tips must be concrete actions, not broad advice.
- Do not say vague phrases like "promote on social media", "encourage engagement", "collect responses", "provide value", "capture leads", "follow up with potential clients", or "create urgency".
- Do not recommend fake urgency, fake scarcity, fake discounts, fake testimonials, invented proof, or invented outcomes.

Good Money Plan style:
- Step 1: Post the Instagram Carousel about the 3 questions to ask before sharing a client transformation.
- Step 2: End with: "Comment START and I’ll send you the ethical client-win checklist."
- Step 3: When someone replies, send the checklist and ask: "Are you trying to turn your own progress into content, or are you looking for coaching help?"
- CTA Strategy: "Comment START and I’ll send you the checklist I use before turning client wins into sales content."
- Conversion Tip: "After sending the checklist, ask one qualifying question and invite serious replies to a short first-step call."

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
        model: 'gpt-4o-mini',
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

    const parsed = JSON.parse(messageContent) as GeneratedResponse;

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

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Generate route error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while generating content.' },
      { status: 500 }
    );
  }
}
