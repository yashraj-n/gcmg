import { test } from "node:test";
import assert from "node:assert/strict";
import { scanForSecrets } from "@/misc/secrets";

test("flags .env files by name alone", () => {
  const diff = `diff --git a/.env b/.env
index 111..222 100644
--- a/.env
+++ b/.env
@@ -0,0 +1,1 @@
+SOME_VALUE=1
`;
  const warnings = scanForSecrets(diff);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].file, ".env");
  assert.match(warnings[0].reason, /sensitive file type/);
});

test("flags an AWS access key added in a normal source file", () => {
  const diff = `diff --git a/src/config.ts b/src/config.ts
index 111..222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,1 +1,2 @@
 export const x = 1;
+const key = "AKIAABCDEFGHIJKLMNOP";
`;
  const warnings = scanForSecrets(diff);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0].reason, /AWS access key/);
});

test("does not flag ordinary code changes", () => {
  const diff = `diff --git a/src/math.ts b/src/math.ts
index 111..222 100644
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,1 +1,2 @@
 export const add = (a, b) => a + b;
+export const sub = (a, b) => a - b;
`;
  assert.deepEqual(scanForSecrets(diff), []);
});

test("ignores secrets on removed (-) lines", () => {
  const diff = `diff --git a/src/config.ts b/src/config.ts
index 111..222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,2 +1,1 @@
-const key = "AKIAABCDEFGHIJKLMNOP";
 export const x = 1;
`;
  assert.deepEqual(scanForSecrets(diff), []);
});
