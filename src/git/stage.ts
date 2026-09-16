import { git } from "./diff";

export async function stageAll(): Promise<void> {
  await git.add(["-A"]);
}

/** Stage a specific set of file paths. */
export async function stageFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await git.add(paths);
}

/** Unstage a specific set of file paths (git restore --staged). */
export async function unstageFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await git.raw(["restore", "--staged", "--", ...paths]);
}

export interface ChangedFile {
  path: string;
  status: string; // M=modified, A=new, D=deleted, ?=untracked, R=renamed …
  staged: boolean;
}

/** Returns all changed files (staged + unstaged + untracked). */
export async function getChangedFiles(): Promise<ChangedFile[]> {
  const status = await git.status();
  const files: ChangedFile[] = [];

  // Staged changes
  for (const f of status.staged) {
    files.push({ path: f, status: "S", staged: true });
  }
  // Modified (unstaged)
  for (const f of status.modified) {
    if (!files.some((x) => x.path === f)) {
      files.push({ path: f, status: "M", staged: false });
    }
  }
  // Deleted (unstaged)
  for (const f of status.deleted) {
    if (!files.some((x) => x.path === f)) {
      files.push({ path: f, status: "D", staged: false });
    }
  }
  // Untracked / new
  for (const f of status.not_added) {
    if (!files.some((x) => x.path === f)) {
      files.push({ path: f, status: "?", staged: false });
    }
  }
  // Renamed (simple-git also includes these in status.staged, so dedup by path)
  for (const r of status.renamed) {
    const p = typeof r === "string" ? r : (r.to ?? r.from);
    if (p && !files.some((x) => x.path === p)) {
      files.push({ path: p, status: "R", staged: true });
    }
  }

  return files;
}

export async function getStatusSummary(): Promise<{
  staged: number;
  unstaged: number;
  untracked: number;
}> {
  const status = await git.status();
  return {
    staged: status.staged.length,
    unstaged: status.modified.length + status.deleted.length,
    untracked: status.not_added.length,
  };
}
