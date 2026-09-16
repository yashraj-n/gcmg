import simpleGit from "simple-git";

export const git = simpleGit();

export interface DiffResult {
  diff: string;
  /** true when the diff came from the staging area only */
  stagedOnly: boolean;
}

export async function isGitRepo(): Promise<boolean> {
  try {
    await git.revparse(["--is-inside-work-tree"]);
    return true;
  } catch {
    return false;
  }
}

export async function initGitRepo(): Promise<void> {
  await git.init();
}

export async function getStagedDiff(paths?: string[]): Promise<string> {
  try {
    const args = ["--cached"];
    if (paths && paths.length > 0) {
      args.push("--", ...paths);
    }
    return await git.diff(args);
  } catch {
    return "";
  }
}

export async function getWorkingDiff(paths?: string[]): Promise<string> {
  try {
    const args: string[] = [];
    if (paths && paths.length > 0) {
      args.push("--", ...paths);
    }
    return await git.diff(args);
  } catch {
    return "";
  }
}

export async function getFullDiff(paths?: string[]): Promise<string> {
  try {
    const args = ["HEAD"];
    if (paths && paths.length > 0) {
      args.push("--", ...paths);
    }
    return await git.diff(args);
  } catch {
    // If repository has no commits yet (fresh repo), register untracked files with intent-to-add
    try {
      await git.raw(["add", "-N", "--all"]);
    } catch {
      // ignore if add -N is unavailable
    }
    const staged = await getStagedDiff(paths);
    const working = await getWorkingDiff(paths);
    return [staged, working].filter(Boolean).join("\n");
  }
}

/**
 * Staged-only by default. If nothing is staged, falls back to the full
 * working diff so the user still gets a preview — but `stagedOnly` is
 * false, so callers should require an explicit "stage all" action before
 * committing anything.
 */
export async function collectDiff(options: { all?: boolean; stagedOnly?: boolean; paths?: string[] } = {}): Promise<DiffResult> {
  if (options.all) {
    return { diff: await getFullDiff(options.paths), stagedOnly: false };
  }

  const staged = await getStagedDiff(options.paths);
  if (options.stagedOnly) {
    return { diff: staged, stagedOnly: true };
  }

  if (staged && staged.trim().length > 0) {
    return { diff: staged, stagedOnly: true };
  }

  const full = await getFullDiff(options.paths);
  return { diff: full, stagedOnly: false };
}

export function extractChangedFiles(diff: string): string[] {
  const files: string[] = [];
  const re = /^diff --git a\/(.+?) b\/(.+?)$/gm;
  let match: RegExpExecArray | null;
  while ((match = re.exec(diff))) {
    files.push(match[2] ?? match[1]);
  }
  return files;
}
