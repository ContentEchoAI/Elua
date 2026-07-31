import sys

path = "app/workspace/page.tsx"
with open(path, "r") as f:
    original = f.read()

old = """                    })}
                  </div>
                </div>
              )}"""

new = """                    })}
                  </div>
                  <p className="mt-2 text-xs text-zinc-600">
                    Coming soon: {outputOptions.filter((output) => output.comingSoon).map((output) => output.label).join(', ')}
                 </p>
                </div>
              )}"""

count = original.count(old)
if count != 1:
    print("ABORTED - expected exactly once, found", count)
    sys.exit(1)

content = original.replace(old, new, 1)
with open(path, "w") as f:
    f.write(content)

print("Success - 1 change applied to", path)
