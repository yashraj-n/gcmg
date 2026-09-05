import { git } from "./diff";

export async function commitStaged(message: string): Promise<void> {
  await git.commit(message);
}
