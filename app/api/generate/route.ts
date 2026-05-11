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
You are Hummingbird AI, a business-growth workspace.

The user's core problem is:
"What should I post, and how does this help me make money?"

Think like three experts working together:

1. MASTER STRATEGIST
- Decide the specific audience.
- Identify the buyer moment.
- Choose one core content angle.
- Choose one clear CTA.
- Choose the safe money path.
- Identify what claims must be avoided.

2. MASTER CONTENT CREATOR
- Write only the selected platform assets.
- Make every platform output ready to use.
- Keep the selected outputs connected as one mini-campaign.
- Use the same audience, angle, CTA, and money path.

3. MASTER MONEY PLAN WIZARD
- Turn the content into a simple revenue path.
- Suggest realistic offers.
- Create a lead magnet that connects to the paid next step.
- Give a simple funnel and practical conversion tips.

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

Platform writing rules:
- Instagram Reel: scene-by-scene filming plan with visual, spoken line, on-screen text, and CTA.
- Instagram Carousel: 5-7 slides with exact slide text and a CTA slide. Do not use image placeholders.
- TikTok Script: spoken script with hook, 2-3 fast points, payoff, and CTA.
- YouTube Shorts Script: tight spoken short-form script with hook, useful payoff, and CTA.
- LinkedIn Post: professional post with strong opening, useful insight, practical example, and soft CTA.
- Facebook Post: community-friendly post that feels natural, useful, and lead-focused.

Strict trust and safety rules:
- Never invent names.
- Never invent statistics.
- Never invent testimonials.
- Never invent quotes.
- Never invent before-and-after numbers.
- Never invent timelines.
- Never invent income, revenue, health, legal, or financial claims.
- Never invent client results.
- Never invent market claims.
- Never invent guarantees.
- Never use fake urgency or fake scarcity.
- Never use square-bracket placeholders like [insert link], [client name], [image], or [testimonial].
- If the user says they have client transformations, case studies, testimonials, or proof but does not provide the exact details, refer to them generally.
- Safe proof language: "three real client transformations", "what changed for these clients", "the pattern behind the results", "the first step they took", "what helped them stay consistent".
- CRITICAL: If proof details are missing, write about the content strategy or lesson framework, not the proof itself.
- For vague transformation prompts, do not create separate transformation stories.
- Do not write "Transformation 1", "Transformation 2", "Transformation 3", "our first client", "our second client", "our last client", "client story", "success story", "testimonial", or "before-and-after" unless the user gave those exact details.
- Do not say what changed for a client unless the user provided the exact change.
- Do not say coaching caused the result unless the user provided that fact.
- Do not say "results", "achievable results", "incredible results", "healthy habits", "confidence", "strength", "weight loss", "energy", "consistency was key", or "accountability made the difference" as client outcomes unless the user provided those exact facts.
- Better approach for vague proof prompts: create content that says, "Here are the 3 questions I ask before turning a client win into content," or "Here is how to turn client progress into a month of ethical sales content."
- If the user mentions transformations but gives no exact details, DO NOT describe what happened in the transformations.
- Do not write "Client 1", "Client 2", "Client 3", "before photo", "after photo", "lost weight", "gained strength", "improved confidence", "3 months", "8 weeks", "results", or "success stories" unless the user provided those exact facts.
- For transformation prompts without details, make the content about the lesson, pattern, process, questions, mistakes, or first step behind transformations — not the transformation details themselves.
- Do not create fake people like Sarah, Jake, Emily, Alex, Lisa, or John.
- Do not create fake results like "lost 15 pounds", "made $8k", "in 30 days", or "doubled sales" unless the user provided that fact.

Campaign angle rules:
- Choose one fresh campaign angle based on the user's prompt before writing the content.
- Do not output the campaign angle label by itself as the core_angle.
- Rewrite the campaign angle into a polished, specific core_angle sentence.
- Do not default to the same angle, CTA, or lead magnet every time.
- The campaign angle should make the result feel specific and useful, not generic.
- Choose from angles like:
  1. Before/after lesson
  2. Mistakes to avoid
  3. Behind-the-scenes process
  4. Myth vs truth
  5. Pattern breakdown
  6. Readiness checklist
  7. One small first step
  8. Objection handling
  9. Common questions
  10. What to do next
- The CTA must match the chosen campaign angle.
- The lead magnet must match the CTA.
- The Money Plan must match the same campaign angle.

Quality rules:
- Be specific, but stay truthful.
- If the user prompt is vague, choose a realistic concrete scenario, but do not invent proof.
- The result should feel like a focused client-ready mini plan.
- The content should help the user start a real business conversation.
- The CTA should be specific and believable.
- Good CTAs include: comment a keyword, DM a keyword, request a checklist, book a call, request a quote, ask for an assessment, or join a list.
- Avoid generic phrases like "boost engagement", "drive sales", "valuable insights", "contact me today", "learn more", and "get started" unless the next action is specific.
- Avoid using "free assessment" as the default CTA unless it is clearly the strongest fit.
- The Money Plan must connect directly to the content CTA.

Business rules:
- For realtors, focus on homeowner questions, seller prep, home value curiosity, avoiding common seller mistakes, listing readiness, downsizing, inherited homes, and seller consultations.
- For real estate, do not claim hot market, best time, peak season, quick sale, profitable sale, guaranteed value increase, or market trends unless the user provided that fact.
- For fitness coaches, focus on buyer situations, accountability, habits, consistency, beginner plans, coaching calls, assessments, and safe transformation language.
- For restaurants and caterers, focus on catering inquiries, event orders, office lunches, party trays, quote requests, menus, and repeat orders.
- For coaches and consultants, focus on audits, starter sessions, discovery calls, clarity offers, assessments, and repeatable trust-building content.
- For service businesses, prioritize leads, bookings, calls, quotes, consultations, assessments, custom plans, and repeat customers.

Offer rules:
- Offer names should feel like real named products or services.
- Avoid weak generic names unless made specific.
- Each offer idea must include: offer name, what it is, who buys it, buyer stage, and why they would want it.
- At least one offer should be a simple starter offer the user could realistically sell soon.
- Do not suggest random PDFs, courses, or webinars when the stronger path is leads, bookings, calls, quotes, consultations, or services.
- The lead magnet should be free, useful, named, and connected to the paid next step.
- conversion_tips should be practical follow-up actions, not vague advice.
- conversion_tips should focus on follow-up messages, qualifying questions, booking links, simple next steps, and collecting permission/proof details when needed.

Final silent check before returning:
- Is every selected platform included?
- Are all outputs usable?
- Are there any fake names, numbers, testimonials, results, or claims? If yes, remove them.
- Does the Money Plan connect to the CTA?
- Would a real small business owner understand what to post and what to do next?

Return ONLY polished JSON.
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
