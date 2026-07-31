import sys

path = "app/api/meta/publish/route.ts"
with open(path, "r") as f:
    original = f.read()

patches = [
(
"import { publishInstagramImagePost, publishInstagramCarouselPost } from '@/lib/metaInstagram';",
"import { publishInstagramImagePost, publishInstagramCarouselPost, publishInstagramReelPost } from '@/lib/metaInstagram';"
),
(
"""type MetaPublishRequest = {
  approvedPostId?: string;
  caption?: string;
  hashtags?: string[] | string;
  platform?: string;
  mediaUrls?: string[];
  publishNow?: boolean;
};""",
"""type MetaPublishRequest = {
  approvedPostId?: string;
  caption?: string;
  hashtags?: string[] | string;
  platform?: string;
  mediaUrls?: string[];
  publishNow?: boolean;
  isReel?: boolean;
};"""
),
(
"""      const published =
        platform === 'instagram' && requestedMediaUrls.length >= 2
          ? await publishInstagramCarouselPost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrls: requestedMediaUrls,
              caption,
            })
          : platform === 'instagram'
          ? await publishInstagramImagePost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrl: requestedMediaUrls[0],
              caption,
            })
          : await publishFacebookPagePost({
              pageId: facebookPageId,
              pageAccessToken: facebookPageAccessToken,
              message: caption,
              mediaUrl: requestedMediaUrls[0],
            });""",
"""      const published =
        platform === 'instagram' && body.isReel === true
          ? await publishInstagramReelPost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              videoUrl: requestedMediaUrls[0],
              caption,
            })
          : platform === 'instagram' && requestedMediaUrls.length >= 2
          ? await publishInstagramCarouselPost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrls: requestedMediaUrls,
              caption,
            })
          : platform === 'instagram'
          ? await publishInstagramImagePost({
              instagramAccountId,
              pageAccessToken: facebookPageAccessToken,
              imageUrl: requestedMediaUrls[0],
              caption,
            })
          : await publishFacebookPagePost({
              pageId: facebookPageId,
              pageAccessToken: facebookPageAccessToken,
              message: caption,
              mediaUrl: requestedMediaUrls[0],
            });"""
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

print("Success - 3 changes applied to", path)
