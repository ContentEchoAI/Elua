'use client';

import { useState, useEffect } from 'react';
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

  const MAX_FREE = 10;
  const MAX_SAVED = 20;

  const voices = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'energetic', label: 'Energetic' },
    { id: 'authoritative', label: 'Authoritative' },
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

  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  useEffect(() => {
    const savedUsed = localStorage.getItem('generationsUsed');
    const savedPro = localStorage.getItem('isPro');

    if (savedUsed) setGenerationsUsed(parseInt(savedUsed));
    if (savedPro === 'true') setIsPro(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('success') === 'true') {
      setIsPro(true);
      localStorage.setItem('isPro', 'true');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

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

  const freeLeft = isPro ? '∞' : Math.max(0, MAX_FREE - generationsUsed);

  const growthTabs = [
    { id: 'strategy', label: 'Strategy', icon: '🎯' },
    { id: 'content', label: 'Content', icon: '🚀' },
    { id: 'monetization', label: 'Money Plan', icon: '💰' },
  ] as const;

  const hooksTabs = [{ id: 'hooks', label: 'Viral Hooks', icon: '🔥' }] as const;

  const activeTabs = generationMode === 'viral_hooks' ? hooksTabs : growthTabs;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full text-sm text-zinc-300 mb-4">
              <span className="text-purple-400">✦</span>
              AI Growth Engine for Creators
            </div>

            <h1 className="text-4xl font-bold text-purple-400 mb-4">
              Hummingbird AI
            </h1>

            <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight leading-tight max-w-4xl">
              Turn one idea into content, hooks, strategy, and monetization.
            </h2>

            <p className="text-zinc-400 text-base lg:text-lg mt-5 max-w-2xl">
              Generate platform-ready posts, viral hooks, growth strategy, and
              revenue angles from one simple idea.
            </p>
          </div>

          <div className="bg-white text-black rounded-3xl p-6 h-fit min-w-[280px] lg:max-w-[380px] shadow-2xl">
            {!isLoaded ? (
              <>
                <p className="font-semibold text-lg mb-2">Loading account...</p>
                <p className="text-sm text-zinc-600">
                  Checking your sign-in status.
                </p>
              </>
            ) : !signedIn ? (
              <>
                <p className="font-semibold text-lg mb-2">
                  Start using Hummingbird
                </p>
                <p className="text-sm text-zinc-600 mb-5">
                  Sign in to generate content systems, viral hooks, and save your
                  best results.
                </p>

                <div className="space-y-3">
                  <SignInButton mode="modal">
                    <button className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:scale-105 transition">
                      Sign In
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button className="w-full bg-zinc-100 text-black py-3 rounded-2xl font-semibold hover:scale-105 transition border border-zinc-300">
                      Create Account
                    </button>
                  </SignUpButton>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4 mb-5">
                  <div>
                    <p className="font-semibold text-lg">Account</p>
                    <p className="text-sm text-zinc-600">You are signed in.</p>
                  </div>

                  <UserButton />
                </div>

                <p className="font-semibold text-lg mb-2">
                  Founder Price — $19/mo
                </p>
                <p className="text-sm text-zinc-600 mb-5">
                  Lock in unlimited content systems and viral hooks before
                  pricing increases.
                </p>

                <button
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  className="w-full bg-black text-white py-3 rounded-2xl font-semibold hover:scale-105 transition disabled:opacity-60 disabled:hover:scale-100"
                >
                  {upgradeLoading ? 'Opening checkout...' : 'Upgrade $19/mo'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[0.92fr_1.28fr] gap-8 items-start">
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <div className="mb-6">
                <p className="mb-3 text-zinc-400 font-medium">
                  Choose generation mode:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setGenerationMode('growth_system');
                      setActiveTab('content');
                      setResults(null);
                    }}
                    className={`px-4 py-3 rounded-2xl font-medium transition ${
                      generationMode === 'growth_system'
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🚀 Growth System
                  </button>

                  <button
                    onClick={() => {
                      setGenerationMode('viral_hooks');
                      setActiveTab('hooks');
                      setResults(null);
                    }}
                    className={`px-4 py-3 rounded-2xl font-medium transition ${
                      generationMode === 'viral_hooks'
                        ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/30'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    🔥 Viral Hooks
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <p className="mb-3 text-zinc-400 font-medium">
                  Choose your goal:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'growth', label: 'Grow' },
                    { id: 'viral', label: 'Go Viral' },
                    { id: 'sales', label: 'Make Money' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`px-4 py-3 rounded-2xl font-medium transition ${
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

              <div className="mb-6">
                <p className="mb-3 text-zinc-400 font-medium">
                  Choose your brand voice:
                </p>
                <div className="flex flex-wrap gap-3">
                  {voices.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVoice(v.id)}
                      className={`px-4 py-2.5 rounded-2xl transition ${
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

              <button
                onClick={loadNextExample}
                className="mb-4 text-purple-400 hover:text-purple-300 text-sm font-medium"
              >
                ✨ Try a high-performing example
              </button>

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  generationMode === 'viral_hooks'
                    ? 'Enter a content idea and Hummingbird will generate 10 viral hooks...'
                    : 'Enter your content idea, video topic, blog post, podcast concept, or raw thought...'
                }
                className="w-full h-56 bg-zinc-800 border border-zinc-700 focus:border-purple-500 outline-none p-5 rounded-2xl text-zinc-100 placeholder:text-zinc-500 resize-none"
              />

              <button
                onClick={generateContent}
                disabled={loading || !content.trim() || !isLoaded}
                className={`mt-5 w-full py-5 rounded-2xl font-semibold text-lg hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 ${
                  generationMode === 'viral_hooks'
                    ? 'bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600'
                }`}
              >
                {loading
                  ? generationMode === 'viral_hooks'
                    ? 'Generating 10 viral hooks...'
                    : 'Building your content system...'
                  : generationMode === 'viral_hooks'
                    ? 'Generate 10 Viral Hooks'
                    : 'Generate Growth System'}
              </button>

              <div className="flex justify-between items-center mt-4 text-sm text-zinc-400">
                <p>{freeLeft} free generations left</p>
                <p>
                  {isPro ? 'Pro active' : signedIn ? 'Free plan' : 'Signed out'}
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
              <div className="flex justify-between items-center gap-4 mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Saved Generations</h2>
                  <p className="text-sm text-zinc-500">
                    Database-backed saves across devices.
                  </p>
                </div>

                {signedIn && savedGenerations.length > 0 && (
                  <button
                    onClick={clearAllSavedGenerations}
                    className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {!isLoaded || savedLoading ? (
                <div className="border border-dashed border-zinc-700 rounded-2xl p-5 text-center">
                  <p className="text-zinc-400 text-sm">
                    Loading saved generations...
                  </p>
                </div>
              ) : !signedIn ? (
                <div className="border border-dashed border-zinc-700 rounded-2xl p-5 text-center">
                  <p className="text-zinc-400 text-sm">
                    Sign in to save and reopen generations.
                  </p>
                </div>
              ) : savedGenerations.length === 0 ? (
                <div className="border border-dashed border-zinc-700 rounded-2xl p-5 text-center">
                  <p className="text-zinc-400 text-sm">
                    No saved generations yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {savedGenerations.map((saved) => (
                    <div
                      key={saved.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4"
                    >
                      <div className="flex justify-between gap-3 items-start">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100 truncate">
                            {saved.title}
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            {saved.mode === 'viral_hooks'
                              ? '🔥 Viral Hooks'
                              : '🚀 Growth System'}{' '}
                            • {saved.goal} • {formatSavedDate(saved.createdAt)}
                          </p>
                        </div>

                        <button
                          onClick={() => deleteSavedGeneration(saved.id)}
                          className="text-xs text-zinc-500 hover:text-red-400 transition"
                        >
                          Delete
                        </button>
                      </div>

                      <button
                        onClick={() => loadSavedGeneration(saved)}
                        className="mt-3 w-full bg-zinc-700 hover:bg-zinc-600 text-sm py-2 rounded-xl transition"
                      >
                        Open Saved
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl flex flex-col h-[760px] lg:sticky lg:top-6">
            <div className="mb-5 flex flex-col sm:flex-row justify-between gap-4 sm:items-start shrink-0">
              <div>
                <h2 className="text-2xl font-semibold">
                  {generationMode === 'viral_hooks'
                    ? 'Your Viral Hook Engine'
                    : 'Your AI Growth System'}
                </h2>
                <p className="text-zinc-400 mt-1">
                  {generationMode === 'viral_hooks'
                    ? 'Scroll-stopping hooks designed to earn attention fast.'
                    : 'Strategy, platform-ready content, and monetization angles.'}
                </p>
              </div>

              {results && signedIn && (
                <button
                  onClick={saveCurrentGeneration}
                  className="bg-white text-black px-4 py-2.5 rounded-2xl font-semibold hover:scale-105 transition"
                >
                  {savedMessage || 'Save Result'}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3 mb-5 shrink-0">
              {activeTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-2xl font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              {!results && !loading && (
                <div className="h-full border border-dashed border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                  <div className="text-5xl mb-4">
                    {generationMode === 'viral_hooks' ? '🔥' : '✦'}
                  </div>
                  <p className="text-xl font-semibold mb-2">
                    {generationMode === 'viral_hooks'
                      ? 'Your viral hooks will appear here'
                      : 'Your results will appear here'}
                  </p>
                  <p className="text-zinc-500 max-w-md">
                    {generationMode === 'viral_hooks'
                      ? 'Add an idea and Hummingbird will generate hooks built for attention.'
                      : 'Add an idea, choose a goal, and Hummingbird will build your content system.'}
                  </p>
                </div>
              )}

              {loading && (
                <div className="h-full flex flex-col items-center justify-center text-center border border-zinc-800 rounded-3xl bg-zinc-950/40 p-8 overflow-hidden">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full border-4 border-zinc-800"></div>
                    <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">
                      {generationMode === 'viral_hooks' ? '🔥' : '✦'}
                    </div>
                  </div>

                  <h3 className="text-2xl font-semibold mb-3">
                    {generationMode === 'viral_hooks'
                      ? 'Generating 10 viral hooks...'
                      : 'Building your growth system...'}
                  </h3>

                  <p className="text-zinc-300 max-w-md min-h-[28px]">
                    {activeLoadingMessages[loadingStep]}
                  </p>

                  <p className="text-zinc-500 text-sm mt-4">
                    This usually takes 15–25 seconds for higher-quality output.
                  </p>
                </div>
              )}

              {results &&
                activeTab === 'hooks' &&
                generationMode === 'viral_hooks' && (
                  <div className="space-y-5">
                    {results.best_hook && (
                      <div className="bg-gradient-to-r from-orange-500 via-pink-600 to-purple-600 p-5 rounded-2xl">
                        <h3 className="text-lg font-semibold mb-2">
                          🔥 Strongest Viral Hook
                        </h3>
                        <p className="text-sm opacity-90 mb-4">
                          {results.best_hook.reason}
                        </p>
                        <div className="bg-black/25 p-4 rounded-xl">
                          <p className="text-lg font-semibold">
                            {results.best_hook.hook}
                          </p>
                        </div>
                      </div>
                    )}

                    {(results.hooks || []).map((item, i) => (
                      <div
                        key={i}
                        className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl"
                      >
                        <div className="flex justify-between gap-4 items-start mb-4">
                          <div>
                            <h3 className="text-pink-400 font-semibold">
                              🔥 Hook #{i + 1}
                            </h3>
                            <p className="text-xs text-zinc-500 mt-1 capitalize">
                              {item.angle || 'Attention-driven hook'}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              copyToClipboard(item.hook || '', `Hook ${i + 1}`)
                            }
                            className="text-xs bg-zinc-700 px-3 py-1.5 rounded-xl hover:bg-zinc-600 transition"
                          >
                            {copiedItem === `Hook ${i + 1}`
                              ? 'Copied!'
                              : 'Copy'}
                          </button>
                        </div>

                        <p className="text-zinc-100 text-lg font-medium leading-relaxed">
                          {item.hook}
                        </p>

                        {item.why_it_works && (
                          <p className="text-zinc-400 text-sm mt-3">
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
                  <div className="space-y-5">
                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-2">
                        🎯 Target Audience
                      </h3>
                      <p className="text-zinc-200">
                        {results.strategy?.target_audience ||
                          'Creators, entrepreneurs, and online businesses trying to grow.'}
                      </p>
                    </div>

                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-2">
                        🧠 Core Content Angle
                      </h3>
                      <p className="text-zinc-200">
                        {results.strategy?.core_angle ||
                          'Position the idea as a practical, high-value system that saves time and creates results.'}
                      </p>
                    </div>

                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-3">
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

                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-2">
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
                  <div className="space-y-5">
                    {results.best_output && (
                      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-5 rounded-2xl">
                        <h3 className="text-lg font-semibold mb-2">
                          ⭐ Best Performing Content
                        </h3>
                        <p className="text-sm opacity-80 mb-2">
                          {results.best_output.platform}
                        </p>
                        <p className="text-sm mb-4 opacity-90">
                          {results.best_output.reason}
                        </p>
                        <div className="bg-black/25 p-4 rounded-xl">
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
                          className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl"
                        >
                          <div className="flex justify-between gap-4 items-start mb-4">
                            <div>
                              <h3 className="text-purple-400 font-semibold">
                                🚀 {platform}
                              </h3>
                              <p className="text-xs text-zinc-500 mt-1">
                                Optimized for platform-native performance
                              </p>
                            </div>

                            <button
                              onClick={() => copyToClipboard(text, platform)}
                              className="text-xs bg-zinc-700 px-3 py-1.5 rounded-xl hover:bg-zinc-600 transition"
                            >
                              {copiedItem === platform ? 'Copied!' : 'Copy'}
                            </button>
                          </div>

                          <p className="whitespace-pre-wrap text-zinc-200 leading-relaxed">
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
                  <div className="space-y-5">
                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-3">
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

                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-3">
                        🧲 Lead Magnet Idea
                      </h3>
                      <p className="text-zinc-200">
                        {results.monetization?.lead_magnet ||
                          'Create a simple checklist, template, or guide related to this content idea.'}
                      </p>
                    </div>

                    <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-2xl">
                      <h3 className="text-purple-400 font-semibold mb-3">
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
        </div>
      </div>
    </div>
  );
}