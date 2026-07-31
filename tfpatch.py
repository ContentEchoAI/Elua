import sys

path = "app/workspace/page.tsx"
with open(path, "r") as f:
    original = f.read()

patches = [
(
"""  const todaysPost = approvedPosts[0];

  const todaysPostTitle =
    todaysPost?.status === 'posted'
      ? 'Today\u2019s post is live'
      : todaysPost?.status === 'publishing'
        ? 'Publishing today\u2019s post'
        : todaysPost?.status === 'failed'
          ? 'Review today\u2019s post'
          : 'Post this today';

  const todaysPostStatus =
    todaysPost?.status === 'posted'
      ? 'Posted to Facebook'
      : todaysPost?.status === 'publishing'
        ? 'Publishing'
        : todaysPost?.status === 'failed'
          ? 'Facebook publishing needs review'
          : 'Not posted to Facebook';""",
"""  const todaysPost = approvedPosts[0];
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
    ? 'Today\u2019s post is live'
    : todaysPostPublishing
      ? 'Publishing today\u2019s post'
      : todaysPostFailed
        ? 'Review today\u2019s post'
        : 'Post this today';
  const todaysPostStatus = todaysPostPosted
    ? `Posted to ${todaysPostPlatformLabel}`
    : todaysPostPublishing
      ? 'Publishing'
      : todaysPostFailed
        ? `${todaysPostPlatformLabel} publishing needs review`
        : `Not posted to ${todaysPostPlatformLabel}`;"""
),
]

errors = []
for i, (old, new) in enumerate(patches, start=1):
    count = original.count(old)
    if count != 1:
        errors.append("Step " + str(i) + ": expected exactly once, found " + str(count))

if errors:
    print("ABORTED - no changes made:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

content = original
for old, new in patches:
    content = content.replace(old, new, 1)

with open(path, "w") as f:
    f.write(content)

print("Success - 1 change applied to", path)
