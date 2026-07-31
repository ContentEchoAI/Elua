import sys

path = "app/workspace/page.tsx"
with open(path, "r") as f:
    original = f.read()

patches = [
(
"""  const [publishingPostId, setPublishingPostId] = useState('');""",
"""  const [publishingFacebookId, setPublishingFacebookId] = useState('');
  const [publishingInstagramId, setPublishingInstagramId] = useState('');"""
),
(
"""    setPublishingPostId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              publishError: undefined,
            }
          : item
      )
    );""",
"""    setPublishingFacebookId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id
          ? {
              ...item,
              publishError: undefined,
            }
          : item
      )
    );"""
),
(
"""    } finally {
      setPublishingPostId('');
    }
  };

  const handlePublishApprovedPostToInstagram = async (post: ApprovedPost) => {
    if (post.instagramStatus === 'posted' || publishingPostId === post.id) return;""",
"""    } finally {
      setPublishingFacebookId('');
    }
  };

  const handlePublishApprovedPostToInstagram = async (post: ApprovedPost) => {
    if (post.instagramStatus === 'posted' || publishingInstagramId === post.id) return;"""
),
(
"""    setPublishingPostId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, instagramPublishError: undefined } : item
      )
    );""",
"""    setPublishingInstagramId(post.id);
    setApprovedPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, instagramPublishError: undefined } : item
      )
    );"""
),
(
"""    setPublishingPostId('');
  };
  const removeApprovedPost = (postId: string) => {""",
"""    setPublishingInstagramId('');
  };
  const removeApprovedPost = (postId: string) => {"""
),
(
"""                        : publishingPostId === post.id
                          ? 'Publishing...'
                          : 'Not posted'}""",
"""                        : publishingFacebookId === post.id
                          ? 'Publishing...'
                          : 'Not posted'}"""
),
(
"""                    disabled={
                      publishingPostId === post.id ||
                      !metaStatus?.publishingEnabled
                    }
                    className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publishingPostId === post.id
                      ? 'Publishing...'
                      : metaStatus?.publishingEnabled
                        ? 'Publish to Facebook'
                        : 'Publishing disabled'}""",
"""                    disabled={
                      publishingFacebookId === post.id ||
                      !metaStatus?.publishingEnabled
                    }
                    className="rounded-xl bg-blue-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publishingFacebookId === post.id
                      ? 'Publishing...'
                      : metaStatus?.publishingEnabled
                        ? 'Publish to Facebook'
                        : 'Publishing disabled'}"""
),
(
"""                    disabled={
                      publishingPostId === post.id ||
                      !metaStatus?.publishingEnabled ||
                      !post.mediaUrls ||
                      post.mediaUrls.length === 0
                    }
                    className="rounded-xl bg-pink-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publishingPostId === post.id
                      ? 'Publishing...'""",
"""                    disabled={
                      publishingInstagramId === post.id ||
                      !metaStatus?.publishingEnabled ||
                      !post.mediaUrls ||
                      post.mediaUrls.length === 0
                    }
                    className="rounded-xl bg-pink-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {publishingInstagramId === post.id
                      ? 'Publishing...'"""
),
]

errors = []
for i, (old, new) in enumerate(patches, start=1):
    count = original.count(old)
    if count != 1:
        errors.append("Step " + str(i) + ": expected to find this exactly once, found " + str(count) + " time(s)")

if errors:
    print("ABORTED - no changes made. Problems found:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

content = original
for old, new in patches:
    content = content.replace(old, new, 1)

with open(path + ".bak", "w") as f:
    f.write(original)

with open(path, "w") as f:
    f.write(content)

print("Success - all 8 changes applied to", path)
print("A backup of the original was saved to", path + ".bak")
