'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { track } from '@vercel/analytics';
type EventProps = Record<string, string | number | boolean | null>;
function logEvent(name: string, props?: EventProps) {
  track(name, props);
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, props }),
  }).catch(() => {});
}
import { uploadAllImages } from '@/lib/uploadAllImages';
import { uploadVideoDirect } from '@/lib/uploadVideoDirect';
import { publishPostToInstagram } from '@/lib/publishToInstagram';
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

type Monetization = {
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

type BestOutput = {
  platform?: string;
  reason?: string;
  content?: string;
};

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

type ViralHook = {
  hook?: string;
  angle?: string;
  why_it_works?: string;
};

type Results = {
  profile_guess?: { businessType?: string; services?: string; idealClient?: string; mainCta?: string };
  mode?: 'growth_system' | 'viral_hooks' | 'make_my_post';
  strategy?: Strategy;
  best_output?: BestOutput;
  content?: Record<string, string>;
  structured_content?: StructuredContent;
  production_plan?: ProductionPlan;
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
  mode: 'growth_system' | 'viral_hooks' | 'make_my_post';
  goal: string;
  voice: string;
  createdAt: string;
  results: Results;
};

type BusinessProfile = {
  businessType: string;
  services: string;
  idealClient: string;
  mainCta: string;
  notes: string;
};

type UploadedImage = {
  id: string;
  name: string;
  dataUrl: string;
  sourceType: 'image' | 'video_frame';
  sourceName?: string;
  sourceLabel?: string;
};

type MetaManagedPage = {
  id: string;
  name: string;
  tasks: string[];
  instagramAccount: {
    id: string;
    username: string | null;
  } | null;
};

type MetaStatus = {
  connected: boolean;
  configured: boolean;
  authorizationUrl: string | null;
  reconnectRequired: boolean;
  missingScopes: string[];
  selectedPage: {
    id: string;
    name: string;
  } | null;
  instagramAccount: {
    id: string;
    username: string | null;
  } | null;
  publishingEnabled: boolean;
  platforms: { name: string; connected: boolean }[];
  message: string;
};

const emptyBusinessProfile: BusinessProfile = {
  businessType: '',
  services: '',
  idealClient: '',
  mainCta: '',
  notes: '',
};

type ApprovedPost = {
  id: string;
  createdAt: string;
  platform: string;
  title: string;
  caption: string;
  cta: string;
  dmReply: string;
  hashtags: string[];
  mediaCount: number;
  mediaUrls?: string[];
  status: 'approved_not_posted' | 'publishing' | 'posted' | 'failed';
  publishedAt?: string;
  metaPostId?: string;
  permalinkUrl?: string;
  publishError?: string;
  instagramStatus?: 'approved_not_posted' | 'publishing' | 'posted' | 'failed';
  instagramPublishedAt?: string;
  instagramMetaPostId?: string;
  instagramPermalinkUrl?: string;
  instagramPublishError?: string;
};

const APPROVED_POSTS_STORAGE_KEY = 'hummingbird-approved-posts-v1';

function createApprovedPostId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `approved-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadApprovedPostsFromStorage(): ApprovedPost[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(APPROVED_POSTS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as unknown;

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is ApprovedPost => {
        const post = item as Partial<ApprovedPost>;

        return (
          typeof post.id === 'string' &&
          typeof post.createdAt === 'string' &&
          typeof post.platform === 'string' &&
          typeof post.caption === 'string'
        );
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

function saveApprovedPostsToStorage(posts: ApprovedPost[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      APPROVED_POSTS_STORAGE_KEY,
      JSON.stringify(posts.slice(0, 12))
    );
  } catch {
    // Local storage can fail in private browsing or locked-down browsers.
  }
}

export default function Home() {
  const { isLoaded, isSignedIn, user } = useUser();

  const signedIn = isLoaded && isSignedIn;
  const [guestUsed, setGuestUsed] = useState(false);
  useEffect(() => {
    try {
      if (window.localStorage.getItem('eluaGuestUsed')) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time init from localStorage
        setGuestUsed(true);
      }
    } catch {}
  }, []);

  const [content, setContent] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('professional');
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);
  const [results, setResults] = useState<Results | null>(null);
  const [generateError, setGenerateError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'strategy' | 'content' | 'monetization' | 'hooks'
  >('content');
  const [showDetailedPlan, setShowDetailedPlan] = useState(false);
  const [goal, setGoal] = useState('growth');
  const [generationMode, setGenerationMode] = useState<
    'growth_system' | 'viral_hooks' | 'make_my_post'
  >('make_my_post');
  const [copiedItem, setCopiedItem] = useState('');
  const [savedGenerations, setSavedGenerations] = useState<SavedGeneration[]>(
    []
  );
  const [savedMessage, setSavedMessage] = useState('');
  const [recentGenerationHistory, setRecentGenerationHistory] = useState<SavedGeneration[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(
    emptyBusinessProfile
  );
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [demoLoading, setDemoLoading] = useState(false);
  const [loadingDemoId, setLoadingDemoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState('');
  const [metaStatus, setMetaStatus] = useState<MetaStatus | null>(null);
  const [metaStatusLoading, setMetaStatusLoading] = useState(false);
  const [metaPages, setMetaPages] = useState<MetaManagedPage[]>([]);
  const [metaPagesLoading, setMetaPagesLoading] = useState(false);
  const [selectedMetaPageId, setSelectedMetaPageId] = useState('');
  const [metaPublishingSaving, setMetaPublishingSaving] = useState(false);
  const [metaPageSelectionLoading, setMetaPageSelectionLoading] =
    useState(false);
  const [metaPageMessage, setMetaPageMessage] = useState('');
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishingFacebookId, setPublishingFacebookId] = useState(''); const [publishingInstagramId, setPublishingInstagramId] = useState('');
  const [approvedPosts, setApprovedPosts] = useState<ApprovedPost[]>([]);
  const [approvedPostsHydrated, setApprovedPostsHydrated] = useState(false);

  useEffect(() => {
    if (!approvedPostsHydrated) return;

    saveApprovedPostsToStorage(approvedPosts);
  }, [approvedPosts, approvedPostsHydrated]);
  const [publishMessage, setPublishMessage] = useState('');

  const isMakeMyPostMode = generationMode === 'make_my_post';
  const isContentPlanMode =
    generationMode === 'growth_system' || isMakeMyPostMode;

  const MAX_FREE = 5;
  const MAX_SAVED = 20;
  const MAX_UPLOAD_IMAGES = 6;

  const formatGeneratedText = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      return value.map((item) => formatGeneratedText(item)).filter(Boolean).join('\n');
    }
    if (value && typeof value === 'object') {
      return Object.values(value)
        .map((item) => formatGeneratedText(item))
        .filter(Boolean)
        .join('\n');
    }

    return fallback;
  };

  const formatGeneratedList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return value.map((item) => formatGeneratedText(item)).filter(Boolean);
    }
    if (value && typeof value === 'object') {
      return Object.values(value)
        .map((item) => formatGeneratedText(item))
        .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return [value];
    }

    return [];
  };

  const formatStrategyBullets = (value: unknown, fallback = ''): string[] => {
    const text = formatGeneratedText(value, fallback).replace(/\s+/g, ' ').trim();

    if (!text) return [];

    const sentenceMatches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    const bullets = (sentenceMatches || [text])
      .map((item) => item.trim())
      .filter(Boolean);

    if (bullets.length <= 1) {
      return bullets;
    }

    return bullets.slice(0, 4);
  };

  const hasBusinessProfile = Object.values(businessProfile).some((value) =>
    value.trim()
  );

  const updateBusinessProfile = (
    field: keyof BusinessProfile,
    value: string
  ) => {
    setBusinessProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const voices = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'energetic', label: 'Energetic' },
    { id: 'authoritative', label: 'Authority' },
    { id: 'witty', label: 'Witty' },
    { id: 'storytelling', label: 'Storytelling' },
  ];

  const outputOptions = [
    { id: 'Instagram Reel', label: 'Instagram Reel', emoji: '🎬' },
    { id: 'Instagram Carousel', label: 'Instagram Carousel', emoji: '📸' },
    { id: 'TikTok Script', label: 'TikTok', emoji: '🎵', comingSoon: true },
    { id: 'Facebook Post', label: 'Facebook Post', emoji: '📘' },
    { id: 'YouTube Shorts Script', label: 'YouTube Shorts', emoji: '▶️', comingSoon: true },
  ];


function getPlatformDisplayName(value?: string) {
  if (!value) {
    return '';
  }

  return value
    .replace('TikTok Script', 'TikTok')
    .replace('YouTube Shorts Script', 'YouTube Shorts');
}

  const toggleOutput = (outputId: string) => {
    setSelectedOutputs((current) => {
      if (current.includes(outputId)) {
        return current.filter((item) => item !== outputId);
      }

      return [...current, outputId];
    });
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not read image'));
      };
      img.src = objectUrl;
    });

  const seekVideoToTime = (video: HTMLVideoElement, time: number) =>
    new Promise<void>((resolve, reject) => {
      const maxTime = Math.max((video.duration || 1) - 0.05, 0);
      const safeTime = Math.min(Math.max(time, 0), maxTime);

      const timeoutIdRef: { current?: number } = {};

      const cleanup = () => {
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);

        if (timeoutIdRef.current) {
          window.clearTimeout(timeoutIdRef.current);
        }
      };

      const handleSeeked = () => {
        cleanup();
        resolve();
      };

      const handleError = () => {
        cleanup();
        reject(new Error('Could not read a frame from this video.'));
      };

      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);

      timeoutIdRef.current = window.setTimeout(() => {
        cleanup();
        resolve();
      }, 1200);

      video.currentTime = safeTime;
    });

  const extractVideoFrames = (file: File, availableSlots: number) =>
    new Promise<UploadedImage[]>((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement('video');

      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
      };

      video.onerror = () => {
        cleanup();
        reject(new Error(`Could not load video: ${file.name}`));
      };

      video.onloadedmetadata = async () => {
        try {
          const duration =
            Number.isFinite(video.duration) && video.duration > 0
              ? video.duration
              : 1;
          const frameCount = Math.min(3, Math.max(1, availableSlots));
          const sampleTimes =
            frameCount === 1
              ? [duration * 0.5]
              : frameCount === 2
                ? [duration * 0.25, duration * 0.75]
                : [duration * 0.15, duration * 0.5, duration * 0.85];

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');

          if (!context) {
            throw new Error('Could not prepare video frame preview.');
          }

          const sourceWidth = video.videoWidth || 720;
          const sourceHeight = video.videoHeight || 1280;
          const shouldRotatePortraitVideo = sourceWidth > sourceHeight;
          const outputWidth = shouldRotatePortraitVideo ? sourceHeight : sourceWidth;
          const outputHeight = shouldRotatePortraitVideo ? sourceWidth : sourceHeight;
          const scale = Math.min(1, 900 / Math.max(outputWidth, outputHeight));

          canvas.width = Math.max(1, Math.round(outputWidth * scale));
          canvas.height = Math.max(1, Math.round(outputHeight * scale));

          const frames: UploadedImage[] = [];

          for (let index = 0; index < sampleTimes.length; index += 1) {
            await seekVideoToTime(video, sampleTimes[index]);

            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, canvas.width, canvas.height);

            if (shouldRotatePortraitVideo) {
              context.translate(canvas.width, 0);
              context.rotate(Math.PI / 2);
              context.drawImage(video, 0, 0, canvas.height, canvas.width);
            } else {
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
            }

            frames.push({
              id: `${file.name}-frame-${index + 1}-${crypto.randomUUID()}`,
              name: `${file.name} frame ${index + 1}`,
              dataUrl: canvas.toDataURL('image/jpeg', 0.82),
              sourceType: 'video_frame',
              sourceName: file.name,
              sourceLabel: `${file.name} · frame ${index + 1}`,
            });
          }

          cleanup();
          resolve(frames);
        } catch (error) {
          cleanup();
          reject(error);
        }
      };

      video.src = objectUrl;
      video.load();
    });

  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const availableSlots = MAX_UPLOAD_IMAGES - uploadedImages.length;

    if (availableSlots <= 0) {
      alert(`You can upload up to ${MAX_UPLOAD_IMAGES} visual references.`);
      event.target.value = '';
      return;
    }

    const mediaFiles = files
      .filter(
        (file) => file.type.startsWith('image/') || file.type.startsWith('video/')
      )
      .slice(0, availableSlots);

    if (mediaFiles.length === 0) {
      alert('Please upload image or video files only.');
      event.target.value = '';
      return;
    }

    const oversizedFile = mediaFiles.find((file) =>
      file.type.startsWith('video/')
        ? file.size > 25 * 1024 * 1024
        : file.size > 4 * 1024 * 1024
    );

    if (oversizedFile) {
      alert('Please keep each photo under 4MB and each video under 25MB for now.');
      event.target.value = '';
      return;
    }

    try {
      const loadedMedia: UploadedImage[] = [];

      for (const file of mediaFiles) {
        const slotsLeft = MAX_UPLOAD_IMAGES - uploadedImages.length - loadedMedia.length;

        if (slotsLeft <= 0) break;

        if (file.type.startsWith('image/')) {
          loadedMedia.push({
            id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
            name: file.name,
            dataUrl: await readFileAsDataUrl(file),
            sourceType: 'image',
            sourceName: file.name,
            sourceLabel: file.name,
          });
        }

        if (file.type.startsWith('video/')) {
          const videoFrames = await extractVideoFrames(
            file,
            Math.min(3, slotsLeft)
          );

          loadedMedia.push(...videoFrames);
          setUploadedVideoFile(file);
        }
      }

      if (loadedMedia.length === 0) {
        alert('Could not read those files. Please try different photos or a shorter video.');
        event.target.value = '';
        return;
      }

      setUploadedImages((current) =>
        [...current, ...loadedMedia].slice(0, MAX_UPLOAD_IMAGES)
      );
    } catch (error) {
      console.error('Upload error:', error);
      alert('Could not process that video. Please try a shorter clip or upload photos.');
    } finally {
      event.target.value = '';
    }
  };

  const removeUploadedImage = (imageId: string) => {
    setUploadedImages((current) =>
      current.filter((image) => image.id !== imageId)
    );
  };

  const examples = [
    'One real estate listing became 30 days of content and a seller lead system',
    'The exact strategy that took my podcast from 0 to 50k downloads without paid ads',
    'I turned one viral TikTok into $8k in affiliate sales',
    'My 7-day content calendar that grew my Instagram to 50k followers',
    'A fitness coach turned three client transformations into a month of sales content',
    'What a local restaurant should post for 7 days to sell one signature menu item',
    'Turn one course lesson into hooks, emails, sales posts, and a lead magnet',
    'A beauty creator product demo broken into 10 viral short-form video ideas',
    'Make a boring money topic simple enough for TikTok, LinkedIn, and email',
    'Turn one client win into a LinkedIn post that attracts consulting leads',
    'One YouTube video idea turned into shorts, posts, emails, and a monetization plan',
    'A coach answers one client question and turns it into a full week of authority content',
    'Turn one affiliate product review into content that drives commissions',
    'A newsletter writer turns one insight into a full content system',
    'Turn one photography shoot into reels, carousels, captions, and client leads',
    'What a service business should post from its top 10 customer FAQs',
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

  const makeMyPostLoadingMessages = [
    'Reading your post details...',
    'Finding the easiest post angle...',
    'Building your posting pack...',
    'Writing the caption and CTA...',
    'Creating the follow-up reply...',
    'Polishing the post so it is ready to use...',
  ];

  const activeLoadingMessages =
    generationMode === 'viral_hooks'
      ? hookLoadingMessages
      : isMakeMyPostMode
        ? makeMyPostLoadingMessages
        : growthLoadingMessages;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      setApprovedPosts(loadApprovedPostsFromStorage());
      setApprovedPostsHydrated(true);

      const savedUsed = localStorage.getItem('generationsUsed');
      const savedBusinessProfile = localStorage.getItem('businessProfile');
      const params = new URLSearchParams(window.location.search);

      if (savedBusinessProfile) {
        try {
          const parsedProfile = JSON.parse(savedBusinessProfile) as Partial<BusinessProfile>;

          setBusinessProfile({
            businessType:
              typeof parsedProfile.businessType === 'string'
                ? parsedProfile.businessType
                : '',
            services:
              typeof parsedProfile.services === 'string'
                ? parsedProfile.services
                : '',
            idealClient: '',
            mainCta: '',
            notes:
              typeof parsedProfile.notes === 'string'
                ? parsedProfile.notes
                : '',
          });

          setShowBusinessProfile(true);
        } catch {
          localStorage.removeItem('businessProfile');
        }
      }

      if (savedUsed) {
        setGenerationsUsed(parseInt(savedUsed));
      }

      fetch('/api/generate')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && typeof data.generationsUsed === 'number') {
            setGenerationsUsed(data.generationsUsed);
            localStorage.setItem('generationsUsed', String(data.generationsUsed));
          }
          if (data) {
            setIsPro(data.isPro === true);
            localStorage.setItem('isPro', data.isPro === true ? 'true' : 'false');
          }
        })
        .catch(() => {});


      const stripeSessionId = params.get('session_id');
      if (stripeSessionId) {
        fetch('/api/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: stripeSessionId }),
        })
          .then((res) => {
            if (res.ok) {
              localStorage.setItem('isPro', 'true');
              window.location.reload();
            }
          })
          .catch(() => {});
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
    if (!mounted) return;

    if (!hasBusinessProfile) {
      localStorage.removeItem('businessProfile');
      return;
    }

    localStorage.setItem('businessProfile', JSON.stringify(businessProfile));
  }, [businessProfile, hasBusinessProfile, mounted]);

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

  useEffect(() => {
    const loadMetaStatus = async () => {
      if (!isLoaded) return;

      if (!signedIn) {
        setMetaStatus(null);
        return;
      }

      setMetaStatusLoading(true);

      try {
        const res = await fetch('/api/meta/status');
        const data = (await res.json()) as MetaStatus;

        if (!res.ok) {
          console.warn('Meta status API error:', data);
          setMetaStatus(null);
          return;
        }

        setMetaStatus(data);
      } catch (error) {
        console.warn('Load Meta status warning:', error);
        setMetaStatus(null);
      } finally {
        setMetaStatusLoading(false);
      }
    };

    loadMetaStatus();
  }, [isLoaded, signedIn]);

  useEffect(() => {
    const loadMetaPages = async () => {
      if (
        !isLoaded ||
        !signedIn ||
        !metaStatus?.connected ||
        metaStatus.reconnectRequired
      ) {
        setMetaPages([]);
        return;
      }

      setMetaPagesLoading(true);
      setMetaPageMessage('');

      try {
        const res = await fetch('/api/meta/pages');
        const data = (await res.json()) as {
          ok?: boolean;
          pages?: MetaManagedPage[];
          selectedPageId?: string | null;
          message?: string;
        };

        if (!res.ok || !data.ok) {
          throw new Error(
            data.message || 'Could not load your Facebook Pages.'
          );
        }

        const pages = Array.isArray(data.pages) ? data.pages : [];

        setMetaPages(pages);
        setSelectedMetaPageId(
          data.selectedPageId ||
            metaStatus.selectedPage?.id ||
            pages[0]?.id ||
            ''
        );
      } catch (error) {
        console.warn('Load Meta Pages warning:', error);
        setMetaPages([]);
        setMetaPageMessage(
          error instanceof Error
            ? error.message
            : 'Could not load your Facebook Pages.'
        );
      } finally {
        setMetaPagesLoading(false);
      }
    };

    loadMetaPages();
  }, [
    isLoaded,
    signedIn,
    metaStatus?.connected,
    metaStatus?.reconnectRequired,
    metaStatus?.selectedPage?.id,
  ]);

  const handleMetaPageSelection = async () => {
    if (!selectedMetaPageId) {
      setMetaPageMessage('Choose a Facebook Page first.');
      return;
    }

    setMetaPageSelectionLoading(true);
    setMetaPageMessage('');

    try {
      const res = await fetch('/api/meta/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: selectedMetaPageId,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        selectedPage?: MetaManagedPage;
        message?: string;
      };

      if (!res.ok || !data.ok || !data.selectedPage) {
        throw new Error(
          data.message || 'Could not save that Facebook Page.'
        );
      }

      const selectedPage = data.selectedPage;

      setMetaStatus((current) =>
        current
          ? {
              ...current,
              selectedPage: {
                id: selectedPage.id,
                name: selectedPage.name,
              },
              instagramAccount: selectedPage.instagramAccount,
              publishingEnabled: false,
              platforms: [
                {
                  name: 'Instagram',
                  connected: Boolean(
                    selectedPage.instagramAccount
                  ),
                },
                {
                  name: 'Facebook',
                  connected: true,
                },
              ],
              message:
                data.message ||
                `${selectedPage.name} is connected. Publishing is still disabled.`,
            }
          : current
      );

      setMetaPageMessage('');
    } catch (error) {
      console.warn('Meta Page selection warning:', error);
      setMetaPageMessage(
        error instanceof Error
          ? error.message
          : 'Could not save that Facebook Page.'
      );
    } finally {
      setMetaPageSelectionLoading(false);
    }
  };

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

  const DEMO_PHOTOS = [
    { id: 'demo-yard', file: '/demo-yard.jpg', label: 'Landscaping', prompt: 'Yard cleanup before and after for a local lawn care business' },
    { id: 'demo-carwash', file: '/demo-carwash.jpg', label: 'Car detailing', prompt: 'Car wash and detailing service for a local auto detailer' },
    { id: 'demo-nails', file: '/demo-nails.jpg', label: 'Nail tech', prompt: 'Fresh manicure set for a local nail salon' },
    { id: 'demo-cleaning', file: '/demo-cleaning.jpg', label: 'Cleaning', prompt: 'Home cleaning service before and after for a local cleaning business' },
  ];
  const handleDemoPhoto = async (demo: (typeof DEMO_PHOTOS)[number]) => {
    setDemoLoading(true);
    setLoadingDemoId(demo.id);
    try {
      const res = await fetch(demo.file);
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(blob);
      });
      setUploadedImages([
        {
          id: demo.id,
          name: `${demo.id}.jpg`,
          dataUrl,
          sourceType: 'image',
        },
      ]);
      setContent((current) => current || demo.prompt);
      logEvent('demo_photo', { trade: demo.id });
    } catch (error) {
      console.warn('Demo photo load warning:', error);
      alert('Could not load the demo photo. Try uploading one instead.');
    } finally {
      setDemoLoading(false);
      setLoadingDemoId(null);
    }
  };

  const guestGenerate = async () => {
    logEvent('guest_generate', {
      source: uploadedImages.some((img) => img.id.startsWith('demo-')) ? 'demo' : 'upload',
    });
    await generateContent();
    try {
      window.localStorage.setItem('eluaGuestUsed', '1');
    } catch {}
    setGuestUsed(true);
  };
  const generateContent = async () => {
    if (!isLoaded) {
      alert('Please wait a second while your account loads.');
      return;
    }



    if (!content.trim() && !(isMakeMyPostMode && uploadedImages.length > 0)) {
      alert(
        isMakeMyPostMode
          ? 'Please upload at least one photo, short video, or add a short post idea.'
          : 'Please enter a content idea first.'
      );
      return;
    }

    if (signedIn && isContentPlanMode && selectedOutputs.length === 0) {
      alert('Please select at least one platform.');
      return;
    }

    if (signedIn && !isPro && generationsUsed >= MAX_FREE) {
      alert("You've reached your 5 free generations. Upgrade to Pro!");
      return;
    }

    setLoading(true);
    setGenerateError('');
    setResults(null);
    setLoadingStep(0);

    if (generationMode === 'viral_hooks') {
      setActiveTab('hooks');
    } else if (generationMode === 'make_my_post') {
      setActiveTab('content');
    } else {
      setActiveTab('strategy');
    }

    const recentCampaigns = [...recentGenerationHistory, ...savedGenerations].slice(0, 5).map((saved) => ({
      title: saved.title,
      input: saved.input,
      mode: saved.mode,
      goal: saved.goal,
      createdAt: saved.createdAt,
      angle:
        saved.results?.strategy?.core_angle ||
        saved.results?.production_plan?.concept ||
        saved.title,
      caption:
        saved.results?.production_plan?.caption ||
        saved.results?.best_output?.content ||
        '',
      cta:
        saved.results?.production_plan?.cta ||
        saved.results?.monetization?.cta_strategy ||
        '',
      reply:
        saved.results?.production_plan?.dm_reply ||
        saved.results?.production_plan?.follow_up_message ||
        '',
      platform: saved.results?.best_output?.platform || '',
    }));

    const requestContent =
      content.trim() ||
      (isMakeMyPostMode
        ? 'Create the best ready-to-post social media post from the uploaded business photos or video clips.'
        : content);

    let fallbackVariationIndex = 0;

    if (isMakeMyPostMode && uploadedImages.length === 0) {
      try {
        const normalizedVariationKey =
          requestContent
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim()
            .slice(0, 120) || 'prompt-only';

        const storageKey = `hummingbird:fallback-variation:${normalizedVariationKey}`;
        const savedIndex = Number.parseInt(
          window.localStorage.getItem(storageKey) || '0',
          10
        );

        fallbackVariationIndex = Number.isFinite(savedIndex) ? savedIndex : 0;

        window.localStorage.setItem(
          storageKey,
          String(fallbackVariationIndex + 1)
        );
      } catch {
        fallbackVariationIndex = Date.now();
      }
    }

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: requestContent,
          selectedVoice,
          goal,
          generationMode,
          selectedOutputs,
          businessProfile,
          recentCampaigns,
          fallbackVariationIndex,
          uploadedImages: isMakeMyPostMode ? uploadedImages : [],
        }),
      });

      const responseText = await res.text();
      let data: unknown;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          responseText || 'The generate route returned an invalid response.'
        );
      }

      if (!res.ok) {
        const errorMessage =
          typeof data === 'object' &&
          data !== null &&
          'error' in data &&
          typeof data.error === 'string'
            ? data.error
            : 'Something went wrong';

        throw new Error(errorMessage);
      }

      setResults(data as Results);
      setRecentGenerationHistory((prev) =>
        [
          {
            id: 'local-' + Date.now(),
            title: content.trim().slice(0, 70) || 'Untitled generation',
            input: content,
            mode: generationMode,
            goal,
            voice: selectedVoice,
            createdAt: new Date().toISOString(),
            results: data as Results,
          },
          ...prev,
        ].slice(0, 5)
      );

      if (!isPro) {
        const nextUsed = Math.min(generationsUsed + 1, MAX_FREE);
        setGenerationsUsed(nextUsed);
        localStorage.setItem('generationsUsed', String(nextUsed));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Something went wrong while generating your content.';

      setGenerateError(
        errorMessage === 'Something went wrong'
          ? 'Elua had trouble generating that result. Please try again in a moment.'
          : errorMessage
      );

      console.warn('Generate warning:', error);
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
          input: content.trim() || 'Photo-based post (media upload)',
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

      setSavedMessage('Saved to Campaign Library');
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
    } else if (saved.mode === 'make_my_post') {
      setActiveTab('content');
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

  const handlePublishPreview = async () => {
    const caption = formatGeneratedText(results?.production_plan?.caption);

    if (!caption) {
      setPublishMessage('Generate a caption before approving a post.');
      return;
    }

    const platform =
      formatGeneratedText(results?.best_output?.platform) ||
      selectedOutputs[0] ||
      'Facebook Post';

    const cta = formatGeneratedText(
      results?.production_plan?.cta || results?.monetization?.cta_strategy || ''
    );

    const dmReply = formatGeneratedText(
      results?.production_plan?.dm_reply ||
        results?.production_plan?.follow_up_message ||
        results?.monetization?.conversion_tips?.[0] ||
        ''
    );

    const rawHashtags = results?.production_plan?.hashtags || [];
    const hashtags = Array.isArray(rawHashtags)
      ? rawHashtags.map((tag) => formatGeneratedText(tag)).filter(Boolean)
      : formatGeneratedText(rawHashtags)
          .split(/[\s,]+/g)
          .map((tag) => tag.trim())
          .filter(Boolean);

    const approvedPostId = createApprovedPostId();

    setPublishLoading(true);
    setPublishMessage('');

    try {
      const isReelPlatform = platform === 'Instagram Reel';
      const uploadedMediaUrls =
        isReelPlatform && uploadedVideoFile
          ? await (async () => {
              const url = await uploadVideoDirect(uploadedVideoFile);
              return url ? [url] : [];
            })()
          : await uploadAllImages(uploadedImages);
      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedPostId,
          caption,
          hashtags,
          platform,
          mediaUrls: [],
        }),
      });

      const data = await res.json().catch(() => ({}));

      const publishStatusMessage = [data?.message, data?.nextStep]
        .filter(Boolean)
        .join(' ');

      if (data?.approved) {
        const approvedPost: ApprovedPost = {
          id: approvedPostId,
          createdAt: new Date().toISOString(),
          platform,
          title:
            formatGeneratedText(results?.strategy?.core_angle) ||
            `${platform} post`,
          caption,
          cta,
          dmReply,
          hashtags,
          mediaCount: uploadedImages.length,
          mediaUrls: uploadedMediaUrls,
          status: 'approved_not_posted',
        };

        setApprovedPosts((current) =>
          [
            approvedPost,
            ...current.filter(
              (post) =>
                post.caption !== approvedPost.caption ||
                post.platform !== approvedPost.platform
            ),
          ].slice(0, 12)
        );
      }

      setPublishMessage(
        data?.approved
          ? 'Approved and saved. Nothing posted yet.'
          : publishStatusMessage ||
              (res.ok
                ? 'Post approved.'
                : 'Publishing is not enabled yet. Your post is still safe.')
      );
    } catch (error) {
      console.warn('Publish preview warning:', error);
      setPublishMessage('Could not check publishing status. Please try again.');
    } finally {
      setPublishLoading(false);
    }
  };

  const loadNextExample = () => {
    let nextIndex = Math.floor(Math.random() * examples.length);

    if (examples.length > 1 && nextIndex === currentExampleIndex) {
      nextIndex = (nextIndex + 1) % examples.length;
    }

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


  const handlePublishApprovedPost = async (post: ApprovedPost) => {
    if (post.status === 'posted' || publishingFacebookId === post.id) return;

    if (!signedIn) {
      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                publishError: 'Sign in before publishing to Facebook.',
              }
            : item
        )
      );
      return;
    }

    const facebookPageName = metaStatus?.selectedPage?.name;

    if (!metaStatus?.connected || !facebookPageName) {
      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                publishError:
                  'Connect and select a Facebook Page before publishing.',
              }
            : item
        )
      );
      return;
    }

    if (!metaStatus?.publishingEnabled) return;

    const captionPreview =
      post.caption.length > 260
        ? `${post.caption.slice(0, 257)}...`
        : post.caption;

    const confirmed = window.confirm(
      `Publish this post to ${facebookPageName} on Facebook now?\n\n${captionPreview}\n\nThis action can create a live Facebook post.`
    );

    if (!confirmed) return;

    setPublishingFacebookId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              publishError: undefined,
            }
          : item
      )
    );

    try {
      const res = await fetch('/api/meta/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedPostId: post.id,
          caption: post.caption,
          hashtags: post.hashtags,
          platform: 'facebook',
          mediaUrls: post.mediaUrls || [],
          publishNow: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        published?: boolean;
        code?: string;
        message?: string;
        metaPostId?: string;
        permalinkUrl?: string | null;
      };

      if (res.ok && data.published) {
        setApprovedPosts((current) =>
          current.map((item) =>
            item.id === post.id
              ? {
                  ...item,
                  status: 'posted',
                  publishedAt: new Date().toISOString(),
                  metaPostId: data.metaPostId,
                  permalinkUrl: data.permalinkUrl || undefined,
                  publishError: undefined,
                }
              : item
          )
        );
        return;
      }

      const publishFailed = data.code === 'facebook_publish_failed';

      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                status: publishFailed ? 'failed' : 'approved_not_posted',
                publishError:
                  data.message ||
                  'Facebook publishing is unavailable. Nothing was posted.',
              }
            : item
        )
      );
    } catch (error) {
      console.warn('Facebook publish warning:', error);

      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                status: 'failed',
                publishError:
                  'Could not confirm whether Facebook received this post. Check the Page before trying again.',
              }
            : item
        )
      );
    } finally {
      setPublishingFacebookId('');
    }
  };

  const handlePublishApprovedPostToInstagram = async (post: ApprovedPost) => {
    if (post.instagramStatus === 'posted' || publishingInstagramId === post.id) return;
    if (!signedIn) {
      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, instagramPublishError: 'Sign in before publishing to Instagram.' }
            : item
        )
      );
      return;
    }
    const instagramUsername = metaStatus?.instagramAccount?.username;
    if (!metaStatus?.connected || !metaStatus?.instagramAccount?.id) {
      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, instagramPublishError: 'Connect an Instagram account before publishing.' }
            : item
        )
      );
      return;
    }
    if (!metaStatus?.publishingEnabled) return;
    if (!post.mediaUrls || post.mediaUrls.length === 0) {
      setApprovedPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? { ...item, instagramPublishError: 'A photo is required to publish to Instagram.' }
            : item
        )
      );
      return;
    }
    const captionPreview =
      post.caption.length > 260 ? post.caption.slice(0, 257) + '...' : post.caption;
    const confirmMessage =
      'Publish this post to @' + (instagramUsername || 'Instagram') + ' now? ' + captionPreview;
    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;
    setPublishingInstagramId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, instagramPublishError: undefined } : item
      )
    );
    const result = await publishPostToInstagram(post);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              instagramStatus: result.status,
              instagramPublishedAt: result.publishedAt,
              instagramMetaPostId: result.metaPostId,
              instagramPermalinkUrl: result.permalinkUrl,
              instagramPublishError: result.publishError,
            }
          : item
      )
    );
    setPublishingInstagramId('');
  };
  const removeApprovedPost = (postId: string) => {
    setApprovedPosts((current) =>
      current.filter((post) => post.id !== postId)
    );
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
    ? signedIn && isPro
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

  const handleTogglePublishing = async () => {
    if (!metaStatus) return;
    const next = !metaStatus.publishingEnabled;
    setMetaPublishingSaving(true);
    try {
      const res = await fetch('/api/meta/publishing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Could not update publishing.');
        return;
      }
      const statusRes = await fetch('/api/meta/status');
      const statusData = (await statusRes.json()) as MetaStatus;
      setMetaStatus(statusRes.ok ? statusData : null);
    } catch (error) {
      console.warn('Toggle publishing warning:', error);
      alert('Could not update publishing.');
    } finally {
      setMetaPublishingSaving(false);
    }
  };

  const handleMetaDisconnect = async () => {
    if (!window.confirm('Disconnect Facebook & Instagram? Elua will forget this connection. Nothing already posted is affected.')) return;
    try {
      const res = await fetch('/api/meta/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || 'Could not disconnect. Try again.');
        return;
      }
      setMetaPages([]);
      setSelectedMetaPageId('');
      const statusRes = await fetch('/api/meta/status');
      const statusData = (await statusRes.json()) as MetaStatus;
      setMetaStatus(statusRes.ok ? statusData : null);
    } catch (error) {
      console.warn('Meta disconnect warning:', error);
      alert('Could not disconnect. Try again.');
    }
  };
  const platformPanel = signedIn ? (
    <div className="mb-4 rounded-3xl border border-[#1E3238] bg-[#101D20]/90 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Posting Setup</p>
          <p className="mt-1 text-xs leading-relaxed text-[#A8B5B2] sm:text-sm">
            {metaStatusLoading
              ? 'Checking Facebook and Instagram connection...'
              : metaStatus?.message ||
                'Connect your platforms when you are ready to publish from Elua.'}
          </p>
        </div>

        {metaStatus?.authorizationUrl ? (
          <a
            href={metaStatus.authorizationUrl}
            className="shrink-0 rounded-2xl bg-white px-4 py-2 text-center text-xs font-semibold text-black transition hover:scale-[1.02]"
          >
            {metaStatus.reconnectRequired
              ? 'Reconnect Facebook & Instagram'
              : 'Connect Facebook & Instagram'}
          </a>
        ) : (
          <button
            type="button"
            onClick={handleTogglePublishing}
            disabled={metaPublishingSaving || metaStatusLoading}
            className={`shrink-0 rounded-2xl border px-4 py-2 text-center text-xs font-semibold transition hover:scale-[1.02] disabled:opacity-60 ${
              metaStatus?.publishingEnabled
                ? 'border-emerald-500/30 text-emerald-200'
                : 'border-[#27404A] text-[#C6CFCB]'
            }`}
          >
            {metaPublishingSaving
              ? 'Saving...'
              : metaStatus?.publishingEnabled
                ? 'Publishing enabled - click to disable'
                : 'Enable publishing'}
          </button>
        )}
      </div>

      {metaStatus?.connected && !metaStatus.reconnectRequired && (
        <div className="mt-4 rounded-2xl border border-[#1E3238] bg-[#092B33]/40 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
              Facebook Page
            </p>
            <button
              type="button"
              onClick={handleMetaDisconnect}
              className="text-xs font-medium text-[#8A9A98] underline-offset-2 hover:text-[#F8A793] hover:underline"
            >
              Disconnect
            </button>
          </div>

          {metaPagesLoading ? (
            <p className="mt-2 text-sm text-[#A8B5B2]">
              Loading your Facebook Pages...
            </p>
          ) : metaPages.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedMetaPageId}
                onChange={(event) =>
                  setSelectedMetaPageId(event.target.value)
                }
                className="min-w-0 flex-1 rounded-xl border border-[#27404A] bg-[#0B1518] px-3 py-2 text-sm text-white outline-none focus:border-[#F2705B]"
              >
                {metaPages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                    {page.instagramAccount
                      ? ' · Instagram linked'
                      : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleMetaPageSelection}
                disabled={
                  metaPageSelectionLoading ||
                  !selectedMetaPageId ||
                  selectedMetaPageId === metaStatus.selectedPage?.id
                }
                className="rounded-xl bg-[#F2705B] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#E4614C] disabled:cursor-not-allowed disabled:bg-[#16262B] disabled:text-[#8A9A98]"
              >
                {metaPageSelectionLoading
                  ? 'Saving...'
                  : selectedMetaPageId === metaStatus.selectedPage?.id
                    ? 'Page Connected'
                    : 'Use This Page'}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-[#A8B5B2]">
              No manageable Facebook Pages were found for this connection.
            </p>
          )}

          {metaStatus.selectedPage && (
            <p className="mt-3 text-xs leading-relaxed text-[#A8B5B2]">
              Selected: {metaStatus.selectedPage.name}
              {metaStatus.instagramAccount
                ? ` · Instagram ${
                    metaStatus.instagramAccount.username
                      ? `@${metaStatus.instagramAccount.username}`
                      : 'connected'
                  }`
                : ' · No linked Instagram professional account'}
            </p>
          )}

          {metaPageMessage && (
            <p className="mt-3 text-xs leading-relaxed text-[#F8A793]">
              {metaPageMessage}
            </p>
          )}
        </div>
      )}
    </div>
  ) : null;

  const savedGenerationsCard = (
    <div className="w-full min-w-0 rounded-3xl border border-[#1E3238] bg-[#101D20]/90 p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-2xl">
            Campaign Library
          </h2>
          <p className="text-xs text-[#8A9A98] sm:text-sm">
            Saved posts and campaigns live here. Click Reopen to load one back into your workspace.
          </p>
        </div>

        {signedIn && savedGenerations.length > 0 && (
          <button
            onClick={clearAllSavedGenerations}
            className="rounded-xl bg-[#0B1518] px-3 py-2 text-xs text-[#C6CFCB] transition hover:bg-[#16262B]"
          >
            Clear All
          </button>
        )}
      </div>

      {!isLoaded || savedLoading ? (
        <div className="rounded-2xl border border-dashed border-[#27404A] p-3 text-center">
          <p className="text-xs text-[#A8B5B2]">Loading saved generations...</p>
        </div>
      ) : !signedIn ? (
        <div className="rounded-2xl border border-dashed border-[#27404A] p-3 text-center">
          <p className="text-xs text-[#A8B5B2]">
            Create a free account to save campaigns, reopen past plans, and build your next weekly content campaign later.
          </p>
        </div>
      ) : savedGenerations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#27404A] p-3 text-center">
          <p className="text-xs text-[#A8B5B2]">No saved campaigns yet. Click Save Campaign after generating a post, then it will appear here.</p>
        </div>
      ) : (
        <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
          {savedGenerations.map((saved) => (
            <div
              key={saved.id}
              className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#EDF1EF] sm:text-base">
                    {saved.title}
                  </p>
                  <p className="mt-1 text-xs text-[#8A9A98]">
                    {saved.mode === 'viral_hooks'
                      ? '🔥 Hook Set'
                      : saved.mode === 'make_my_post'
                        ? '📸 Posting Pack'
                        : '📅 Weekly Campaign'}{' '}
                    • {saved.goal} • {formatSavedDate(saved.createdAt)}
                  </p>
                </div>

                <button
                  onClick={() => deleteSavedGeneration(saved.id)}
                  className="text-xs text-[#8A9A98] transition hover:text-red-400"
                >
                  Delete
                </button>
              </div>

              <button
                onClick={() => loadSavedGeneration(saved)}
                className="mt-3 w-full rounded-xl bg-[#16262B] py-2 text-sm transition hover:bg-[#1E3238]"
              >
                Reopen Campaign
              </button>

              <p className="mt-2 text-[11px] leading-relaxed text-[#8A9A98]">
                Use this to revisit the angle, CTA, Money Plan, and follow-up path before planning your next campaign.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const todaysPost = approvedPosts[0];
  const todaysPostIsInstagram = todaysPost?.platform?.startsWith('Instagram') ?? false;
  const todaysPostPlatformLabel = todaysPostIsInstagram ? 'Instagram' : 'Facebook';
  const todaysPostPosted = todaysPostIsInstagram
    ? todaysPost?.instagramStatus === 'posted'
    : todaysPost?.status === 'posted';
  const todaysPostFailed = todaysPostIsInstagram
    ? todaysPost?.instagramStatus === 'failed'
    : todaysPost?.status === 'failed';
  const todaysPostPublishing = !todaysPostIsInstagram && todaysPost?.status === 'publishing';
  const todaysPostTitle = todaysPostPosted
    ? 'Today’s post is live'
    : todaysPostPublishing
      ? 'Publishing today’s post'
      : todaysPostFailed
        ? 'Review today’s post'
        : 'Post this today';
  const todaysPostStatus = todaysPostPosted
    ? `Posted to ${todaysPostPlatformLabel}`
    : todaysPostPublishing
      ? 'Publishing'
      : todaysPostFailed
        ? `${todaysPostPlatformLabel} publishing needs review`
        : `Not posted to ${todaysPostPlatformLabel}`;

  const todaysPostCard = todaysPost ? (
    <div className="mb-4 w-full rounded-3xl border border-[#F2705B]/30 bg-gradient-to-br from-[#0E2228]/70 to-[#101D20] p-4 sm:p-6 lg:mb-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
        Today’s Focus
      </p>

      <h2 className="mt-1 text-lg font-semibold text-white sm:text-2xl">
        {todaysPostTitle}
      </h2>

      <p className="mt-1 text-xs text-[#A8B5B2]">
        {todaysPost.platform} · {todaysPostStatus}
      </p>

      <p className="mt-4 line-clamp-4 whitespace-pre-wrap text-sm leading-relaxed text-[#D7DEDA]">
        {todaysPost.caption}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            copyToClipboard(todaysPost.caption, `Today caption ${todaysPost.id}`)
          }
          className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black"
        >
          {copiedItem === `Today caption ${todaysPost.id}`
            ? 'Copied!'
            : 'Copy Caption'}
        </button>

        {todaysPost.cta && (
          <button
            type="button"
            onClick={() =>
              copyToClipboard(todaysPost.cta, `Today CTA ${todaysPost.id}`)
            }
            className="rounded-xl bg-[#16262B] px-3 py-2 text-xs text-white"
          >
            {copiedItem === `Today CTA ${todaysPost.id}`
              ? 'Copied!'
              : 'Copy CTA'}
          </button>
        )}

        {todaysPost.dmReply && (
          <button
            type="button"
            onClick={() =>
              copyToClipboard(todaysPost.dmReply, `Today reply ${todaysPost.id}`)
            }
            className="rounded-xl bg-[#16262B] px-3 py-2 text-xs text-white"
          >
            {copiedItem === `Today reply ${todaysPost.id}`
              ? 'Copied!'
              : 'Copy Reply'}
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="mb-4 w-full rounded-3xl border border-[#1E3238] bg-[#101D20]/90 p-4 sm:p-6 lg:mb-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
        Today’s Focus
      </p>

      <h2 className="mt-1 text-lg font-semibold text-white sm:text-2xl">
        Create today’s post
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-[#A8B5B2]">
        Approve a post and it will appear here ready for you to use today.
      </p>
    </div>
  );

  const approvedPostsCard = (
    <div className="w-full min-w-0 rounded-3xl border border-emerald-500/20 bg-[#101D20]/90 p-4 sm:p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white sm:text-2xl">
            Posting Queue
          </h2>
          <p className="text-xs leading-relaxed text-[#8A9A98] sm:text-sm">
            Approved posts live here. They are saved on this device, but nothing has been posted yet.
          </p>
        </div>

        {approvedPosts.length > 0 && (
          <button
            type="button"
            onClick={() => setApprovedPosts([])}
            className="rounded-xl bg-[#0B1518] px-3 py-2 text-xs text-[#C6CFCB] transition hover:bg-[#16262B]"
          >
            Clear
          </button>
        )}
      </div>

      {approvedPosts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#27404A] p-3 text-center">
          <p className="text-xs text-[#A8B5B2]">
            No approved posts yet. Click Approve & Save to Queue after reviewing a result, then it will appear here.
          </p>
        </div>
      ) : (
        <div className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
          {approvedPosts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#EDF1EF] sm:text-base">
                    {post.platform}
                  </p>
                  <p className="text-[11px] text-[#8A9A98]">
                    Approved {formatSavedDate(post.createdAt)} ·{' '}
                    {post.status === 'posted'
                      ? `Posted${
                          post.publishedAt
                            ? ` ${formatSavedDate(post.publishedAt)}`
                            : ''
                        }`
                      : post.status === 'failed'
                        ? 'Needs review'
                        : publishingFacebookId === post.id
                          ? 'Publishing...'
                          : 'Not posted'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeApprovedPost(post.id)}
                  className="text-xs text-[#8A9A98] transition hover:text-red-400"
                >
                  Remove
                </button>
              </div>

              <p className="line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#C6CFCB]">
                {post.caption}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(post.caption, `Approved ${post.id}`)
                  }
                  className="rounded-xl bg-[#16262B] px-3 py-2 text-xs text-[#EDF1EF] transition hover:bg-[#1E3238]"
                >
                  {copiedItem === `Approved ${post.id}`
                    ? 'Copied!'
                    : 'Copy Caption'}
                </button>

                {post.cta && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(post.cta, `Approved CTA ${post.id}`)}
                    className="rounded-xl bg-[#16262B] px-3 py-2 text-xs text-[#EDF1EF] transition hover:bg-[#1E3238]"
                  >
                    {copiedItem === `Approved CTA ${post.id}` ? 'Copied!' : 'Copy CTA'}
                  </button>
                )}

                {post.dmReply && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(post.dmReply, `Approved reply ${post.id}`)}
                    className="rounded-xl bg-[#16262B] px-3 py-2 text-xs text-[#EDF1EF] transition hover:bg-[#1E3238]"
                  >
                    {copiedItem === `Approved reply ${post.id}` ? 'Copied!' : 'Copy Reply'}
                  </button>
                )}

                {post.status === 'approved_not_posted' && (
                  <button
                    type="button"
                    onClick={() => handlePublishApprovedPost(post)}
                    disabled={
                      publishingFacebookId === post.id ||
                      !metaStatus?.publishingEnabled
                    }
                    className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-[#16262B] disabled:text-[#8A9A98]"
                  >
                    {publishingFacebookId === post.id
                      ? 'Publishing...'
                      : metaStatus?.publishingEnabled
                        ? 'Publish to Facebook'
                        : 'Publishing disabled'}
                  </button>
                )}
                {post.instagramStatus !== 'posted' && metaStatus?.instagramAccount?.id && (
                  <button
                    type="button"
                    onClick={() => handlePublishApprovedPostToInstagram(post)}
                    disabled={
                      publishingInstagramId === post.id ||
                      !metaStatus?.publishingEnabled ||
                      !post.mediaUrls ||
                      post.mediaUrls.length === 0
                    }
                    className="rounded-xl bg-[#F2705B] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#E4614C] disabled:cursor-not-allowed disabled:bg-[#16262B] disabled:text-[#8A9A98]"
                  >
                    {publishingInstagramId === post.id
                      ? 'Publishing...'
                      : !post.mediaUrls || post.mediaUrls.length === 0
                        ? 'Photo required'
                        : metaStatus?.publishingEnabled
                          ? 'Publish to Instagram'
                          : 'Publishing disabled'}
                  </button>
                )}

                <span
                  className={`rounded-xl border px-3 py-2 text-xs ${
                    post.status === 'posted'
                      ? 'border-emerald-500/30 text-emerald-200'
                      : post.status === 'failed'
                        ? 'border-red-500/30 text-red-200'
                        : 'border-amber-500/30 text-amber-200'
                  }`}
                >
                  {post.status === 'posted'
                    ? 'Posted to Facebook'
                    : post.status === 'failed'
                      ? 'Facebook publishing needs review'
                      : 'Not posted to Facebook'}
                </span>
              </div>

              {post.permalinkUrl && (
                <a
                  href={post.permalinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-xs font-semibold text-blue-300 underline underline-offset-2"
                >
                  View Facebook post
                </a>
              )}
              {post.instagramStatus === 'posted' && (
                <p className="mt-3 text-xs font-semibold text-[#F8A793]">Posted to Instagram</p>
              )}
              {post.instagramPermalinkUrl && (
                <a href={post.instagramPermalinkUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-[#F8A793] underline underline-offset-2">View Instagram post</a>
              )}
              {post.instagramPublishError && (
                <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-200">{post.instagramPublishError}</p>
              )}

              {post.publishError &&
                post.publishError !==
                  'Live Facebook publishing is still disabled.' &&
                post.publishError !==
                  'Live Facebook publishing has not been enabled for this account.' && (
                  <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs leading-relaxed text-red-200">
                    {post.publishError}
                  </p>
                )}
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
          <p className="text-sm text-[#6E7F7E]">Checking your sign-in status.</p>
        </>
      ) : !signedIn ? (
        <>
          <p className="mb-1 text-lg font-semibold sm:text-xl">
            Build a weekly content workspace
          </p>
          <p className="mb-3 text-sm leading-relaxed text-[#6E7F7E]">
              Create a free account to generate a Content + Money Plan, save your best campaigns,
              and reopen them when you are ready to post again. No spam — just your saved workspace.
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
            <SignInButton mode="modal">
              <button className="w-full rounded-2xl bg-black py-3 text-sm font-semibold text-white transition hover:scale-[1.02]">
                Sign In
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button className="w-full rounded-2xl border border-[#C6CFCB] bg-[#F1EFE8] py-3 text-sm font-semibold text-black transition hover:scale-[1.02]">
                Create Workspace
              </button>
            </SignUpButton>
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="text-base font-semibold sm:text-lg">Account</p>
              <p className="text-sm text-[#6E7F7E]">You are signed in.</p>
            </div>

            <UserButton />
          </div>

            {isPro ? (
              <>
                <p className="mb-1 text-base font-semibold sm:text-lg">
                  Founder Plan Active
                </p>
                <p className="mb-3 text-sm leading-relaxed text-[#6E7F7E]">
                  You have unlimited weekly execution plans that turn one business goal
                  into platform-ready posts, CTAs, lead magnet ideas, Money Plans,
                  7-Day Action Plans, hooks, and saved workspace access.
                </p>

                <div className="rounded-2xl bg-black px-4 py-3 text-center text-sm font-semibold text-white">
                  Founder Plan active — unlimited generations
                </div>
              </>
            ) : (
              <>
                <p className="mb-1 text-base font-semibold sm:text-lg">
                  Founder Plan — $19/mo
                </p>
                <p className="mb-3 text-sm leading-relaxed text-[#6E7F7E]">
                  For small businesses that need to know what to post, what CTA to use,
                  and how each campaign can lead to replies, quote requests, bookings, or sales.
                </p>

                <div className="mb-3 rounded-2xl border border-[#D7DEDA] bg-[#FBF8F1] p-3 text-sm leading-relaxed text-[#58696B]">
                  <p className="mb-2 font-semibold text-[#101D20]">
                    Founder Plan gives you a weekly execution system:
                  </p>
                  <div className="space-y-2">
                    <p>✓ Turn one business goal into platform-ready posts, hooks, and CTAs</p>
                    <p>✓ Get a Money Plan with lead magnet, funnel, and conversion tips</p>
                    <p>✓ Follow a 7-Day Action Plan for posting, replying, and following up</p>
                    <p>✓ Save and reuse your best weekly campaigns in your workspace</p>
                    <p>✓ Unlimited generations when you want to build another campaign</p>
                  </div>
                </div>

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
    <div className="min-h-screen overflow-x-hidden bg-[#092B33] text-white">
      <div className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-4 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/elua-favicon.png"
              alt="Elua"
              className="h-11 w-11 rounded-2xl object-cover"
            />
            <div>
              <p className="text-sm font-semibold leading-none text-white sm:text-base">
                Elua
              </p>
              <p className="mt-1 text-xs text-[#8A9A98]">
                Photo-to-post workspace
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isLoaded ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-[#0B1518]" />
            ) : signedIn ? (
              <div className="flex items-center gap-2">
                {!isPro && (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradeLoading}
                    className="rounded-full bg-[#F2705B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#e4614c] disabled:opacity-60"
                  >
                    {upgradeLoading ? 'Opening...' : 'Upgrade'}
                  </button>
                )}
                <div className="flex items-center gap-2 rounded-full border border-[#1E3238] bg-[#101D20]/80 px-3 py-2">
                  <span className="text-xs font-semibold text-[#C6CFCB]">
                    Account
                  </span>
                  <UserButton />
                </div>
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.03]">
                  Sign in
                </button>
              </SignInButton>
            )}
          </div>
        </header>

        {isLoaded && signedIn && todaysPostCard}

        <div className="mb-4 grid gap-4 lg:mb-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          <div className="max-w-4xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#1E3238] bg-[#101D20] px-3 py-1.5 text-xs text-[#C6CFCB] sm:px-4 sm:py-2 sm:text-sm">
              <span className="text-[#F2705B]">✦</span>
              AI Posting Assistant for Small Service Businesses
            </div>

            <h1 className="max-w-4xl text-[2.1rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Turn your business photos into ready-to-post content.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#A8B5B2] sm:mt-5 sm:text-lg">
              Upload business photos or short clips. Elua creates the caption, CTA,
              follow-up reply, hashtags, and posting direction.
            </p>
          </div>

          <div className="hidden">{accountPanel}</div>
        </div>

        <div className="hidden">
          <div className="mb-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F2705B]">
                Sample output preview
              </p>
              <h3 className="mt-1 text-xl font-semibold leading-tight text-white sm:text-2xl">
                What you get in one generation
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#A8B5B2]">
                See the kind of strategy, content, CTA, and follow-up path Elua
                builds from one business goal or post idea.
              </p>
            </div>

            <div className="rounded-2xl border border-[#1E3238] bg-[#092B33]/50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#8A9A98]">
                Example input
              </p>
              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                “I’m a fitness coach and I want Instagram content that helps me get more
                online coaching calls.”
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Post to publish',
                body: 'A Reel, carousel, TikTok, Facebook post, or photo-based posting pack built for your goal.',
              },
              {
                title: 'CTA to use',
                body: 'A clear comment, DM, booking, lead magnet, quote, or sales next step.',
              },
              {
                title: 'Money path',
                body: 'How the content can turn into leads, bookings, calls, orders, or sales.',
              },
              {
                title: '7-day action plan',
                body: 'What to post next, how to follow up, and what to ask warm leads.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-[#1E3238] bg-[#092B33]/40 p-4"
              >
                <p className="mb-1 text-sm font-semibold text-[#F8A793]">
                  {item.title}
                </p>
                <p className="text-xs leading-relaxed text-[#A8B5B2] sm:text-sm">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {signedIn && platformPanel}

        {signedIn && !hasBusinessProfile && results?.profile_guess && (
          <div className="mb-4 rounded-3xl border border-[#F2705B]/40 bg-[#F2705B]/10 p-4 sm:p-5">
            <p className="text-sm font-semibold text-[#FBD3C9]">
              Sounds like you run a {results.profile_guess.businessType || 'service business'}.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#A8B5B2] sm:text-sm">
              Save this as your Business Profile so every future post sounds like you. You can edit it anytime.
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => {
                  const guess = results.profile_guess;
                  if (!guess) return;
                  setBusinessProfile({
                    businessType: guess.businessType || '',
                    services: guess.services || '',
                    idealClient: guess.idealClient || '',
                    mainCta: guess.mainCta || '',
                    notes: '',
                  });
                }}
                className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.03]"
              >
                Save Profile
              </button>
            </div>
          </div>
        )}
        <div className="grid w-full min-w-0 items-stretch gap-4 lg:grid-cols-[0.95fr_1.2fr] lg:gap-8">
          <div className="order-1 min-w-0">
            <div className="rounded-3xl border border-[#1E3238] bg-[#101D20]/90 p-4 sm:p-6">
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[#A8B5B2]">
                    Upload photos or short clips
                  </p>

                  {!isMakeMyPostMode && (
                    <button
                      onClick={loadNextExample}
                      className="text-xs font-medium text-[#F2705B] hover:text-[#F8A793]"
                    >
                      ✨ Example
                    </button>
                  )}
                </div>

                {isMakeMyPostMode && (
                  <div className="rounded-2xl border border-dashed border-[#F2705B]/40 bg-[#F2705B]/10 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#FBD3C9]">
                          Upload photos or short clips from your business
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#A8B5B2] sm:text-sm">
                          Add up to 6 photos or short clip frames. Elua will choose the strongest visuals, write the caption, CTA, DM reply, hashtags, and posting direction.
                        </p>
                      </div>

                      <label className={!signedIn ? "w-fit cursor-pointer rounded-xl border border-white/25 bg-transparent px-3 py-2 text-xs font-medium text-[#A8B5B2] transition hover:border-white/40 hover:text-white" : "w-fit cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:scale-[1.03]"}>
                        Add Media
                        <input
                          type="file"
                          accept="image/*,video/*"
                          multiple
                          onChange={handleMediaUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {uploadedImages.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {uploadedImages.map((image, index) => (
                          <div
                            key={image.id}
                            className="overflow-hidden rounded-xl border border-[#F2705B]/20 bg-[#092B33]/60"
                          >
                            <div className="relative aspect-square">
                              <img
                                src={image.dataUrl}
                                alt={`Uploaded ${image.sourceType === 'video_frame' ? 'video frame' : 'photo'} ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeUploadedImage(image.id)}
                                className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-semibold text-white"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="truncate px-2 py-1.5 text-[11px] text-[#A8B5B2]">
                              {image.sourceType === 'video_frame'
                                ? `Video frame ${index + 1}`
                                : `Photo ${index + 1}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-[#1E3238] bg-[#092B33]/50 p-3 text-xs leading-relaxed text-[#A8B5B2] sm:text-sm">
                        No media uploaded yet. Upload real work photos, short clips, before/afters, product shots, client-safe examples, or workspace/service visuals.
                        {!signedIn && (
                          <div className="mt-3 rounded-xl border border-[#F2705B]/50 bg-[#F2705B]/15 p-3">
                            <p className="mb-2 text-center text-sm font-bold text-white">
                              {demoLoading ? 'Loading demo photo...' : 'No photo needed — just tap a sample →'}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {DEMO_PHOTOS.map((demo) => (
                                <button
                                  key={demo.id}
                                  type="button"
                                  onClick={() => handleDemoPhoto(demo)}
                                  disabled={demoLoading}
                                  className="rounded-xl bg-[#F2705B] px-3 py-2.5 text-center text-xs font-bold text-white shadow-md transition hover:scale-[1.03] hover:bg-[#F8836B] disabled:opacity-60"
                                >
                                  {loadingDemoId === demo.id ? 'Loading…' : demo.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {isMakeMyPostMode ? (
                  <details className="mt-4 rounded-2xl border border-[#1E3238] bg-[#092B33]/30 p-3">
                    <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                      Post Details
                    </summary>

                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Optional: add service type, location, offer, tone, or what you want more of - any language works..."
                      className="mt-3 h-24 w-full max-w-full resize-none rounded-2xl border border-[#27404A] bg-[#0B1518] p-4 text-sm text-[#EDF1EF] outline-none placeholder:text-[#8A9A98] focus:border-[#F2705B] sm:h-28 sm:p-5 sm:text-base"
                    />
                  </details>
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      generationMode === 'viral_hooks'
                        ? 'Example: 10 hooks for a local realtor who wants more seller leads...'
                        : 'Example: A fitness coach wants a month of posts that lead to coaching calls...'
                    }
                    className="h-28 w-full max-w-full resize-none rounded-2xl border border-[#27404A] bg-[#0B1518] p-4 text-sm text-[#EDF1EF] outline-none placeholder:text-[#8A9A98] focus:border-[#F2705B] sm:h-48 sm:p-5 sm:text-base"
                  />
                )}
              </div>

              <div className={signedIn ? "mb-4 rounded-2xl border border-[#1E3238] bg-[#092B33]/40 p-4" : "hidden"}>
                <button
                  type="button"
                  onClick={() => setShowBusinessProfile((current) => !current)}
                  className="flex w-full items-center justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                      Your Business Profile
                    </p>
                    <p className="mt-1 text-sm text-[#C6CFCB]">
                      {hasBusinessProfile
                        ? 'Using your saved business details to save time and keep posts consistent.'
                        : 'Add your business details once so Elua can save you time each week.'}
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full bg-[#0B1518] px-3 py-1 text-xs text-[#C6CFCB]">
                    {showBusinessProfile ? 'Hide' : hasBusinessProfile ? 'Edit' : 'Add'}
                  </span>
                </button>

                {showBusinessProfile && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#A8B5B2]">
                        Business type
                      </label>
                      <input
                        value={businessProfile.businessType}
                        onChange={(e) =>
                          updateBusinessProfile('businessType', e.target.value)
                        }
                        placeholder="Example: mobile detailer, lash artist, cleaner, realtor"
                        className="w-full rounded-xl border border-[#27404A] bg-[#0B1518] px-3 py-2 text-sm text-[#EDF1EF] outline-none placeholder:text-[#8A9A98] focus:border-[#F2705B]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#A8B5B2]">
                        Main services
                      </label>
                      <input
                        value={businessProfile.services}
                        onChange={(e) =>
                          updateBusinessProfile('services', e.target.value)
                        }
                        placeholder="Example: interior details, lash refills, house cleaning, seller consultations"
                        className="w-full rounded-xl border border-[#27404A] bg-[#0B1518] px-3 py-2 text-sm text-[#EDF1EF] outline-none placeholder:text-[#8A9A98] focus:border-[#F2705B]"
                      />
                    </div>


                    <div>
                      <label className="mb-1 block text-xs font-medium text-[#A8B5B2]">
                        Writing style / business notes
                      </label>
                      <textarea
                        value={businessProfile.notes}
                        onChange={(e) =>
                          updateBusinessProfile('notes', e.target.value)
                        }
                        placeholder="Example: casual, helpful, simple, sounds like a real person, no hype"
                        className="h-20 w-full resize-none rounded-xl border border-[#27404A] bg-[#0B1518] px-3 py-2 text-sm text-[#EDF1EF] outline-none placeholder:text-[#8A9A98] focus:border-[#F2705B]"
                      />
                    </div>

                    {hasBusinessProfile && (
                      <button
                        type="button"
                        onClick={() => setBusinessProfile(emptyBusinessProfile)}
                        className="text-xs font-medium text-[#8A9A98] transition hover:text-[#C6CFCB]"
                      >
                        Clear business profile
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className={`mb-4 ${isMakeMyPostMode ? 'hidden' : ''}`}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                  Mode
                </p>
                <div className="grid min-w-0 grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setGenerationMode('growth_system');
                      setActiveTab('content');
                      setGenerateError('');
                      setResults(null);
                    }}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      generationMode === 'growth_system'
                        ? 'bg-[#F2705B] text-white shadow-lg shadow-black/30'
                        : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                    }`}
                  >
                    🚀 Content + Money Plan
                  </button>

                  <button
                    onClick={() => {
                      setGenerationMode('make_my_post');
                      setActiveTab('content');
                      setGenerateError('');
                      setResults(null);
                    }}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      generationMode === 'make_my_post'
                        ? 'bg-[#F2705B] text-white shadow-lg shadow-black/30'
                        : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                    }`}
                  >
                    📸 Make My Post
                  </button>

                  <button
                    onClick={() => {
                      setGenerationMode('viral_hooks');
                      setActiveTab('hooks');
                      setGenerateError('');
                      setResults(null);
                    }}
                    className={`rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                      generationMode === 'viral_hooks'
                        ? 'bg-[#F2705B] text-white shadow-lg shadow-black/30'
                        : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                    }`}
                  >
                    🔥 Hooks Only
                  </button>
                </div>
              </div>

              <div className={signedIn ? "mb-4" : "hidden"}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                  Post goal
                </p>
                <div className="grid min-w-0 grid-cols-3 gap-2">
                  {[
                    { id: 'growth', label: 'Build Trust' },
                    { id: 'viral', label: 'Get DMs' },
                    { id: 'sales', label: 'Get Bookings' },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setGoal(g.id)}
                      className={`rounded-2xl px-2 py-2.5 text-sm font-medium transition ${
                        goal === g.id
                          ? 'bg-[#F2705B] text-white shadow-lg shadow-black/30'
                          : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <details className={signedIn ? "mb-4 rounded-2xl border border-[#1E3238] bg-[#092B33]/30 p-3" : "hidden"}>
                <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                  More options
                </summary>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                    Post Tone
                  </p>
                  <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
                    {voices.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setSelectedVoice(v.id)}
                        className={`shrink-0 rounded-2xl px-3 py-2 text-xs transition sm:text-sm ${
                          selectedVoice === v.id
                            ? 'bg-[#F2705B] text-white'
                            : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </details>

              {signedIn && isContentPlanMode && (
                <div className="mb-4">
                  <div className="mb-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                      Platforms
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {outputOptions.filter((output) => !output.comingSoon).map((output) => {
                      const selected = selectedOutputs.includes(output.id);

                      return (
                        <button
                          key={output.id}
                          onClick={() => toggleOutput(output.id)}
                          type="button"
                          className={`rounded-2xl border px-3 py-2.5 text-left text-xs transition sm:text-sm ${
                            selected
                              ? 'border-[#F2705B] bg-[#F2705B]/20 text-white shadow-lg shadow-black/20'
                              : 'border-[#27404A] bg-[#0B1518] text-[#C6CFCB] hover:border-[#2E4A55] hover:bg-[#16262B]'
                          }`}
                        >
                          <span className="mr-1.5">{output.emoji}</span>
                          {output.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-[#6E7F7E]">
                    Coming soon: {outputOptions.filter((output) => output.comingSoon).map((output) => output.label).join(', ')}
                 </p>
                </div>
              )}

              {signedIn ? (
                <button
                  onClick={generateContent}
                  disabled={
                    loading ||
                    !isLoaded ||
                    (!content.trim() &&
                      !(isMakeMyPostMode && uploadedImages.length > 0))
                  }
                  className={`w-full rounded-2xl py-3.5 text-sm font-semibold transition hover:scale-[1.02] disabled:bg-none disabled:bg-[#16262B] disabled:text-[#8A9A98] disabled:hover:scale-100 sm:py-5 sm:text-lg ${
                    generationMode === 'viral_hooks'
                      ? 'bg-gradient-to-r from-orange-500 via-[#E4614C] to-[#D8543F]'
                      : 'bg-gradient-to-r from-[#F2705B] to-[#D8543F]'
                  }`}
                >
                  {loading
                    ? generationMode === 'viral_hooks'
                      ? 'Generating hooks...'
                      : isMakeMyPostMode
                        ? activeLoadingMessages[loadingStep]
                        : 'Building content plan...'
                    : generationMode === 'viral_hooks'
                      ? 'Generate 10 Viral Hooks'
                      : isMakeMyPostMode
                        ? uploadedImages.length > 0
                          ? 'Make My Post'
                          : 'Make My Post'
                        : 'Generate My Content + Money Plan'}
                </button>
              ) : guestUsed ? (
                <SignUpButton mode="modal">
                  <button
                    onClick={() => logEvent('guest_signup_click')}
                    className="w-full rounded-2xl bg-gradient-to-r from-[#F2705B] to-[#D8543F] py-3.5 text-sm font-semibold transition hover:scale-[1.02] sm:py-5 sm:text-lg"
                  >
                    Create Free Account for 5 More Free Posts
                  </button>
                </SignUpButton>
              ) : (
                <button
                  onClick={guestGenerate}
                  disabled={
                    loading ||
                    !isLoaded ||
                    (!content.trim() &&
                      !(isMakeMyPostMode && uploadedImages.length > 0))
                  }
                  className="w-full rounded-2xl bg-gradient-to-r from-[#F2705B] to-[#D8543F] py-3.5 text-sm font-semibold transition hover:scale-[1.02] disabled:bg-none disabled:bg-[#16262B] disabled:text-[#8A9A98] disabled:hover:scale-100 sm:py-5 sm:text-lg"
                >
                  {loading ? activeLoadingMessages[loadingStep] : 'Make My Free Post — No Account Needed'}
                </button>
              )}

              <div className="mt-2.5 flex items-center justify-between text-xs text-[#A8B5B2]">
                <p>{signedIn ? `${freeLeft} free generations left` : guestUsed ? 'Free post used · create a free account for 5 more' : '1 free post now · 5 more with a free account'}</p>
                {signedIn && isPro ? (
                  <p>Pro active</p>
                ) : signedIn ? (
                  <button
                    onClick={handleUpgrade}
                    disabled={upgradeLoading}
                    className="font-semibold text-[#F2705B] underline underline-offset-2 transition hover:text-[#e4614c] disabled:opacity-60"
                  >
                    {upgradeLoading ? 'Opening checkout...' : 'Upgrade — $19/mo'}
                  </button>
                ) : null}
              </div>
              <p className="mt-2 text-center text-xs text-[#6E7F7E]">
                Nothing posts without your approval · Photos stay private · ¿Hablas español? Elua responde en español
              </p>
            </div>
            <div className="mt-4 hidden space-y-4 lg:block">
              {signedIn && savedGenerationsCard}
              {signedIn && approvedPostsCard}
            </div>
          </div>

          <div className="order-2 min-w-0 rounded-3xl border border-[#1E3238] bg-[#101D20]/90 p-4 sm:p-6 lg:flex lg:h-full lg:min-h-[760px] lg:flex-col">
            <div className="mb-3 flex shrink-0 flex-col gap-3 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  {generationMode === 'viral_hooks'
                    ? 'Your Hook Ideas'
                    : isMakeMyPostMode
                      ? 'Your Post'
                      : 'Your Content + Money Plan Workspace'}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-[#A8B5B2] sm:text-lg">
                  {generationMode === 'viral_hooks'
                    ? 'Quick hook ideas for your business, offer, or content topic.'
                    : isMakeMyPostMode
                      ? 'Upload photos or clips and Elua will make the post.'
                      : 'Turn one business goal into ready-to-post content, hooks, CTAs, and a simple path to leads, bookings, or sales.'}
                </p>
              </div>

              {results && signedIn && (
                <button
                  onClick={saveCurrentGeneration}
                  className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:scale-105"
                >
                  {savedMessage || 'Save Campaign'}
                </button>
              )}
            </div>

            {results && isContentPlanMode && (
              <div className="mb-4 rounded-3xl border border-[#F2705B]/30 bg-gradient-to-br from-[#0E2228]/70 via-[#101D20] to-[#101D20]/40 p-5 shadow-2xl">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
                      {isMakeMyPostMode ? 'Your Post' : 'This Week’s Campaign'}
                    </p>
                    <h3 className="text-xl font-semibold text-white sm:text-2xl">
                      {formatGeneratedText(
                        results.strategy?.core_angle,
                        'A focused weekly campaign built from your business goal.'
                      )}
                    </h3>
                  </div>

                  {results.best_output?.platform && (
                    <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#EDF1EF]">
                      Start with {getPlatformDisplayName(results.best_output.platform)}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                      {isMakeMyPostMode
                        ? uploadedImages.length === 0
                          ? 'Ready To Post'
                          : (selectedOutputs.some((output) =>
                                [
                                  'Instagram Reel',
                                  'TikTok Script',
                                  'YouTube Shorts',
                                  'YouTube Shorts Script',
                                ].includes(output)
                              ) ||
                                uploadedImages.some(
                                  (image) => image.sourceType === 'video_frame'
                                ))
                            ? 'Video Flow'
                            : 'Photo Order'
                        : 'Make This First'}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#EDF1EF]">
                      {formatGeneratedText(
                        isMakeMyPostMode
                          ? uploadedImages.length === 0
                            ? results.production_plan?.caption ||
                                results.best_output?.content ||
                                results.production_plan?.concept ||
                                results.production_plan?.shot_order
                            : results.production_plan?.shot_order ||
                                results.production_plan?.what_to_film ||
                                results.production_plan?.concept
                          : results.production_plan?.concept ||
                              results.best_output?.reason ||
                              results.strategy?.content_goal,
                        isMakeMyPostMode
                          ? uploadedImages.length === 0
                            ? 'Copy and paste this post, then send the reply below when someone responds.'
                            : 'Use the uploaded visuals as a short-form video flow: opening visual, detail shots, and CTA ending.'
                          : 'Create the strongest recommended content asset first, then use the CTA and follow-up path below.'
                      )}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                      {isMakeMyPostMode
                        ? (selectedOutputs.some((output) =>
                              [
                                'Instagram Reel',
                                'TikTok Script',
                                'YouTube Shorts',
                                'YouTube Shorts Script',
                              ].includes(output)
                            ) ||
                              uploadedImages.some(
                                (image) => image.sourceType === 'video_frame'
                              ))
                          ? 'Audio / Text Direction'
                          : 'Hashtags'
                        : 'What To Film'}
                    </p>
                    <p className="text-sm leading-relaxed text-[#EDF1EF]">
                      {formatGeneratedText(
                        isMakeMyPostMode
                          ? (selectedOutputs.some((output) =>
                              [
                                'Instagram Reel',
                                'TikTok Script',
                                'YouTube Shorts',
                                'YouTube Shorts Script',
                              ].includes(output)
                            ) ||
                              uploadedImages.some(
                                (image) => image.sourceType === 'video_frame'
                              ))
                            ? results.production_plan?.audio_direction ||
                                results.production_plan?.on_screen_text?.join(' ')
                            : results.production_plan?.hashtags?.join(' ')
                          : results.production_plan?.what_to_film?.[0] ||
                              results.production_plan?.shot_order?.[0],
                        isMakeMyPostMode
                          ? (selectedOutputs.some((output) =>
                              [
                                'Instagram Reel',
                                'TikTok Script',
                                'YouTube Shorts',
                                'YouTube Shorts Script',
                              ].includes(output)
                            ) ||
                              uploadedImages.some(
                                (image) => image.sourceType === 'video_frame'
                              ))
                            ? 'Suggest simple audio mood, pacing, and on-screen text. Do not name copyrighted songs.'
                            : 'Use 3-8 relevant hashtags for this platform.'
                          : 'Film the clearest visual that shows the problem, process, or result behind this campaign.'
                      )}
                    </p>
                  </div>

                  {!isMakeMyPostMode && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                        What To Say
                      </p>
                      <p className="text-sm leading-relaxed text-[#EDF1EF]">
                        {formatGeneratedText(
                          results.production_plan?.spoken_lines?.[0] ||
                            results.production_plan?.on_screen_text?.[0],
                          'Say the first hook or on-screen line from the production plan so the post starts with a clear reason to keep watching.'
                        )}
                      </p>
                    </div>
                  )}

                  {!(isMakeMyPostMode && uploadedImages.length === 0) && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:col-span-2">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                          Caption
                        </p>
                        {!editingCaption ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCaptionDraft(results.production_plan?.caption || '');
                              setEditingCaption(true);
                            }}
                            className="text-xs font-medium text-[#8A9A98] underline-offset-2 hover:text-[#F8A793] hover:underline"
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                      {editingCaption ? (
                        <div>
                          <textarea
                            value={captionDraft}
                            onChange={(event) => setCaptionDraft(event.target.value)}
                            rows={6}
                            className="w-full rounded-xl border border-[#27404A] bg-[#0B1518] p-3 text-sm leading-relaxed text-white outline-none focus:border-[#F2705B]"
                          />
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setResults((current) =>
                                  current
                                    ? {
                                        ...current,
                                        production_plan: {
                                          ...(current.production_plan || {}),
                                          caption: captionDraft,
                                        },
                                      }
                                    : current
                                );
                                setEditingCaption(false);
                              }}
                              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black transition hover:scale-[1.03]"
                            >
                              Save Caption
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCaption(false)}
                              className="rounded-xl border border-[#27404A] px-4 py-2 text-xs font-semibold text-[#C6CFCB]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#EDF1EF]">
                          {formatGeneratedText(
                            results.production_plan?.caption,
                            'Use the caption from Make This Post, then end with the CTA below.'
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {!isMakeMyPostMode && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                        CTA To Use
                      </p>
                      <p className="text-sm font-medium leading-relaxed text-[#EDF1EF]">
                        {formatGeneratedText(
                          results.production_plan?.cta ||
                            results.monetization?.cta_strategy,
                          'Use the campaign CTA exactly as written in the Money Plan.'
                        )}
                      </p>
                    </div>
                  )}

                  <div className={`rounded-2xl border border-white/10 bg-black/20 p-4 ${isMakeMyPostMode ? 'md:col-span-2' : ''}`}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#A8B5B2]">
                      {isMakeMyPostMode ? 'Reply To Send' : 'DM Reply / Follow-Up'}
                    </p>
                    <p className="text-sm leading-relaxed text-[#EDF1EF]">
                      {formatGeneratedText(
                        results.production_plan?.dm_reply ||
                          results.production_plan?.follow_up_message ||
                          results.monetization?.conversion_tips?.[0],
                        'Reply with the qualifying question from the Money Plan, then guide the conversation toward the next booking or sales step.'
                      )}
                    </p>
                  </div>
                </div>

                {isMakeMyPostMode && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">
                          Final Review
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#C6CFCB]">
                          Review the caption, CTA, and reply before saving this to your Posting Queue. Elua will never publish without your approval.
                        </p>
                      </div>

                      <div className="rounded-full border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                        Approval required
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                          Selected Platform
                        </p>
                        <p className="text-sm text-[#EDF1EF]">
                          {formatGeneratedText(results.best_output?.platform) || selectedOutputs[0] || 'Facebook Post'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                          Publish Status
                        </p>
                        <p className="text-sm text-[#EDF1EF]">
                          Safe preview — nothing has been posted.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                        Ready Checklist
                      </p>
                      <div className="grid gap-2 text-sm text-[#D7DEDA] sm:grid-cols-2">
                        <p>✓ Caption reviewed</p>
                        <p>✓ CTA is clear</p>
                        <p>✓ Reply is ready</p>
                        <p>✓ Approval saves it to Posting Queue</p>
                      </div>
                    </div>

                    {publishMessage && (
                      <p className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3 text-sm leading-relaxed text-[#D7DEDA]">
                        {publishMessage}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handlePublishPreview}
                      disabled={publishLoading}
                      className="mt-3 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                    >
                      {publishLoading ? 'Saving safely...' : 'Approve & Save to Queue'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {results && generationMode === 'growth_system' && (
              <div className="mb-3 mt-2 rounded-2xl border border-[#1E3238] bg-[#101D20]/60 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8A9A98]">
                      Want the full plan?
                    </p>
                    <p className="mt-1 text-sm text-[#A8B5B2]">
                      Start with the simple post plan above. Open the full strategy, content, and Money Plan only if you want more detail.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDetailedPlan((current) => !current)}
                    className="w-fit rounded-2xl border border-[#27404A] bg-[#0B1518] px-4 py-2 text-sm font-semibold text-[#EDF1EF] transition hover:bg-[#16262B]"
                  >
                    {showDetailedPlan ? 'Hide full plan' : 'Open full plan'}
                  </button>
                </div>
              </div>
            )}

            {!isMakeMyPostMode && (!results || generationMode === 'viral_hooks' || showDetailedPlan) && (
              <div className="mb-3 flex min-w-0 shrink-0 flex-wrap gap-2">
                {activeTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`min-w-0 rounded-2xl px-3 py-2 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? 'bg-[#F2705B] text-white'
                        : 'bg-[#0B1518] text-[#C6CFCB] hover:bg-[#16262B]'
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
            )}

            <div className={`min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 ${
              results &&
              ((generationMode === 'growth_system' && !showDetailedPlan) ||
                generationMode === 'make_my_post')
                ? 'hidden'
                : ''
            }`}>
                {!results && !loading && (
                  <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-dashed border-[#27404A] bg-[#092B33]/30 p-5 text-center sm:min-h-[420px] lg:h-full">
                    <div className="mb-3 text-4xl">
                      {generationMode === 'viral_hooks' ? '🔥' : isMakeMyPostMode ? '📸' : '✦'}
                    </div>

                    <p className="mb-2 text-xl font-semibold sm:text-2xl">
                      {generationMode === 'viral_hooks'
                        ? 'Turn your idea into scroll-stopping hooks'
                        : isMakeMyPostMode
                          ? 'Upload photos or clips to make your post'
                          : 'Turn your business goal into a Content + Money Plan'}
                    </p>

                    <p className="max-w-md text-sm leading-relaxed text-[#A8B5B2] sm:text-base">
                      {generationMode === 'viral_hooks'
                        ? 'Generate 10 attention-grabbing hooks with angles, explanations, and a strongest-hook pick.'
                        : isMakeMyPostMode
                          ? 'Add your business photos or short clips above, then Elua will write the caption, CTA, DM reply, hashtags, and posting direction.'
                          : 'Get strategy, ready-to-post content, hooks, CTAs, and a simple path to leads, bookings, or sales.'}
                    </p>

                    {!isMakeMyPostMode && (
                      <div className="mt-5 grid w-full max-w-md grid-cols-1 gap-2 text-xs text-[#C6CFCB] sm:grid-cols-3">
                        {(generationMode === 'viral_hooks'
                          ? ['10 hooks', 'Best hook', 'Why it works']
                          : ['Strategy', 'Content', 'Money plan']
                        ).map((item) => (
                          <div
                            key={item}
                            className="rounded-2xl border border-[#1E3238] bg-[#101D20] px-3 py-2 text-center"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {generateError && !loading && (
                <div className="mb-5 rounded-3xl border border-red-500/30 bg-red-950/30 p-5 text-sm text-red-100">
                  <p className="mb-1 font-semibold text-red-200">
                    Generation did not complete
                  </p>
                  <p className="text-red-100/80">{generateError}</p>
                  <button
                    type="button"
                    onClick={() => setGenerateError('')}
                    className="mt-4 rounded-full bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/30"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex min-h-[280px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-[#1E3238] bg-[#092B33]/40 p-6 text-center sm:min-h-[480px] lg:h-full">
                  <div className="relative mb-5">
                    <div className="h-16 w-16 rounded-full border-4 border-[#1E3238] sm:h-24 sm:w-24"></div>
                    <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent border-r-[#F2705B] border-t-[#F8A793] sm:h-24 sm:w-24"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl sm:text-3xl">
                      {generationMode === 'viral_hooks' ? '🔥' : isMakeMyPostMode ? '📸' : '✦'}
                    </div>
                  </div>

                  <h3 className="mb-2 text-xl font-semibold sm:text-2xl">
                    {generationMode === 'viral_hooks'
                      ? 'Generating 10 viral hooks...'
                      : 'Building your growth system...'}
                  </h3>

                  <p className="min-h-[24px] max-w-md text-sm text-[#C6CFCB] sm:text-base">
                    {activeLoadingMessages[loadingStep]}
                  </p>

                  <p className="mt-3 text-xs text-[#8A9A98] sm:text-sm">
                    High-quality generations usually take 30–45 seconds. Keep this
                      page open while Elua builds your result.
                  </p>
                </div>
              )}

              {results &&
                activeTab === 'hooks' &&
                generationMode === 'viral_hooks' && (
                  <div className="space-y-4">
                    {results.best_hook && (
                      <div className="rounded-2xl bg-gradient-to-r from-orange-500 via-[#E4614C] to-[#D8543F] p-5">
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
                        className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5"
                      >
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-[#F2705B]">
                              🔥 Hook #{i + 1}
                            </h3>
                            <p className="mt-1 text-xs capitalize text-[#8A9A98]">
                              {item.angle || 'Attention-driven hook'}
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              copyToClipboard(item.hook || '', `Hook ${i + 1}`)
                            }
                            className="rounded-xl bg-[#16262B] px-3 py-1.5 text-xs transition hover:bg-[#1E3238]"
                          >
                            {copiedItem === `Hook ${i + 1}`
                              ? 'Copied!'
                              : 'Copy'}
                          </button>
                        </div>

                        <p className="text-lg font-medium leading-relaxed text-[#EDF1EF]">
                          {item.hook}
                        </p>

                        {item.why_it_works && (
                          <p className="mt-3 text-sm text-[#A8B5B2]">
                            Why it works: {item.why_it_works}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

              {results &&
                activeTab === 'strategy' &&
                isContentPlanMode && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        🎯 Best Audience
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.target_audience,
                          'The specific buyer or audience segment most likely to care about this campaign.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        🧠 Campaign Strategy
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.core_angle,
                          'The main campaign angle that connects the business goal, audience problem, content idea, and next step.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        🗺️ Content Path
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.content_goal,
                          'The role the content should play, from attention to interest to lead capture or sale.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        🔥 Hook Angles
                      </h3>
                      <div className="space-y-2">
                        {formatGeneratedList(results.strategy?.hook_strategies).map(
                          (hook, i) => (
                            <p key={i} className="text-[#D7DEDA]">
                              • {hook}
                            </p>
                          )
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        🎬 Execution Style
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.content_style,
                          'How the campaign should sound, feel, and be executed across the selected platforms.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        📍 Recommended Platform
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.best_platform,
                          'The selected platform most likely to work best for this campaign.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-2 font-semibold text-[#F2705B]">
                        📈 Why This Works
                      </h3>
                      <div className="space-y-2">
                        {formatStrategyBullets(
                          results.strategy?.why_it_works,
                          'Why this strategy should help the audience understand the problem, take the next step, and move closer to becoming a lead or customer.'
                        ).map((item, i) => (
                          <p key={i} className="text-sm leading-relaxed text-[#D7DEDA] sm:text-base">
                            • {item}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {results &&
                activeTab === 'content' &&
                isContentPlanMode && (
                  <div className="space-y-4">
                    {results.production_plan && (
                      <div className="rounded-2xl border border-[#F2705B]/30 bg-[#F2705B]/10 p-5">
                        <div className="mb-4 flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-[#F8A793]">
                              🎬 Make This Post
                            </h3>
                            <p className="mt-1 text-xs text-[#A8B5B2]">
                              A practical production plan for creating the strongest content asset.
                            </p>
                          </div>

                          <button
                            onClick={() =>
                              copyToClipboard(
                                [
                                  results.production_plan?.format
                                    ? `Format: ${formatGeneratedText(results.production_plan.format)}`
                                    : '',
                                  results.production_plan?.concept
                                    ? `Concept: ${formatGeneratedText(results.production_plan.concept)}`
                                    : '',
                                  ...(results.production_plan?.what_to_film || []).map(
                                    (item, i) => `What to film ${i + 1}: ${formatGeneratedText(item)}`
                                  ),
                                  ...(results.production_plan?.shot_order || []).map(
                                    (item, i) => `Shot ${i + 1}: ${formatGeneratedText(item)}`
                                  ),
                                  results.production_plan?.transition_idea
                                    ? `Transition: ${formatGeneratedText(results.production_plan.transition_idea)}`
                                    : '',
                                  results.production_plan?.audio_direction
                                    ? `Audio: ${formatGeneratedText(results.production_plan.audio_direction)}`
                                    : '',
                                  ...(results.production_plan?.on_screen_text || []).map(
                                    (item, i) => `On-screen text ${i + 1}: ${formatGeneratedText(item)}`
                                  ),
                                  ...(results.production_plan?.spoken_lines || []).map(
                                    (item, i) => `Spoken line ${i + 1}: ${formatGeneratedText(item)}`
                                  ),
                                  results.production_plan?.caption
                                    ? `Caption: ${formatGeneratedText(results.production_plan.caption)}`
                                    : '',
                                  results.production_plan?.cta
                                    ? `CTA: ${formatGeneratedText(results.production_plan.cta)}`
                                    : '',
                                  results.production_plan?.dm_reply
                                    ? `DM reply: ${formatGeneratedText(results.production_plan.dm_reply)}`
                                    : '',
                                  results.production_plan?.follow_up_message
                                    ? `Follow-up: ${formatGeneratedText(results.production_plan.follow_up_message)}`
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join('\n'),
                                'Make This Post'
                              )
                            }
                            className="rounded-xl bg-[#16262B] px-3 py-1.5 text-xs transition hover:bg-[#1E3238]"
                          >
                            {copiedItem === 'Make This Post' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          {results.production_plan.format && (
                            <div className="rounded-xl border border-[#F2705B]/20 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Format
                              </p>
                              <p className="text-sm text-[#EDF1EF]">
                                {formatGeneratedText(results.production_plan.format)}
                              </p>
                            </div>
                          )}

                          {results.production_plan.concept && (
                            <div className="rounded-xl border border-[#F2705B]/20 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Concept
                              </p>
                              <p className="text-sm text-[#EDF1EF]">
                                {formatGeneratedText(results.production_plan.concept)}
                              </p>
                            </div>
                          )}
                        </div>

                        {formatGeneratedList(results.production_plan.what_to_film).length > 0 && (
                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                              {isMakeMyPostMode ? 'Hashtags' : 'What To Film'}
                            </p>
                            <ul className="space-y-2 text-sm text-[#D7DEDA]">
                              {formatGeneratedList(results.production_plan.what_to_film).map((item, i) => (
                                <li key={i} className="leading-relaxed">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {formatGeneratedList(results.production_plan.shot_order).length > 0 && (
                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                              Shot Order
                            </p>
                            <ol className="space-y-2 text-sm text-[#D7DEDA]">
                              {formatGeneratedList(results.production_plan.shot_order).map((item, i) => (
                                <li key={i} className="leading-relaxed">
                                  {i + 1}. {item}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {results.production_plan.transition_idea && (
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Transition
                              </p>
                              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.transition_idea)}
                              </p>
                            </div>
                          )}

                          {results.production_plan.audio_direction && (
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Audio Direction
                              </p>
                              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.audio_direction)}
                              </p>
                            </div>
                          )}
                        </div>

                        {formatGeneratedList(results.production_plan.on_screen_text).length > 0 && (
                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                              On-Screen Text
                            </p>
                            <div className="space-y-2">
                              {formatGeneratedList(results.production_plan.on_screen_text).map((item, i) => (
                                <p
                                  key={i}
                                  className="rounded-lg border border-[#27404A]/60 bg-[#092B33]/40 p-2 text-sm text-[#D7DEDA]"
                                >
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {formatGeneratedList(results.production_plan.spoken_lines).length > 0 && (
                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                              What To Say
                            </p>
                            <div className="space-y-2">
                              {formatGeneratedList(results.production_plan.spoken_lines).map((item, i) => (
                                <p
                                  key={i}
                                  className="rounded-lg border border-[#27404A]/60 bg-[#092B33]/40 p-2 text-sm text-[#D7DEDA]"
                                >
                                  {item}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {results.production_plan.caption && (
                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                              Caption
                            </p>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D7DEDA]">
                              {formatGeneratedText(results.production_plan.caption)}
                            </p>
                          </div>
                        )}

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          {results.production_plan.cta && (
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Call To Action
                              </p>
                              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.cta)}
                              </p>
                            </div>
                          )}

                          {results.production_plan.dm_reply && (
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                DM Reply
                              </p>
                              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.dm_reply)}
                              </p>
                            </div>
                          )}

                          {results.production_plan.follow_up_message && (
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/50 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#F8A793]">
                                Follow-Up
                              </p>
                              <p className="text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.follow_up_message)}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-emerald-300">
                                Final Review
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[#C6CFCB]">
                                Review the caption, CTA, and reply before anything goes live. Elua will never publish without your approval.
                              </p>
                            </div>

                            <div className="rounded-full border border-emerald-500/30 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                              Approval required
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                                Selected Platform
                              </p>
                              <p className="text-sm text-[#EDF1EF]">
                                {formatGeneratedText(results.best_output?.platform) || selectedOutputs[0] || 'Choose a platform'}
                              </p>
                            </div>

                            <div className="rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                                Publish Status
                              </p>
                              <p className="text-sm text-[#EDF1EF]">
                                Safe preview — nothing has been posted.
                              </p>
                            </div>
                          </div>

                          {results.production_plan.caption && (
                            <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                                Caption Preview
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#D7DEDA]">
                                {formatGeneratedText(results.production_plan.caption)}
                              </p>
                            </div>
                          )}

                          <div className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3">
                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                              Ready Checklist
                            </p>
                            <div className="grid gap-2 text-sm text-[#D7DEDA] sm:grid-cols-2">
                              <p>✓ Caption reviewed</p>
                              <p>✓ CTA is clear</p>
                              <p>✓ DM reply is ready</p>
                              <p>✓ Nothing posts without approval</p>
                            </div>
                          </div>

                          {publishMessage && (
                            <p className="mt-3 rounded-xl border border-[#27404A]/70 bg-[#092B33]/40 p-3 text-sm leading-relaxed text-[#D7DEDA]">
                              {publishMessage}
                            </p>
                          )}

                          <button
                            type="button"
                            onClick={handlePublishPreview}
                            disabled={publishLoading}
                            className="mt-3 w-full rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                          >
                            {publishLoading ? 'Saving safely...' : 'Approve & Save to Queue'}
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedOutputs.map((platform) => {
                      const text = results.content?.[platform];
                      const reelScenes =
                        platform === 'Instagram Reel'
                          ? results.structured_content?.[
                              'Instagram Reel'
                            ]?.scenes?.filter(
                              (scene) =>
                                formatGeneratedText(scene.visual).trim() ||
                                formatGeneratedText(scene.spoken_line).trim() ||
                                formatGeneratedText(scene.on_screen_text).trim()
                            )
                          : undefined;
                      const carouselSlides =
                        platform === 'Instagram Carousel'
                          ? results.structured_content?.[
                              'Instagram Carousel'
                            ]?.slides?.filter((slide) =>
                              formatGeneratedText(slide.text).trim()
                            )
                          : undefined;

                      return (
                        <div
                          key={platform}
                          className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5"
                        >
                          <div className="mb-4 flex items-start justify-between gap-4">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-[#F2705B]">
                                  🚀 {platform}
                                </h3>

                                {results.best_output?.platform === platform && (
                                  <span className="rounded-full bg-[#F2705B]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F8A793]">
                                    ⭐ Best Pick
                                  </span>
                                )}
                              </div>

                              {results.best_output?.platform === platform &&
                                results.best_output.reason && (
                                  <p className="mt-1 text-xs text-[#A8B5B2]">
                                    {formatGeneratedText(results.best_output.reason)}
                                  </p>
                                )}

                              {results.best_output?.platform === platform && (
                                <div className="mt-3 rounded-xl border border-[#F2705B]/30 bg-[#F2705B]/10 p-3 text-sm text-[#EDF1EF]">
                                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
                                    Use this first
                                  </p>
                                  <p className="leading-relaxed">
                                    Start with this asset because it gives your audience the clearest next step. Post it first, use the call to action exactly as written, then reply to every comment or DM with the lead magnet and one qualifying question.
                                  </p>
                                </div>
                              )}

                              <p className="mt-1 text-xs text-[#8A9A98]">
                                Optimized for platform-native performance
                              </p>
                            </div>

                            <button
                              onClick={() =>
                                copyToClipboard(formatGeneratedText(text), platform)
                              }
                              className="rounded-xl bg-[#16262B] px-3 py-1.5 text-xs transition hover:bg-[#1E3238]"
                            >
                              {copiedItem === platform ? 'Copied!' : 'Copy'}
                            </button>
                          </div>

                          {reelScenes && reelScenes.length > 0 ? (
                            <div className="space-y-3 text-[#D7DEDA]">
                              {reelScenes.map((scene, index) => (
                                <div
                                  key={index}
                                  className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/40 p-3 text-sm leading-relaxed"
                                >
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
                                    Scene {index + 1}
                                  </p>

                                  {scene.visual && (
                                    <div className="mb-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A9A98]">
                                        Visual
                                      </p>
                                      <p className="whitespace-pre-wrap text-[#D7DEDA]">
                                        {formatGeneratedText(scene.visual)}
                                      </p>
                                    </div>
                                  )}

                                  {scene.spoken_line && (
                                    <div className="mb-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A9A98]">
                                        Spoken Line
                                      </p>
                                      <p className="whitespace-pre-wrap text-[#D7DEDA]">
                                        {formatGeneratedText(scene.spoken_line)}
                                      </p>
                                    </div>
                                  )}

                                  {scene.on_screen_text && (
                                    <div>
                                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A9A98]">
                                        On-Screen Text
                                      </p>
                                      <p className="whitespace-pre-wrap text-[#D7DEDA]">
                                        {formatGeneratedText(scene.on_screen_text)}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : carouselSlides && carouselSlides.length > 0 ? (
                            <div className="space-y-3 text-[#D7DEDA]">
                              {carouselSlides.map((slide, index) => (
                                <div
                                  key={index}
                                  className="rounded-xl border border-[#27404A]/70 bg-[#101D20]/40 p-3 text-sm leading-relaxed"
                                >
                                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#F8A793]">
                                    Slide {slide.slide_number || index + 1}
                                  </p>
                                  <p className="whitespace-pre-wrap text-[#D7DEDA]">
                                    {formatGeneratedText(slide.text)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="space-y-3 text-[#D7DEDA]">
                              {formatGeneratedText(text)
                                .replace(/\s+(?=Scene \d+:|Slide \d+:|\d+\. Slide|Hook:|Point \d+:|Payoff:|CTA:|\d+[-–]\d+s\s+(?:Hook|Problem|Insight|Solution|CTA):|\d+[-–]\d+\s+seconds?:)/g, '\n\n')
                                .split(/\n{2,}/g)
                                .map((section) => section.trim())
                                .filter(Boolean)
                                .reduce<string[]>((sections, section) => {
                                  const isTimestampOnly = /^\d+[-–]\d+s$/.test(section);
                                  const previous = sections[sections.length - 1];
                                  const previousIsTimestampOnly =
                                    previous && /^\d+[-–]\d+s$/.test(previous);

                                  if (isTimestampOnly) {
                                    sections.push(section);
                                  } else if (previousIsTimestampOnly) {
                                    sections[sections.length - 1] = `${previous} ${section}`;
                                  } else {
                                    sections.push(section);
                                  }

                                  return sections;
                                }, [])
                                .map((section, index) => (
                                  <p
                                    key={index}
                                    className="whitespace-pre-wrap rounded-xl border border-[#27404A]/70 bg-[#101D20]/40 p-3 text-sm leading-relaxed"
                                  >
                                    {section}
                                  </p>
                                ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              {results &&
                activeTab === 'monetization' &&
                isContentPlanMode && (
                  <div className="space-y-4">
                    <div className="rounded-2xl bg-gradient-to-r from-[#F2705B] to-[#D8543F] p-5">
                      <h3 className="mb-2 text-lg font-semibold">
                        💰 Your Revenue Path
                      </h3>
                      <p className="text-sm leading-relaxed opacity-90">
                        Start with a simple audience-building offer, capture interested leads,
                        then guide them toward a clear paid next step.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        🗓️ Your Action Plan
                      </h3>

                      <div className="space-y-3">
                        {(results.monetization?.action_plan || []).map((step, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-[#27404A] bg-[#101D20]/70 p-4"
                          >
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                              {formatGeneratedText(step.day || `Day ${i + 1}`)}
                            </p>

                            <div className="space-y-2 text-sm leading-relaxed text-[#D7DEDA]">
                              {step.action && (
                                <p>
                                  <span className="font-semibold text-[#EDF1EF]">Action: </span>
                                  {formatGeneratedText(step.action)}
                                </p>
                              )}

                              {step.cta && (
                                <p>
                                  <span className="font-semibold text-[#EDF1EF]">Call to action: </span>
                                  {formatGeneratedText(step.cta)}
                                </p>
                              )}

                              {step.follow_up && (
                                <p>
                                  <span className="font-semibold text-[#EDF1EF]">Follow-up: </span>
                                  {formatGeneratedText(step.follow_up)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        💰 Revenue Opportunities
                      </h3>

                      <div className="space-y-3">
                        {(results.monetization?.offer_ideas || []).map((offer, i) => (
                          <div
                            key={i}
                            className="rounded-xl border border-[#27404A] bg-[#101D20]/70 p-4"
                          >
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                              Offer #{i + 1}
                            </p>
                            <p className="leading-relaxed text-[#D7DEDA]">{formatGeneratedText(offer)}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        🧲 Lead Magnet Idea
                      </h3>
                      <p className="leading-relaxed text-[#D7DEDA]">
                        {formatGeneratedText(
                          results.monetization?.lead_magnet ||
                            'Create a simple checklist, template, or guide related to this content idea.'
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-4 font-semibold text-[#F2705B]">
                        🧭 Simple Funnel
                      </h3>

                      <div className="space-y-3">
                        <div className="rounded-xl border border-[#27404A] bg-[#101D20]/70 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                            Step 1 — Attract
                          </p>
                          <p className="leading-relaxed text-[#D7DEDA]">
                            {formatGeneratedText(
                              results.monetization?.funnel?.step_1 ||
                                'Use the strongest content piece to attract the right audience with a clear problem, promise, or result.'
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#27404A] bg-[#101D20]/70 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                            Step 2 — Capture
                          </p>
                          <p className="leading-relaxed text-[#D7DEDA]">
                            {formatGeneratedText(
                              results.monetization?.funnel?.step_2 ||
                                'Send interested people to the lead magnet so they can take the next step and join your audience.'
                            )}
                          </p>
                        </div>

                        <div className="rounded-xl border border-[#27404A] bg-[#101D20]/70 p-4">
                          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#8A9A98]">
                            Step 3 — Convert
                          </p>
                          <p className="leading-relaxed text-[#D7DEDA]">
                            {formatGeneratedText(
                              results.monetization?.funnel?.step_3 ||
                                'Follow up with a simple paid offer that directly solves the problem introduced in the content.'
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        ⚡ Conversion Strategy
                      </h3>
                      <p className="leading-relaxed text-[#D7DEDA]">
                        {formatGeneratedText(
                          results.monetization?.cta_strategy ||
                            'Use a direct CTA that connects the content promise to a clear next step.'
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#27404A] bg-[#0B1518] p-5">
                      <h3 className="mb-3 font-semibold text-[#F2705B]">
                        🎯 Conversion Tips
                      </h3>

                      <div className="space-y-2">
                        {(results.monetization?.conversion_tips || []).map((tip, i) => (
                          <p key={i} className="leading-relaxed text-[#D7DEDA]">
                            • {formatGeneratedText(tip)}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>

          <div className="hidden">{accountPanel}</div>



          <div className={signedIn ? "order-4 min-w-0 space-y-4 lg:hidden" : "hidden"}>
            {savedGenerationsCard}
            {approvedPostsCard}
          </div>
        </div>
      </div>
    </div>
  );
}
