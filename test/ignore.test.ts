import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { filterNoiseFromDiff, splitDiffByFile } from "@/misc/ignore";

const SAMPLE_DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 111..222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,1 +1,2 @@
 export const a = 1;
+export const b = 2;
diff --git a/package-lock.json b/package-lock.json
index 333..444 100644
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,1 +1,2 @@
 {}
+{"lockfileVersion": 3}
diff --git a/dist/bundle.js b/dist/bundle.js
index 555..666 100644
--- a/dist/bundle.js
+++ b/dist/bundle.js
@@ -1,1 +1,2 @@
 var x=1
+var y=2
`;

test("splitDiffByFile splits into per-file blocks with correct names", () => {
  const blocks = splitDiffByFile(SAMPLE_DIFF);
  assert.equal(blocks.length, 3);
  assert.deepEqual(
    blocks.map((b) => b.file),
    ["src/foo.ts", "package-lock.json", "dist/bundle.js"],
  );
});

test("filterNoiseFromDiff drops built-in noise patterns (lockfiles, dist/)", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gcmg-test-"));
  const { diff, filteredFiles } = await filterNoiseFromDiff(SAMPLE_DIFF, tmpDir);

  assert.deepEqual(filteredFiles.sort(), ["dist/bundle.js", "package-lock.json"].sort());
  assert.match(diff, /src\/foo\.ts/);
  assert.doesNotMatch(diff, /package-lock\.json/);
  assert.doesNotMatch(diff, /dist\/bundle\.js/);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("filterNoiseFromDiff also respects a repo .gitignore", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gcmg-test-"));
  await fs.writeFile(path.join(tmpDir, ".gitignore"), "src/foo.ts\n");

  const { diff, filteredFiles } = await filterNoiseFromDiff(SAMPLE_DIFF, tmpDir);
  assert.ok(filteredFiles.includes("src/foo.ts"));
  assert.doesNotMatch(diff, /src\/foo\.ts/);

  await fs.rm(tmpDir, { recursive: true, force: true });
});

test("filterNoiseFromDiff is a no-op on an empty diff", async () => {
  const { diff, filteredFiles } = await filterNoiseFromDiff("");
  assert.equal(diff, "");
  assert.deepEqual(filteredFiles, []);
});
