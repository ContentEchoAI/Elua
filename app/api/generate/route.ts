import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { content, selectedVoice, goal, generationMode } = await req.json();

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

    const viralHooksPrompt = `
You are Hummingbird AI, an elite viral hook strategist for creators.

Your job is to turn one content idea into 10 scroll-stopping hooks.

USER INPUT:
Content idea: ${content}
Goal: ${goal}
Brand voice: ${selectedVoice}

Return ONLY valid JSON. Do not include markdown. Do not include explanations outside the JSON.

The JSON must follow this exact structure:

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
- Return exactly 10 hooks inside the hooks array.
- Each hook should be short, punchy, and attention-grabbing.
- Keep most hooks under 18 words.
- Make the hooks feel native to TikTok, Instagram Reels, YouTube Shorts, X, and LinkedIn.
- Avoid generic AI wording.
- Do not use fake clickbait.
- Do not over-explain.
- If goal is "viral", use curiosity, contradiction, surprise, and emotional tension.
- If goal is "growth", use authority, relatability, and trust-building.
- If goal is "sales", use pain points, desire, proof, and transformation.
- Match the selected brand voice.
- best_hook should be the strongest hook from the list.
- best_hook.reason should explain in one short sentence why it is strongest.
`;

    const growthSystemPrompt = `
You are Hummingbird AI, an elite creator growth strategist.

Your job is to turn one content idea into a complete but concise creator growth system.

USER INPUT:
Content idea: ${content}
Goal: ${goal}
Brand voice: ${selectedVoice}

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
    "TikTok Script": "",
    "Instagram Reel": "",
    "Instagram Carousel": "",
    "YouTube Shorts Script": "",
    "LinkedIn Post": "",
    "X / Twitter Thread": "",
    "Email Newsletter": "",
    "Blog Post Outline": "",
    "Facebook Post": "",
    "Threads Post": "",
    "Reddit Post": ""
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

Output length rules:
- Keep each platform output useful but concise.
- TikTok Script: 45-75 seconds.
- Instagram Reel: 45-75 seconds.
- YouTube Shorts Script: 45-75 seconds.
- LinkedIn Post: under 1,200 characters.
- X / Twitter Thread: 5-7 short tweets.
- Email Newsletter: short newsletter format, not a long essay.
- Blog Post Outline: outline only, not a full blog post.
- Facebook, Threads, Reddit: concise and platform-native.
- Strategy fields should be direct and specific.
- Monetization should be practical and short.

Best Output Rules:
- Select the single strongest content piece from the generated content.
- Choose the one most likely to perform based on the user's goal.
- If goal is "viral", choose the most shareable and hook-driven piece.
- If goal is "growth", choose the piece most likely to build trust and audience loyalty.
- If goal is "sales", choose the piece most likely to convert readers into buyers or leads.
- The best_output.content should match one of the generated content pieces, but it can be slightly improved if needed.
- The reason should explain why this one is the strongest in one clear sentence.

Rules:
- Do not sound generic.
- Do not use fluffy AI language.
- Make the content feel platform-native.
- If goal is "viral", optimize for hooks, emotion, curiosity, and shareability.
- If goal is "growth", optimize for audience trust and consistency.
- If goal is "sales", optimize for conversion, offers, and buyer intent.
- Match the selected brand voice.
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
              'You are a world-class creator strategist, copywriter, and monetization expert. Always return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: mode === 'viral_hooks' ? 0.75 : 0.65,
        max_tokens: mode === 'viral_hooks' ? 1800 : 3800,
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

    const parsed = JSON.parse(messageContent);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Generate route error:', error);

    return NextResponse.json(
      { error: 'Something went wrong while generating content.' },
      { status: 500 }
    );
  }
}