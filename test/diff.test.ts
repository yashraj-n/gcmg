import { test } from "node:test";
import assert from "node:assert/strict";
import { extractChangedFiles } from "@/git/diff";

test("extractChangedFiles reads file paths from a multi-file diff", () => {
  const diff = `diff --git a/src/a.ts b/src/a.ts
index 1..2 100644
--- a/src/a.ts
+++ b/src/a.ts
@@ -1 +1 @@
-old
+new
diff --git a/README.md b/README.md
index 3..4 100644
--- a/README.md
+++ b/README.md
@@ -1 +1 @@
-old
+new
`;
  assert.deepEqual(extractChangedFiles(diff), ["src/a.ts", "README.md"]);
});

test("extractChangedFiles returns an empty array for an empty diff", () => {
  assert.deepEqual(extractChangedFiles(""), []);
});
