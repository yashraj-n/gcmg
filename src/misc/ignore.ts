import fs from "fs/promises";
import path from "path";
import ignore, { Ignore } from "ignore";

/** Hard-coded noise patterns on top of whatever `.gitignore` says. */
const EXTRA_NOISE_PATTERNS = [
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "dist/",
  "build/",
  "out/",
  "coverage/",
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.lock",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.gif",
  "*.webp",
  "*.ico",
  "*.pdf",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.eot",
];

export interface DiffFileBlock {
  file: string;
  content: string;
}

/** Splits a unified diff into per-file blocks (each starting with `diff --git`). */
export function splitDiffByFile(diff: string): DiffFileBlock[] {
  if (!diff.trim()) return [];
  const blocks = diff.split(/(?=^diff --git )/m).filter((b) => b.trim());
  return blocks.map((content) => {
    const match = content.match(/^diff --git a\/(.+?) b\/(.+?)$/m);
    const file = match ? (match[2] ?? match[1] ?? "") : "";
    return { file, content };
  });
}

async function readGitignore(cwd: string): Promise<string> {
  try {
    return await fs.readFile(path.join(cwd, ".gitignore"), "utf-8");
  } catch {
    return "";
  }
}

async function buildIgnoreMatcher(cwd = process.cwd()): Promise<Ignore> {
  const ig = ignore();
  const gitignoreContent = await readGitignore(cwd);
  if (gitignoreContent) ig.add(gitignoreContent);
  ig.add(EXTRA_NOISE_PATTERNS);
  return ig;
}

export interface FilterDiffResult {
  diff: string;
  filteredFiles: string[];
}

/**
 * Removes hunks for files matched by `.gitignore` or the built-in noise
 * list (lockfiles, build output, binaries, …). Git normally won't diff
 * ignored files on its own, but tracked noise (lockfiles committed before
 * a `.gitignore` existed, `dist/` checked in by mistake, etc.) still shows
 * up — this keeps that out of the LLM prompt.
 */
export async function filterNoiseFromDiff(
  diff: string,
  cwd = process.cwd(),
): Promise<FilterDiffResult> {
  const blocks = splitDiffByFile(diff);
  if (blocks.length === 0) return { diff, filteredFiles: [] };

  const ig = await buildIgnoreMatcher(cwd);
  const kept: string[] = [];
  const filteredFiles: string[] = [];

  for (const block of blocks) {
    const isNoisy = block.file && ig.ignores(block.file);
    if (isNoisy) {
      filteredFiles.push(block.file);
    } else {
      kept.push(block.content);
    }
  }

  return { diff: kept.join(""), filteredFiles };
}
