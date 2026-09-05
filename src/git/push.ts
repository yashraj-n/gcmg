import { git } from "./diff";

export interface PushResult {
  pushed: boolean;
  setUpstream: boolean;
  branch: string;
}

/**
 * Pushes the current branch, setting the upstream automatically on the
 * first push of a new branch. Full smart-push behaviour (force-push guard,
 * richer error handling) lands in a later phase — this covers the common
 * case needed by the `u` (commit + push) key.
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
