import { git } from "./diff";

export interface PushResult {
  pushed: boolean;
  setUpstream: boolean;
  branch: string;
}

/**
 * Pushes the current branch to origin. On the first push of a new branch
 * (no upstream tracking configured), automatically sets upstream with
 * `-u origin <branch>` so subsequent `git push` calls work without flags.
 */
export async function pushCurrentBranch(): Promise<PushResult> {
  const status = await git.status();
  const branch = status.current ?? "HEAD";

  if (!status.tracking) {
    await git.push(["-u", "origin", branch]);
    return { pushed: true, setUpstream: true, branch };
  }

  await git.push();
  return { pushed: true, setUpstream: false, branch };
}
