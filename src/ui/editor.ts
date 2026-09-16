import fs from "fs/promises";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";
import readline from "readline";
import chalk from "chalk";

/**
 * In-terminal multi-line editor (no external $EDITOR).
 * - Type freely; Enter inserts a newline
 * - Ctrl+S → save and return
 * - Esc / Ctrl+C → cancel (returns null)
 */
function getLineCol(buffer: string, cursor: number): { line: number; col: number; lines: string[] } {
  const lines = buffer.split("\n");
  let remaining = cursor;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (remaining <= l.length) {
      return { line: i, col: remaining, lines };
    }
    remaining -= l.length + 1;
  }
  return { line: Math.max(0, lines.length - 1), col: lines[lines.length - 1]?.length ?? 0, lines };
}

function getPosFromLineCol(lines: string[], line: number, col: number): number {
  const targetLine = Math.max(0, Math.min(lines.length - 1, line));
  const targetCol = Math.max(0, Math.min(lines[targetLine]?.length ?? 0, col));
  let pos = 0;
  for (let i = 0; i < targetLine; i++) {
    pos += lines[i]!.length + 1;
  }
  return pos + targetCol;
}

function renderBufferWithCursor(buffer: string, cursor: number): string {
  if (buffer.length === 0) {
    return chalk.bgCyan.black(" ");
  }
  if (cursor >= buffer.length) {
    return buffer + chalk.bgCyan.black(" ");
  }
  const before = buffer.slice(0, cursor);
  const at = buffer[cursor]!;
  const after = buffer.slice(cursor + 1);

  if (at === "\n") {
    return before + chalk.bgCyan.black(" ") + "\n" + after;
  }
  return before + chalk.bgCyan.black(at) + after;
}

/**
 * In-terminal multi-line editor (no external $EDITOR).
 * - Full arrow-key navigation (↑↓←→, Home, End)
 * - Visual high-contrast cursor at active edit position + Ln/Col status
 * - Ctrl+S → save and return
 * - Esc / Ctrl+C → cancel (returns null)
 */
export async function editMessageInTerminal(
  message: string,
): Promise<string | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return editMessageInEditor(message);
  }

  return new Promise((resolve) => {
    let buffer = message;
    let cursor = buffer.length;
    let closed = false;

    const draw = () => {
      console.clear();
      const { line, col, lines } = getLineCol(buffer, cursor);
      const cols = process.stdout.columns ?? 80;
      const sep = "─".repeat(Math.min(cols - 4, 64));

      console.log(
        chalk.cyan.bold("  Edit commit message") +
          chalk.dim(`  [Line ${line + 1}/${lines.length}, Col ${col + 1}]`),
      );
      console.log(
        chalk.dim("  Ctrl+S save · Esc cancel · ↑↓←→ move · Enter newline · Del/Backspace erase"),
      );
      console.log("  " + chalk.dim(sep));
      console.log(renderBufferWithCursor(buffer, cursor));

      // Synchronize hardware terminal cursor position
      const headerRows = 3;
      const targetRow = headerRows + line + 1;
      const targetCol = col + 1;
      process.stdout.write(`\x1b[?25h\x1b[${targetRow};${targetCol}H`);
    };

    draw();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    const finish = (value: string | null) => {
      if (closed) return;
      closed = true;
      process.stdin.removeListener("keypress", onKey);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\x1b[?25h");
      resolve(value);
    };

    function onKey(
      str: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean; sequence?: string },
    ) {
      if (closed) return;

      const name = (key?.name ?? "").toLowerCase();
      const seq = key?.sequence ?? "";

      // Cancel
      if ((key?.ctrl && name === "c") || name === "escape") {
        finish(null);
        return;
      }

      // Save: Ctrl+S or raw 0x13
      if ((key?.ctrl && name === "s") || seq === "\x13" || seq === "\u0013") {
        finish(buffer.trimEnd());
        return;
      }

      // Navigation: Left / Ctrl+B
      if (name === "left" || seq === "\u001b[D" || (key?.ctrl && name === "b")) {
        cursor = Math.max(0, cursor - 1);
        draw();
        return;
      }

      // Navigation: Right / Ctrl+F
      if (name === "right" || seq === "\u001b[C" || (key?.ctrl && name === "f")) {
        cursor = Math.min(buffer.length, cursor + 1);
        draw();
        return;
      }

      // Navigation: Up / Ctrl+P
      if (name === "up" || seq === "\u001b[A" || (key?.ctrl && name === "p")) {
        const { line, col, lines } = getLineCol(buffer, cursor);
        if (line > 0) {
          cursor = getPosFromLineCol(lines, line - 1, col);
        } else {
          cursor = 0;
        }
        draw();
        return;
      }

      // Navigation: Down / Ctrl+N
      if (name === "down" || seq === "\u001b[B" || (key?.ctrl && name === "n")) {
        const { line, col, lines } = getLineCol(buffer, cursor);
        if (line < lines.length - 1) {
          cursor = getPosFromLineCol(lines, line + 1, col);
        } else {
          cursor = buffer.length;
        }
        draw();
        return;
      }

      // Navigation: Home / Ctrl+A
      if (name === "home" || seq === "\u001b[H" || seq === "\u001b[1~" || (key?.ctrl && name === "a")) {
        const { line, lines } = getLineCol(buffer, cursor);
        cursor = getPosFromLineCol(lines, line, 0);
        draw();
        return;
      }

      // Navigation: End / Ctrl+E
      if (name === "end" || seq === "\u001b[F" || seq === "\u001b[4~" || (key?.ctrl && name === "e")) {
        const { line, lines } = getLineCol(buffer, cursor);
        cursor = getPosFromLineCol(lines, line, lines[line]?.length ?? 0);
        draw();
        return;
      }

      // Newline (Enter)
      if (name === "return" || name === "enter" || seq === "\r" || seq === "\n") {
        buffer = buffer.slice(0, cursor) + "\n" + buffer.slice(cursor);
        cursor++;
        draw();
        return;
      }

      // Backspace (delete char before cursor)
      if (name === "backspace" || seq === "\x7f" || seq === "\b") {
        if (cursor > 0) {
          buffer = buffer.slice(0, cursor - 1) + buffer.slice(cursor);
          cursor--;
          draw();
        }
        return;
      }

      // Delete (delete char at cursor)
      if (name === "delete" || seq === "\u001b[3~") {
        if (cursor < buffer.length) {
          buffer = buffer.slice(0, cursor) + buffer.slice(cursor + 1);
          draw();
        }
        return;
      }

      // Printable character (no ctrl/alt/meta)
      if (!key?.ctrl && !key?.meta && str && str.length === 1 && str >= " ") {
        buffer = buffer.slice(0, cursor) + str + buffer.slice(cursor);
        cursor += str.length;
        draw();
        return;
      }
    }

    process.stdin.on("keypress", onKey);
  });
}

/**
 * Resolve the editor command (legacy / fallback path).
 */
function resolveEditor(): string {
  const fromEnv =
    process.env.GIT_EDITOR || process.env.VISUAL || process.env.EDITOR;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  if (process.platform === "win32") {
    return "notepad";
  }

  if (process.platform === "darwin") {
    return "open -e -W";
  }

  for (const candidate of ["nano", "vi"]) {
    const which = spawnSync("which", [candidate], { encoding: "utf-8" });
    if (which.status === 0) return candidate;
  }
  return "vi";
}

/**
 * External $EDITOR fallback (kept for non-TTY / opt-in use).
 */
export async function editMessageInEditor(
  message: string,
): Promise<string | null> {
  const editor = resolveEditor();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "gcmg-"));
  const tmpFile = path.join(tmpDir, "COMMIT_EDITMSG");
  await fs.writeFile(tmpFile, message, "utf-8");

  const isVimFamily =
    /\b(n?vim|vi)\b/i.test(editor) && !/\bopen\b/i.test(editor);
  const isMacOpen = process.platform === "darwin" && editor.startsWith("open ");

  console.log(chalk.dim(`\nOpening ${editor}...`));
  if (isVimFamily) {
    console.log(chalk.dim("  :wq / ZZ  → save and return"));
    console.log(chalk.dim("  :q!       → discard changes\n"));
  } else {
    console.log(
      chalk.dim("  Save the file and close the editor to continue.\n"),
    );
  }

  const quotedFile =
    process.platform === "win32" ? `"${tmpFile}"` : JSON.stringify(tmpFile);

  const command = `${editor} ${quotedFile}`;

  const result = spawnSync(command, {
    stdio: "inherit",
    shell: true,
    windowsHide: false,
  });

  if (result.error) {
    console.log(chalk.red(`Failed to open editor: ${result.error.message}`));
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }

  if (isVimFamily && result.status !== 0 && result.status !== null) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    return null;
  }

  const edited = await fs.readFile(tmpFile, "utf-8");
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  return edited.trim();
}
