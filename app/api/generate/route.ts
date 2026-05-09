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
- Make every hook specific to the user's exact idea.
- Avoid generic AI wording.
- Avoid vague hooks like "Here are tips for..." or "How to improve..."
- Do not use fake clickbait.
- Do not over-explain.
- Use curiosity, contrast, specificity, pain points, proof, identity, and transformation.
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

Showpiece Priority Rules:
- The result should feel like a focused client-ready mini plan, not a pile of generic posts.
- Prioritize making the Strategy, Best Performing Content, Instagram Reel, LinkedIn Post, and Money Plan excellent.
- It is better to make 4-5 outputs highly useful than to make every platform long and generic.
- Each content output must include a specific buyer, a specific problem, a clear next action, and copy the user could actually post.
- Avoid unsupported claims like "significantly boost value", "market statistics", "homes are selling faster", "record prices", or "recent sales" unless the user provided those facts.
- For real estate, use safe phrasing: "understand your home's current value", "prepare before listing", "avoid common seller mistakes", "know what buyers notice", and "get a simple selling plan".
- For service businesses, focus on leads, consultations, bookings, repeat orders, and simple follow-up steps.
- Do not create filler outputs just to fill the JSON. If a section is less important, keep it short and useful.
- No fake success stories. No fake client results. No fake statistics. No fake urgency.
- The user should feel: "I could copy this, post it, and know what to do next."

Quality Rules:
- Hummingbird AI should feel like a premium content strategist and monetization partner, not a generic AI brainstorm.
- Every result must be specific, useful, trustworthy, and ready to use.
- The user should feel: "This understands my business and gave me something I can actually post, save, or sell with."

Core Output Standard:
- First, infer the user's likely business type, audience, buyer pain, and business goal from the prompt.
- If the prompt is vague, choose one realistic concrete scenario and build the entire result around it.
- Do not stay broad. Replace vague ideas with real buyer moments, specific content angles, and clear next actions.
- Never use placeholders such as [Restaurant Name], [phone number], [testimonial], [insert link], [local area], or any text inside square brackets.
- Never invent statistics, market claims, percentages, prices, client results, testimonials, legal claims, financial claims, or performance claims unless the user provides them.
- Use safe phrasing instead of fake facts: "many homeowners wonder", "buyers often notice", "event planners care about", "a useful next step is", or "this helps start a sales conversation."
- Avoid generic phrases unless made specific: build trust, drive engagement, create awareness, valuable insights, contact us today, learn more, DM for details, limited-time offer, exceptional service, unique dishes.
- Keep the output concise enough to scan but specific enough to use.

Strategy Rules:
- target_audience must name a specific buyer or audience stage.
- core_angle must explain the real pain, trigger moment, and content promise.
- hook_strategies must be actual hook examples or hook formulas with specific wording.
- why_it_works must explain why the content moves the audience toward the user's goal.

Platform Content Rules:
- Each platform output must be a complete standalone asset.
- Do not repeat the same copy across platforms with tiny wording changes.
- TikTok Script: spoken short-form script with hook, 2-3 fast beats, payoff, and CTA.
- Instagram Reel: visual scene-by-scene idea with what to show, what to say, and CTA.
- Instagram Carousel: slide-by-slide copy with clear slide text.
- YouTube Shorts Script: tight educational or story-driven script with hook, payoff, and CTA.
- LinkedIn Post: professional insight post with strong opening, useful lesson, proof/example angle, and soft CTA.
- X / Twitter Thread: numbered posts with progression and a clear final action.
- Email Newsletter: subject line, opening, useful body, and CTA.
- Blog Post Outline: useful title, sections, and what each section teaches.
- Facebook Post: community-friendly post with story, relevance, or question.
- Threads Post: short conversational post with a strong opinion or relatable observation.
- Reddit Post: helpful, non-salesy discussion post that feels native to a community.
- Best Performing Content must be the strongest complete asset, not a preview or summary.

Lead Generation Workspace Rules:
- Treat Hummingbird AI as a lead-generation workspace, not a generic content generator.
- Every Growth System result should answer: who is this attracting, what problem are we solving, what action should they take, and what paid opportunity does it create?
- The best content should make the target buyer feel seen, understood, and motivated to take a next step.
- Prioritize outputs that create leads: comments, DMs, quote requests, consultations, assessments, calls, bookings, email signups, and saved lead magnets.
- Content should not just sound good. It should help the user start a real business conversation.
- Avoid vague audience-building unless it clearly connects to a future sale, booking, consultation, subscription, or repeat customer.
- Make the CTA specific and believable. Example: “Comment SELL and I’ll send you the seller prep checklist” is better than “contact me today.”
- The money plan should feel like the natural next step after the content, not a separate brainstorm.

Business-Specific Rules:
- For realtors, focus on homeowners thinking about selling, home value curiosity, seller prep, inherited properties, downsizing, pricing concerns, and listing consultations.
- For restaurants/caterers, focus on office lunches, party trays, birthday parties, small receptions, local event planners, catering menus, quote requests, and repeat orders.
- For coaches/consultants, focus on buyer clarity, first offer, client objections, discovery calls, audits, starter sessions, and repeatable content that earns trust.
- For fitness coaches, focus on specific buyer situations like busy parents, beginners, wedding prep, post-vacation reset, accountability, and simple plans.
- For service businesses, prioritize leads, bookings, calls, quotes, consultations, audits, assessments, custom plans, and repeat customers.

Money Plan Rules:
- The monetization section must feel like a practical revenue path, not a list of random ideas.
- Each offer idea should include: offer name, what it is, who buys it, buyer stage, and why they would act now.
- At least one offer must be a simple starter offer the user could realistically sell soon.
- Match the user's business model. Do not suggest random low-ticket eBooks or PDFs when the stronger path is leads, bookings, clients, listings, retainers, subscriptions, or higher-value sales.
- The lead magnet must be a named free asset with a clear promise, format, buyer problem, and direct connection to the paid offer.
- The funnel must explain the path from content to lead magnet to paid offer.
- cta_strategy must include exact copy the user can use and what happens after someone replies when useful.
- conversion_tips must include specific trust builders, objections to overcome, proof points, urgency angles, and ease-of-action improvements.

Final Quality Check:
- Before returning JSON, silently check: Is this specific to the user's business? Is it safe and credible? Can the user copy or save it? Does it move toward leads, sales, growth, or retention?
- Return ONLY polished user-facing JSON. No markdown. No explanations outside JSON.

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