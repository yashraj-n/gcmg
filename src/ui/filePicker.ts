/**
 * src/ui/filePicker.ts
 *
 * Lightweight raw-mode checkbox file picker for the CLI key-bar mode.
 * Shows all changed files with their stage status.  Arrow keys move the
 * cursor, Space toggles staged/unstaged, Enter applies and exits, Esc/q
 * cancels (no changes applied).
 */
import readline from "readline";
import chalk from "chalk";
import { getChangedFiles, stageFiles, unstageFiles, type ChangedFile } from "@/git/stage";
import { FILE_PICKER_PAGE_SIZE_CLI as PAGE_SIZE } from "@/misc/constants";

const STATUS_LABEL: Record<string, string> = {
  S: " S ",
  M: " M ",
  D: " D ",
  "?": " ? ",
  R: " R ",
};



function renderPicker(
  files: ChangedFile[],
  cursor: number,
  cols: number,
  scrollOffset: number,
): string {
  const lines: string[] = [];
  const sep = "─".repeat(Math.min(cols - 4, 70));
  lines.push(
    chalk.bold("  File picker  ") +
      chalk.dim("·  ↑↓/jk move  ·  Space toggle  ·  a toggle all  ·  Enter confirm  ·  Esc cancel"),
  );
  lines.push("  " + chalk.dim(sep));
  lines.push(
    "  " +
      chalk.dim("STG".padEnd(5)) +
      chalk.dim("STA".padEnd(5)) +
      chalk.dim("FILE") +
      chalk.dim.italic(`  (showing ${scrollOffset + 1}–${Math.min(files.length, scrollOffset + PAGE_SIZE)} of ${files.length})`),
  );

  if (scrollOffset > 0) {
    lines.push(chalk.dim(`  ▲ ... (${scrollOffset} more file${scrollOffset > 1 ? "s" : ""} above)`));
  }

  const visibleFiles = files.slice(scrollOffset, scrollOffset + PAGE_SIZE);
  for (let idx = 0; idx < visibleFiles.length; idx++) {
    const actualIdx = scrollOffset + idx;
    const f = visibleFiles[idx]!;
    const isCursor = actualIdx === cursor;
    const checkbox = f.staged ? chalk.green.bold("[✓]") : chalk.dim("[ ]");
    const rawStatus = STATUS_LABEL[f.status] ?? ` ${f.status} `;
    const status =
      f.status === "S" || f.status === "R"
        ? chalk.green(rawStatus)
        : f.status === "M"
          ? chalk.yellow(rawStatus)
          : f.status === "D"
            ? chalk.red(rawStatus)
            : f.status === "?"
              ? chalk.cyan(rawStatus)
              : chalk.dim(rawStatus);
    const row = `  ${checkbox}  ${status}  ${f.path}`;
    lines.push(isCursor ? chalk.bgHex("#1e3a5f").white.bold(row.padEnd(cols - 1)) : row);
  }

  const remaining = files.length - (scrollOffset + visibleFiles.length);
  if (remaining > 0) {
    lines.push(chalk.dim(`  ▼ ... (${remaining} more file${remaining > 1 ? "s" : ""} below)`));
  }

  lines.push("  " + chalk.dim(sep));
  const staged = files.filter((f) => f.staged).length;
  lines.push(
    chalk.bold.cyan(`  ${staged} / ${files.length} files selected`) +
      chalk.dim(`  [Cursor on ${cursor + 1}/${files.length}]`),
  );
  return lines.join("\n");
}

export async function runFilePicker(): Promise<{
  applied: boolean;
  stagedCount: number;
  selectedPaths: string[];
}> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { applied: false, stagedCount: 0, selectedPaths: [] };
  }

  let files: ChangedFile[];
  try {
    files = await getChangedFiles();
  } catch {
    return { applied: false, stagedCount: 0, selectedPaths: [] };
  }

  if (files.length === 0) {
    return { applied: false, stagedCount: 0, selectedPaths: [] };
  }

  // Snapshot initial staged status
  const initialStaged = new Map<string, boolean>();
  for (const f of files) {
    initialStaged.set(f.path, f.staged);
  }

  const cols = process.stdout.columns ?? 80;
  let cursor = 0;
  let scrollOffset = 0;
  let resolved = false;

  return new Promise<{
    applied: boolean;
    stagedCount: number;
    selectedPaths: string[];
  }>((resolve) => {
    const teardown = () => {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const finish = (applied: boolean) => {
      if (resolved) return;
      resolved = true;
      teardown();
      console.clear();
      const selected = files.filter((f) => f.staged).map((f) => f.path);
      resolve({ applied, stagedCount: selected.length, selectedPaths: selected });
    };

    const updateScroll = () => {
      if (cursor < scrollOffset) {
        scrollOffset = cursor;
      } else if (cursor >= scrollOffset + PAGE_SIZE) {
        scrollOffset = cursor - PAGE_SIZE + 1;
      }
    };

    const redraw = () => {
      updateScroll();
      console.clear();
      console.log(renderPicker(files, cursor, cols, scrollOffset));
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    async function onKeypress(
      _str: string,
      key: { name?: string; ctrl?: boolean; sequence?: string },
    ) {
      const name = (key?.name ?? "").toLowerCase();
      const seq = key?.sequence ?? "";

      if ((key?.ctrl && name === "c") || name === "escape" || name === "q") {
        finish(false);
        return;
      }

      if (name === "up" || seq === "\u001b[A" || name === "k") {
        cursor = Math.max(0, cursor - 1);
        redraw();
        return;
      }
      if (name === "down" || seq === "\u001b[B" || name === "j") {
        cursor = Math.min(files.length - 1, cursor + 1);
        redraw();
        return;
      }

      if (name === "space" || seq === " ") {
        const f = files[cursor];
        if (f) {
          f.staged = !f.staged;
          redraw();
        }
        return;
      }

      // 'a' toggles all files
      if (name === "a" || seq === "a") {
        const allStaged = files.every((f) => f.staged);
        for (const f of files) {
          f.staged = !allStaged;
        }
        redraw();
        return;
      }

      if (name === "return" || name === "enter" || seq === "\r" || seq === "\n") {
        // Apply changes cleanly to git index: unstage all unchecked, stage all checked
        const toStage = files.filter((f) => f.staged).map((f) => f.path);
        const toUnstage = files.filter((f) => !f.staged).map((f) => f.path);

        try {
          if (toUnstage.length > 0) await unstageFiles(toUnstage);
          if (toStage.length > 0) await stageFiles(toStage);
        } catch {
          // ignore
        }

        finish(true);
        return;
      }
    }

    process.stdin.on("keypress", onKeypress);
    redraw();
  });
}

