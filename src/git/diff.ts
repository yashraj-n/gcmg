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

export async function getStagedDiff(): Promise<string> {
  try {
    return await git.diff(["--cached"]);
  } catch {
    return "";
  }
}

export async function getWorkingDiff(): Promise<string> {
  try {
    return await git.diff([]);
  } catch {
    return "";
  }
}

export async function getFullDiff(): Promise<string> {
  try {
    return await git.diff(["HEAD"]);
  } catch {
    const staged = await getStagedDiff();
    const working = await getWorkingDiff();
    return [staged, working].filter(Boolean).join("\n");
  }
}

/**
 * Staged-only by default. If nothing is staged, falls back to the full
 * working diff so the user still gets a preview — but `stagedOnly` is
 * false, so callers should require an explicit "stage all" action before
 * committing anything.
 */
export async function collectDiff(options: { all?: boolean } = {}): Promise<DiffResult> {
  if (options.all) {
    return { diff: await getFullDiff(), stagedOnly: false };
  }

  const staged = await getStagedDiff();
  if (staged && staged.trim().length > 0) {
    return { diff: staged, stagedOnly: true };
  }

  const full = await getFullDiff();
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
