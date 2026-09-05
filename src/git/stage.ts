import { git } from "./diff";

export async function stageAll(): Promise<void> {
  await git.add(["-A"]);
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
