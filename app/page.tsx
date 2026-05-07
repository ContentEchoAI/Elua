'use client';

import { useEffect, useState } from 'react';
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from '@clerk/nextjs';

type Strategy = {
  target_audience?: string;
  core_angle?: string;
  content_goal?: string;
  hook_strategies?: string[];
  emotional_triggers?: string[];
  content_style?: string;
  why_it_works?: string;
  best_platform?: string;
};

type Monetization = {
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

type BestOutput = {
  platform?: string;
  reason?: string;
  content?: string;
};

type ViralHook = {
  hook?: string;
  angle?: string;
  why_it_works?: string;
};

type Results = {
  mode?: 'growth_system' | 'viral_hooks';
  strategy?: Strategy;
  best_output?: BestOutput;
  content?: Record<string, string>;
  monetization?: Monetization;
  hooks?: ViralHook[];
  best_hook?: {
    hook?: string;
    reason?: string;
  };
};

type SavedGeneration = {
  id: string;
  title: string;
  input: string;
  mode: 'growth_system' | 'viral_hooks';
  goal: string;
  voice: string;
  createdAt: string;
  results: Results;
};

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  const signedIn = isLoaded && isSignedIn;

  const [content, setContent] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('professional');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'strategy' | 'content' | 'monetization' | 'hooks'
  >('content');
  const [goal, setGoal] = useState('growth');
  const [generationMode, setGenerationMode] = useState<
    'growth_system' | 'viral_hooks'
  >('growth_system');
  const [copiedItem, setCopiedItem] = useState('');
  const [savedGenerations, setSavedGenerations] = useState<SavedGeneration[]>(
    []
  );
  const [savedMessage, setSavedMessage] = useState('');
  const [savedLoading, setSavedLoading] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  const MAX_FREE = 10;
  const MAX_SAVED = 20;

  const voices = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'energetic', label: 'Energetic' },
    { id: 'authoritative', label: 'Authority' },
    { id: 'witty', label: 'Witty' },
    { id: 'storytelling', label: 'Storytelling' },
  ];

  const examples = [
    'How I grew my YouTube channel from 0 to 100k subscribers in 8 months',
    'The exact strategy that took my podcast from 0 to 50k downloads',
    'I turned one viral TikTok into $8k in affiliate sales — here’s how',
    'My 7-day content calendar that grew my Instagram to 50k followers',
  ];

  const growthLoadingMessages = [
    'Analyzing your content idea...',
    'Finding the strongest growth angle...',
    'Writing platform-ready content...',
    'Building your monetization plan...',
    'Choosing the best-performing output...',
    'Polishing your growth system...',
  ];

  const hookLoadingMessages = [
    'Finding scroll-stopping angles...',
    'Writing curiosity-driven hooks...',
    'Removing generic AI wording...',
    'Ranking the strongest hook...',
    'Polishing hooks for attention...',
  ];

  const activeLoadingMessages =
    generationMode === 'viral_hooks'
      ? hookLoadingMessages
      : growthLoadingMessages;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);

      const savedUsed = localStorage.getItem('generationsUsed');
      const savedPro = localStorage.getItem('isPro');
      const params = new URLSearchParams(window.location.search);

      if (savedUsed) {
        setGenerationsUsed(parseInt(savedUsed));
      }

      if (savedPro === 'true' || params.get('success') === 'true') {
        setIsPro(true);
      }

      if (params.get('success') === 'true') {
        localStorage.setItem('isPro', 'true');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading) return;

    const interval = window.setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % activeLoadingMessages.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [loading, activeLoadingMessages.length]);

  useEffect(() => {
    const loadSavedGenerations = async () => {
      if (!isLoaded) return;

      if (!signedIn || !user?.id) {
        setSavedGenerations([]);
        return;
      }

      setSavedLoading(true);

      try {
        const res = await fetch(
          `/api/saved-generations?clerkUserId=${encodeURIComponent(user.id)}`
        );

        const data = await res.json();

        if (!res.ok) {
          console.warn('Saved generations API error:', data);
          setSavedGenerations([]);
          return;
        }

        setSavedGenerations(data.savedGenerations || []);
      } catch (error) {
        console.warn('Load saved generations warning:', error);
        setSavedGenerations([]);
      } finally {
        setSavedLoading(false);
      }
    };

    loadSavedGenerations();
  }, [isLoaded, signedIn, user?.id]);

  const handleUpgrade = async () => {
    if (!isLoaded) {
      alert('Please wait a second while your account loads.');
      return;
    }

    if (!signedIn || !user?.id) {
      alert('Please sign in before upgrading.');
      return;
    }

    setUpgradeLoading(true);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to create checkout session.');
      }

      if (!data.url) {
        throw new Error('No Stripe checkout URL returned.');
      }

      window.location.href = data.url;
    } catch (error) {
      alert('Could not start checkout. Please check your Stripe setup.');
      console.error('Upgrade error:', error);
    } finally {
      setUpgradeLoading(false);
    }
  };

  const generateContent = async () => {
    if (!isLoaded) {
      alert('Please wait a second while your account loads.');
      return;
    }

    if (!signedIn) {
      alert('Please sign in before generating content.');
      return;
    }

    if (!content.trim()) {
      alert('Please enter a content idea first.');
      return;
    }

    if (!isPro && generationsUsed >= MAX_FREE) {
      alert("You've reached your 10 free generations. Upgrade to Pro!");
      return;
    }

    setLoading(true);
    setResults(null);
    setLoadingStep(0);

    if (generationMode === 'viral_hooks') {
      setActiveTab('hooks');
    } else {
      setActiveTab('strategy');
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, selectedVoice, goal, generationMode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Something went wrong');
      }

      setResults(data);

      if (!isPro) {
        const nextUsed = Math.min(generationsUsed + 1, MAX_FREE);
        setGenerationsUsed(nextUsed);
        localStorage.setItem('generationsUsed', String(nextUsed));
      }
    } catch (error) {
      alert(
        'Error generating content. Please make sure you are signed in and your API route is working.'
      );
      console.error('Generate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentGeneration = async () => {
    if (!isLoaded) {
      alert('Please wait a second while your account loads.');
      return;
    }

    if (!signedIn || !user?.id) {
      alert('Please sign in before saving results.');
      return;
    }

    if (!results) {
      alert('Generate something first before saving.');
      return;
    }

    setSavedMessage('Saving...');

    try {
      const res = await fetch('/api/saved-generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId: user.id,
          title: content.trim().slice(0, 70) || 'Untitled generation',
          input: content,
          mode: generationMode,
          goal,
          voice: selectedVoice,
          results,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to save generation.');
      }

      const savedGeneration = data.savedGeneration as SavedGeneration;

      setSavedGenerations((prev) =>
        [savedGeneration, ...prev].slice(0, MAX_SAVED)
      );

      setSavedMessage('Saved!');
      setTimeout(() => setSavedMessage(''), 1500);
    } catch (error) {
      console.error('Save generation error:', error);
      setSavedMessage('');
      alert('Could not save this generation. Please try again.');
    }
  };

  const loadSavedGeneration = (saved: SavedGeneration) => {
    setContent(saved.input);
    setGenerationMode(saved.mode);
    setGoal(saved.goal);
    setSelectedVoice(saved.voice);
    setResults(saved.results);

    if (saved.mode === 'viral_hooks') {
      setActiveTab('hooks');
    } else {
      setActiveTab('strategy');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSavedGeneration = async (id: string) => {
    if (!user?.id) {
      alert('Please sign in first.');
      return;
    }

    try {
      const res = await fetch(`/api/saved-generations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to delete saved generation.');
      }

      setSavedGenerations((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Delete saved generation error:', error);
      alert('Could not delete this saved generation.');
    }
  };

  const clearAllSavedGenerations = async () => {
    if (!user?.id) {
      alert('Please sign in first.');
      return;
    }

    const confirmed = window.confirm('Delete all saved generations?');
    if (!confirmed) return;

    try {
      const res = await fetch('/api/saved-generations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to clear saved generations.');
      }

      setSavedGenerations([]);
    } catch (error) {
      console.error('Clear saved generations error:', error);
      alert('Could not clear saved generations.');
    }
  };

  const loadNextExample = () => {
    const nextIndex = (currentExampleIndex + 1) % examples.length;
    setCurrentExampleIndex(nextIndex);
    setContent(examples[nextIndex]);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(label);

    setTimeout(() => {
      setCopiedItem('');
    }, 1500);
  };

  const formatSavedDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return 'Saved';
    }
  };

  const freeLeft = mounted
    ? isPro
      ? '∞'
      : Math.max(0, MAX_FREE - generationsUsed)
    : MAX_FREE;

  const growthTabs = [
    { id: 'strategy', label: 'Strategy', icon: '🎯' },
    { id: 'content', label: 'Content', icon: '🚀' },
    { id: 'monetization', label: 'Money Plan', icon: '💰' },
  ] as const;

  const hooksTabs = [{ id: 'hooks', label: 'Viral Hooks', icon: '🔥' }] as const;

  const activeTabs = generationMode === 'viral_hooks' ? hooksTabs : growthTabs;

  const savedGenerationsCard = (
    <div className="w-full min-w-0 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-2xl">
            Saved Generations
          </h2>
          <p className="text-xs text-zinc-500 sm:text-sm">
            Reopen your best outputs across devices.
          </p>
        </div>

        {signedIn && savedGenerations.length > 0 && (
          <button
            onClick={clearAllSavedGenerations}
            className="rounded-xl bg-zinc-800 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-700"
          >
            Clear All
          </button>
        )}
      </div>

      {!isLoaded || savedLoading ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-3 text-center">
          <p className="text-xs text-zinc-400">Loading saved generations...</p>
        </div>
      ) : !signedIn ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-3 text-center">
          <p className="text-xs text-zinc-400">
            Sign in after generating to save your best result.
          </p>
        </div>
      ) : savedGenerations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-700 p-3 text-center">
          <p className="text-xs text-zinc-400">No saved generations yet.</p>
        </div>
      ) : (
        <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
          {savedGenerations.map((saved) => (
            <div
              key={saved.id}
              className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100 sm:text-base">
                    {saved.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {saved.mode === 'viral_hooks'
                      ? '🔥 Viral Hooks'
                      : '🚀 Growth System'}{' '}
                    • {saved.goal} • {formatSavedDate(saved.createdAt)}
                  </p>
                </div>

                <button
                  onClick={() => deleteSavedGeneration(saved.id)}
                  className="text-xs text-zinc-500 transition hover:text-red-400"
                >
                  Delete
                </button>
              </div>

              <button
                onClick={() => loadSavedGeneration(saved)}
                className="mt-3 w-full rounded-xl bg-zinc-700 py-2 text-sm transition hover:bg-zinc-600"
              >
                Open Saved
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const accountPanel = (
    <div className="rounded-3xl bg-white p-4 text-black shadow-2xl sm:p-6">
      {!isLoaded ? (
        <>
          <p className="mb-1 text-base font-semibold sm:text-lg">
            Loading account...
          </p>
          <p className="text-sm text-zinc-600">Checking your sign-in status.</p>
        </>
      ) : !signedIn ? (
        <>
          <p className="mb-1 text-lg font-semibold sm:text-xl">
            Create your free Hummingbird workspace
          </p>
          <p className="mb-3 text-sm leading-relaxed text-zinc-600">
              Save your best generations, reopen them later, and build a
              repeatable content system.
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            <SignInButton mode="modal">
              <button className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="w-full rounded-2xl border border-zinc-300 bg-zinc-100 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
                Create Free Workspace
              </button>
            </SignUpButton>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold sm:text-lg">Account</p>
              <p className="text-sm text-zinc-600">You are signed in.</p>
            </div>

            <UserButton />
          </div>

            {isPro ? (
              <>
                <p className="mb-1 text-base font-semibold sm:text-lg">
                  Founder Plan Active
                </p>
                <p className="mb-3 text-sm leading-relaxed text-zinc-600">
                  You have unlimited growth systems, viral hooks, saved generations,
                  and creator strategy.
                </p>

                <div className="rounded-2xl bg-black px-4 py-3 text-center text-sm font-semibold text-white">
                  Pro active — unlimited generations
                </div>
              </>
            ) : (
              <>
                <p className="mb-1 text-base font-semibold sm:text-lg">
                  Founder Plan — $19/mo
                </p>
                <p className="mb-3 text-sm leading-relaxed text-zinc-600">
                  Unlock unlimited growth systems, viral hooks, saved generations,
                  and creator strategy before pricing increases.
                </p>

                <button
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
                >
                  {upgradeLoading ? 'Opening checkout...' : 'Upgrade to Founder Plan'}
                </button>
              </>
            )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-8">
        <div className="mb-4 grid gap-4 lg:mb-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 sm:px-4 sm:py-2 sm:text-sm">
              <span className="text-purple-400">✦</span>
              AI Growth Engine for Creators
            </div>

            <h1 className="mb-2 text-[2.35rem] font-bold leading-none text-purple-400 sm:text-5xl lg:mb-4">
              Hummingbird AI
            </h1>

            <h2 className="max-w-4xl text-[1.95rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Turn one idea into viral hooks, content, and monetization.
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:mt-5 sm:text-lg">
              Paste your idea below. Hummingbird builds platform-ready content,
              growth strategy, and revenue angles in seconds.
            </p>
          </div>

          <div className="hidden lg:block">{accountPanel}</div>
        </div>

        <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[0.95fr_1.2fr] lg:items-start lg:gap-8">
          <div className="order-1 min-w-0">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-6">
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-400">
                    What do you want to create?
                  </p>

                  <button
                    onClick={loadNextExample}
                    className="text-xs font-medium text-purple-400 hover:text-purple-300"
                  >
                    ✨ Example
                  </button>
                </div>

                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    generationMode === 'viral_hooks'
                      ? 'Example: My 7-day content calendar that grew my Instagram to 50k followers...'
                      : 'Example: How I turned one viral TikTok into $8k in affiliate sales...'
                  }
                  className="h-28 w-full max-w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-purple-500 sm:h-48 sm:p-5 sm:text-base"
                />
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Mode
                </p>
                <div className="grid min-w-0 grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setGenerationMode('growth_system');
                      setActiveTab('content');
                      setResults(null);
                    }}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      generationMode === 'growth_system'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🚀 System
                  </button>

                  <button
                    onClick={() => {
                      setGenerationMode('viral_hooks');
                      setActiveTab('hooks');
                      setResults(null);
                    }}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      generationMode === 'viral_hooks'
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🔥 Hooks
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Goal
                </p>
                <div className="grid min-w-0 grid-cols-3 gap-2">
                  {[
                    { id: 'growth', label: 'Grow' },
                    { id: 'viral', label: 'Viral' },
                    { id: 'sales', label: 'Sales' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`rounded-2xl px-2 py-2.5 text-sm font-medium transition ${
                        goal === g.id
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Voice
                </p>
                <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`shrink-0 rounded-2xl px-3 py-2 text-xs transition sm:text-sm ${
                        selectedVoice === v.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {signedIn ? (
                <button
                  onClick={generateContent}
                  disabled={loading || !content.trim() || !isLoaded}
                  className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 sm:py-5 sm:text-lg ${
                    generationMode === 'viral_hooks'
                      ? 'bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600'
                      : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}
                >
                  {loading
                    ? generationMode === 'viral_hooks'
                      ? 'Generating hooks...'
                      : 'Building system...'
                    : generationMode === 'viral_hooks'
                      ? 'Generate 10 Viral Hooks'
                      : 'Generate My Growth System'}
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button
                    disabled={!content.trim() || !isLoaded}
                    className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 sm:py-5 sm:text-lg ${
                      generationMode === 'viral_hooks'
                        ? 'bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600'
                    }`}
                  >
                    Create Free Workspace to Generate
                  </button>
                </SignInButton>
              )}

              <div className="mt-2.5 flex items-center justify-between text-xs text-zinc-400">
                <p>{freeLeft} free generations left</p>
                <p>
                  {isPro
                    ? 'Pro active'
                    : signedIn
                      ? 'Free plan'
                      : 'Sign in required'}
                </p>
              </div>
            </div>
            <div className="mt-4 hidden lg:block">{savedGenerationsCard}</div>
          </div>

          <div className="order-2 min-w-0 rounded-3xl border border-zinc-800 bg-zinc-900/90 p-4 sm:p-6 lg:sticky lg:top-6 lg:flex lg:h-[760px] lg:flex-col">
            <div className="mb-3 flex shrink-0 flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  {generationMode === 'viral_hooks'
                    ? 'Your Viral Hook Engine'
                    : 'Your AI Growth System'}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400 sm:text-lg">
                  {generationMode === 'viral_hooks'
                    ? 'Scroll-stopping hooks designed to earn attention fast.'
                    : 'Strategy, platform-ready content, and monetization angles.'}
                </p>
              </div>

              {results && signedIn && (
                <button
                  onClick={saveCurrentGeneration}
                  className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
                >
                  {savedMessage || 'Save Result'}
                </button>
              )}
            </div>

            <div className="mb-3 flex min-w-0 shrink-0 flex-wrap gap-2">
              {activeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                {!results && !loading && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/30 p-5 text-center sm:min-h-[420px] lg:h-full">
                    <div className="mb-3 text-4xl">
                      {generationMode === 'viral_hooks' ? '🔥' : '✦'}
                    </div>

                    <p className="mb-2 text-xl font-semibold sm:text-2xl">
                      {generationMode === 'viral_hooks'
                        ? 'Turn your idea into scroll-stopping hooks'
                        : 'Turn your idea into a complete growth system'}
                    </p>

                    <p className="max-w-md text-sm leading-relaxed text-zinc-400 sm:text-base">
                      {generationMode === 'viral_hooks'
                        ? 'Generate 10 attention-grabbing hooks with angles, explanations, and a strongest-hook pick.'
                        : 'Get strategy, platform-ready content, high-performing hooks, and monetization angles in one run.'}
                    </p>

                    <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2 text-xs text-zinc-300 sm:grid-cols-3">
                      {(generationMode === 'viral_hooks'
                        ? ['10 hooks', 'Best hook', 'Why it works']
                        : ['Strategy', 'Content', 'Money plan']
                      ).map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-center"
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {loading && (
                <div className="flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950/40 p-6 text-center sm:min-h-[480px] lg:h-full">
                  <div className="relative mb-5">
                    <div className="h-16 w-16 rounded-full border-4 border-zinc-800 sm:h-24 sm:w-24"></div>
                    <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-r-pink-500 border-t-purple-500 sm:h-24 sm:w-24"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl">
                      {generationMode === 'viral_hooks' ? '🔥' : '✦'}
                    </div>
                  </div>

                  <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                    {generationMode === 'viral_hooks'
                      ? 'Generating 10 viral hooks...'
                      : 'Building your growth system...'}
                  </h3>

                  <p className="min-h-[24px] max-w-md text-sm text-zinc-300 sm:text-base">
                    {activeLoadingMessages[loadingStep]}
                  </p>

                  <p className="mt-3 text-xs text-zinc-500 sm:text-sm">
                    This usually takes 15–25 seconds for higher-quality output.
                  </p>
                </div>
              )}

              {results &&
                activeTab === 'hooks' &&
                generationMode === 'viral_hooks' && (
                  <div className="space-y-4">
                    {results.best_hook && (
                      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 p-5">
                        <h3 className="mb-2 text-lg font-semibold">
                          🔥 Strongest Viral Hook
                        </h3>
                        <p className="mb-4 text-sm opacity-90">
                          {results.best_hook.reason}
                        </p>
                        <div className="rounded-xl bg-black/25 p-4">
                          <p className="text-lg font-semibold">
                            {results.best_hook.hook}
                          </p>
                        </div>
                      </div>
                    )}

                    {(results.hooks || []).map((item, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5"
                      >
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-pink-400">
                              🔥 Hook #{i + 1}
                            </h3>
                            <p className="mt-1 text-xs capitalize text-zinc-500">
                              {item.angle || 'Attention-driven hook'}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              copyToClipboard(item.hook || '', `Hook ${i + 1}`)
                            }
                            className="rounded-xl bg-zinc-700 px-3 py-1.5 text-xs transition hover:bg-zinc-600"
                          >
                            {copiedItem === `Hook ${i + 1}`
                              ? 'Copied!'
                              : 'Copy'}
                          </button>
                        </div>

                        <p className="text-lg font-medium leading-relaxed text-zinc-100">
                          {item.hook}
                        </p>

                        {item.why_it_works && (
                          <p className="mt-3 text-sm text-zinc-400">
                            Why it works: {item.why_it_works}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {results &&
                activeTab === 'strategy' &&
                generationMode === 'growth_system' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-2 font-semibold text-purple-400">
                        🎯 Target Audience
                      </h3>
                      <p className="text-zinc-200">
                        {results.strategy?.target_audience ||
                          'Creators, entrepreneurs, and online businesses trying to grow.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-2 font-semibold text-purple-400">
                        🧠 Core Content Angle
                      </h3>
                      <p className="text-zinc-200">
                        {results.strategy?.core_angle ||
                          'Position the idea as a practical, high-value system that saves time and creates results.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-3 font-semibold text-purple-400">
                        🔥 High-Performing Hooks
                      </h3>
                      <div className="space-y-2">
                        {(results.strategy?.hook_strategies || []).map(
                          (hook, i) => (
                            <p key={i} className="text-zinc-200">
                              • {hook}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-2 font-semibold text-purple-400">
                        📈 Why This Will Work
                      </h3>
                      <p className="text-zinc-200">
                        {results.strategy?.why_it_works ||
                          'This strategy is designed to create curiosity, make the content feel useful immediately, and guide the audience toward action.'}
                      </p>
                    </div>
                  </div>
                )}

              {results &&
                activeTab === 'content' &&
                generationMode === 'growth_system' && (
                  <div className="space-y-4">
                    {results.best_output && (
                      <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 p-5">
                        <h3 className="mb-2 text-lg font-semibold">
                          ⭐ Best Performing Content
                        </h3>
                        <p className="mb-2 text-sm opacity-80">
                          {results.best_output.platform}
                        </p>
                        <p className="mb-4 text-sm opacity-90">
                          {results.best_output.reason}
                        </p>
                        <div className="rounded-xl bg-black/25 p-4">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {results.best_output.content}
                          </p>
                        </div>
                      </div>
                    )}

                    {Object.entries(results.content || {}).map(
                      ([platform, text]) => (
                        <div
                          key={platform}
                          className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5"
                        >
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-purple-400">
                                🚀 {platform}
                              </h3>
                              <p className="mt-1 text-xs text-zinc-500">
                                Optimized for platform-native performance
                              </p>
                            </div>

                            <button
                              onClick={() => copyToClipboard(text, platform)}
                              className="rounded-xl bg-zinc-700 px-3 py-1.5 text-xs transition hover:bg-zinc-600"
                            >
                              {copiedItem === platform ? 'Copied!' : 'Copy'}
                            </button>
                          </div>

                          <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">
                            {text}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}

              {results &&
                activeTab === 'monetization' &&
                generationMode === 'growth_system' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-3 font-semibold text-purple-400">
                        💰 Revenue Opportunities
                      </h3>
                      <div className="space-y-2">
                        {(results.monetization?.offer_ideas || []).map(
                          (offer, i) => (
                            <p key={i} className="text-zinc-200">
                              • {offer}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-3 font-semibold text-purple-400">
                        🧲 Lead Magnet Idea
                      </h3>
                      <p className="text-zinc-200">
                        {results.monetization?.lead_magnet ||
                          'Create a simple checklist, template, or guide related to this content idea.'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">
                      <h3 className="mb-3 font-semibold text-purple-400">
                        ⚡ Conversion Strategy
                      </h3>
                      <p className="text-zinc-200">
                        {results.monetization?.cta_strategy ||
                          'Use a direct CTA that connects the content promise to a clear next step.'}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="order-3 min-w-0 lg:hidden">{accountPanel}</div>



          <div className="order-4 min-w-0 lg:hidden">{savedGenerationsCard}</div>
        </div>
      </div>
    </div>
  );
}
