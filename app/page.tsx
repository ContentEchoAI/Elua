import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 text-white">
      <div className="pointer-events-none absolute left-[-14rem] top-36 h-72 w-72 rounded-full bg-purple-500/5 blur-[160px]" />
      <div className="pointer-events-none absolute right-[-20rem] top-52 h-96 w-96 rounded-full bg-pink-500/5 blur-[160px]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/hummingbird-mark.jpeg"
              alt="Hummingbird AI"
              width={44}
              height={44}
              className="rounded-2xl"
              priority
            />
            <div>
              <p className="text-sm font-semibold leading-none sm:text-base">
                Hummingbird AI
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Premium marketing workspace
              </p>
            </div>
          </div>

          <Link
            href="/workspace"
            className="rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-100 transition hover:border-purple-400"
          >
            Open Workspace
          </Link>
        </header>

        <section className="flex flex-1 items-center py-16 sm:py-20">
          <div className="max-w-5xl">
            <div className="mb-5 inline-flex rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200">
              Save time creating better marketing content
            </div>

            <h1 className="max-w-5xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
              Save time every week creating high-quality marketing content for your business.
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-relaxed text-zinc-300 sm:text-xl">
              Hummingbird AI turns your photos, short clips, or simple ideas into a ready-to-post campaign with the caption, CTA, reply message, hashtags, and posting direction already written.
            </p>

            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
              Built for service businesses that want better marketing content without spending hours figuring out what to post.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/workspace"
                className="rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4 text-center text-sm font-bold text-white shadow-2xl shadow-purple-950/40 transition hover:scale-[1.02]"
              >
                Make My Post
              </Link>

            </div>

            <a
              href="#how-it-works"
              className="mt-5 inline-flex text-sm font-semibold text-purple-300 transition hover:text-purple-200"
            >
              ↓ See what Hummingbird creates for you
            </a>

          </div>
        </section>

        <section
          id="how-it-works"
          className="border-t border-zinc-900 py-12 sm:py-16"
        >
          <div className="mb-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
              What Hummingbird creates for you
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              A complete marketing post, not just a caption.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
              Hummingbird gives service businesses the pieces they need to post faster,
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
                className="border-l border-purple-500/40 py-1 pl-4"
              >
                <p className="text-sm font-semibold text-zinc-100">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-zinc-900 py-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-purple-300">
                Built for service businesses
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Better marketing without spending hours on content.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
                Hummingbird is made for business owners who need consistent content,
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
                  className="border-l border-purple-500/40 py-1 pl-4"
                >
                  <p className="text-sm font-semibold text-zinc-100">
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
