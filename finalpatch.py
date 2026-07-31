import sys

path = "app/workspace/page.tsx"
with open(path, "r") as f:
    original = f.read()

patches = [
(
"import { uploadAllImages } from '@/lib/uploadAllImages';",
"import { uploadAllImages } from '@/lib/uploadAllImages';\nimport { uploadVideoDirect } from '@/lib/uploadVideoDirect';"
),
(
"  const [uploadedVideoFile, setUploadedVideoFile] = useState<{ dataUrl: string; name: string } | null>(null);",
"  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);"
),
(
"""          loadedMedia.push(...videoFrames);
          setUploadedVideoFile({
            dataUrl: await readFileAsDataUrl(file),
            name: file.name,
          });
        }""",
"""          loadedMedia.push(...videoFrames);
          setUploadedVideoFile(file);
        }"""
),
(
"""      const isReelPlatform = platform === 'Instagram Reel';
      const uploadedMediaUrls =
        isReelPlatform && uploadedVideoFile
          ? await uploadAllImages([{ dataUrl: uploadedVideoFile.dataUrl }])
          : await uploadAllImages(uploadedImages);""",
"""      const isReelPlatform = platform === 'Instagram Reel';
      const uploadedMediaUrls =
        isReelPlatform && uploadedVideoFile
          ? await (async () => {
              const url = await uploadVideoDirect(uploadedVideoFile);
              return url ? [url] : [];
            })()
          : await uploadAllImages(uploadedImages);"""
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

print("Success - 4 changes applied to", path)
