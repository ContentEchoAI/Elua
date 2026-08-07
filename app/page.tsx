import Image from 'next/image';
import Link from 'next/link';

const CORAL = '#F2705B';

function Wave({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 12"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M0 6 Q 15 0, 30 6 T 60 6 T 90 6 T 120 6"
        stroke={CORAL}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#092B33] text-[#F6F1E7]">
      <div className="pointer-events-none absolute left-[-14rem] top-36 h-72 w-72 rounded-full bg-[#F2705B]/10 blur-[160px]" />
      <div className="pointer-events-none absolute right-[-20rem] top-52 h-96 w-96 rounded-full bg-[#1A6B7D]/20 blur-[160px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/elua-favicon.png"
              alt="Elua"
              width={44}
              height={44}
              className="rounded-2xl"
              priority
            />
            <div>
              <p className="font-serif text-base font-semibold leading-none sm:text-lg">
                elua
              </p>
              <p className="mt-1 text-xs text-[#F6F1E7]/50">
                Photo-to-post workspace
              </p>
            </div>
          </div>

          <Link
            href="/workspace"
            className="rounded-full border border-[#F6F1E7]/15 bg-white/5 px-4 py-2 text-xs font-semibold text-[#F6F1E7] transition hover:border-[#F6F1E7]/40"
          >
            Open Workspace
          </Link>
        </header>

        <section className="flex flex-1 items-center py-16 sm:py-20">
          <div className="max-w-5xl">
            <div className="mb-5 inline-flex rounded-full border border-[#F6F1E7]/15 bg-white/5 px-4 py-2 text-sm font-medium text-[#F6F1E7]/80">
              Save time creating better marketing content
            </div>

            <h1 className="max-w-5xl font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Save time every week creating high-quality marketing content for your business.
            </h1>

            <Wave className="mt-6 h-3 w-40" />

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-[#F6F1E7]/80 sm:text-xl">
              Elua turns your photos, short clips, or simple ideas into a ready-to-post campaign with the caption, CTA, reply message, hashtags, and posting direction already written.
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#F6F1E7]/55 sm:text-base">
              Built for service businesses that want better marketing content without spending hours figuring out what to post.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="rounded-2xl bg-[#F2705B] px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-black/30 transition hover:bg-[#e4614c]"
              >
                Make My Post — Free
              </Link>
            </div>

            <p className="mt-3 text-sm font-semibold text-[#F6F1E7]/80">
              5 free generations with a free account. No credit card needed.
            </p>

            <p className="mt-2 text-xs font-medium text-[#F6F1E7]/60">
              ✓ Nothing posts without your approval · 🔒 Photos only used to make your post · 💳 Payments by Stripe
            </p>

            <a
              href="#how-it-works"
              className="mt-5 inline-flex text-sm font-semibold text-[#F6F1E7]/60 transition hover:text-[#F6F1E7]"
            >
              ↓ See what Elua creates for you
            </a>
          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-[#F6F1E7]/10 py-12 sm:py-16"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F2705B]">
              What Elua creates for you
            </p>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
              A complete marketing post, not just a caption.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#F6F1E7]/65 sm:text-base">
              Elua gives service businesses the pieces they need to post faster,
              sound better, and turn content into real conversations.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Ready-to-post caption',
              'Strong call to action',
              'Reply message for DMs or comments',
              'Relevant hashtags',
              'Posting direction',
              'Saved campaign to reuse later',
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[#F6F1E7]/10 bg-white/5 px-4 py-3"
              >
                <p className="text-sm font-semibold text-[#F6F1E7]">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-[#F6F1E7]/10 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#F2705B]">
                Built for service businesses
              </p>
              <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                Better marketing without spending hours on content.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#F6F1E7]/65 sm:text-base">
                Elua is made for business owners who need consistent content,
                but do not have time to plan posts, write captions, think of CTAs,
                and figure out what to say to leads.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Post more consistently',
                'Sound more professional',
                'Turn photos into marketing',
                'Get more replies and quote requests',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[#F6F1E7]/10 bg-white/5 px-4 py-3"
                >
                  <p className="text-sm font-semibold text-[#F6F1E7]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
