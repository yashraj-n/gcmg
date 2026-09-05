import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import chalk from "chalk";

/**
 * Resolve the editor command.
 * Priority:
 *   1. $GIT_EDITOR / $VISUAL / $EDITOR (user override — always respected)
 *   2. OS built-in default that is guaranteed to exist:
 *        Windows → notepad
 *        macOS   → open -e -W  (TextEdit, wait until closed)
 *        Linux   → nano, then vi
 * Never auto-selects VS Code or other optional apps.
 */
function resolveEditor(): string {
  const fromEnv =
    process.env.GIT_EDITOR || process.env.VISUAL || process.env.EDITOR;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  if (process.platform === "win32") {
    return "notepad";
  }

  if (process.platform === "darwin") {
    // TextEdit, -W waits until the user closes the window
    return "open -e -W";
  }

  // Linux / other Unix: prefer nano (friendlier), fall back to vi
  for (const candidate of ["nano", "vi"]) {
    const which = spawnSync("which", [candidate], { encoding: "utf-8" });
    if (which.status === 0) return candidate;
  }
  return "vi";
}

/**
 * Writes `message` to a temp file, opens it in the system editor, and
 * returns the edited content. Returns `null` only when the user clearly
 * discarded (vim :q!) or the editor failed to launch.
 */
export async function editMessageInEditor(message: string): Promise<string | null> {
  const editor = resolveEditor();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gcmg-"));
  const tmpFile = path.join(tmpDir, "COMMIT_EDITMSG");
  await fs.writeFile(tmpFile, message, "utf-8");

  const isVimFamily = /\b(n?vim|vi)\b/i.test(editor) && !/\bopen\b/i.test(editor);
  const isMacOpen = process.platform === "darwin" && editor.startsWith("open ");

  console.log(chalk.dim(`\nOpening ${editor}...`));
  if (isVimFamily) {
    console.log(chalk.dim("  :wq / ZZ  → save and return"));
    console.log(chalk.dim("  :q!       → discard changes\n"));
  } else {
    console.log(chalk.dim("  Save the file and close the editor to continue.\n"));
  }

  const quotedFile =
    process.platform === "win32" ? `"${tmpFile}"` : JSON.stringify(tmpFile);

  // macOS `open -e -W file` — file is a normal argument, not shell-quoted path only
  const command = isMacOpen
    ? `${editor} ${quotedFile}`
    : `${editor} ${quotedFile}`;

  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    // Never hide the window — GUI editors (notepad, TextEdit) must be visible
    windowsHide: false,
  });

  if (result.error) {
    console.log(chalk.red(`Failed to open editor: ${result.error.message}`));
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }

  // Only vim-family non-zero exit means "discard" (:q!)
  if (isVimFamily && result.status !== 0 && result.status !== null) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }

  const edited = await fs.readFile(tmpFile, "utf-8");
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  return edited.trim();
}
