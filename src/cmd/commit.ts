import readline from "readline";
import chalk from "chalk";
import ora from "ora";

import { generateCommitMessageFromDiff } from "@/llm";
import { getConfig } from "@/misc/config";
import { getModelDiffLimit, notifyModelStatus } from "@/misc/model-status";
import { extractMessageContent, getRandomJoke } from "@/misc/utils";
import { filterNoiseFromDiff } from "@/misc/ignore";
import { scanForSecrets } from "@/misc/secrets";
import { collectDiff, isGitRepo } from "@/git/diff";
import { stageAll } from "@/git/stage";
import { commitStaged } from "@/git/commit";
import { pushCurrentBranch } from "@/git/push";
import { renderMessage, renderWarnings } from "@/ui/messageView";
import { renderKeyBar } from "@/ui/keybar";
import { renderHelpOverlay } from "@/ui/help";
import { editMessageInEditor } from "@/ui/editor";
import { copyToClipboard } from "@/ui/clipboard";
import type { Config } from "@/misc/config";

export interface GenerateCommitMessageOptions {
  /** `-m` / `--context`: free-text hint about the change. */
  hint?: string;
  /** `--all`: diff/stage everything instead of staged-only. */
  all?: boolean;
  /** `--print` / `--dry-run`: print the message and exit, no prompts. */
  print?: boolean;
}

const MAX_VARIANTS = 3;

export async function generateCommitMessage(options: GenerateCommitMessageOptions = {}) {
  if (!(await isGitRepo())) {
    console.log(chalk.red(chalk.bold("Not a git repository (or git is unavailable).")));
    return;
  }

  const { diff: rawDiff, stagedOnly } = await collectDiff({ all: options.all });
  if (!rawDiff || rawDiff.trim().length === 0) {
    console.log(chalk.red(chalk.bold("No changes to commit")));
    return;
  }

  const { diff: filteredDiff, filteredFiles } = await filterNoiseFromDiff(rawDiff);
  const workingDiff = filteredDiff.trim().length > 0 ? filteredDiff : rawDiff;

  const secretWarnings = scanForSecrets(workingDiff);

  const config = await getConfig();
  if (!config?.apiKey || !config?.model || !config?.provider) {
    console.log(chalk.red(chalk.bold("Invalid or missing configuration. Run: gcmg config")));
    return;
  }

  const { maxDiffChars, contextTokens, isCustomOverride } = await getModelDiffLimit(config);

  let diff = workingDiff;
  const originalLength = diff.length;
  if (diff.length > maxDiffChars) {
    const reason = isCustomOverride
      ? "(via GCMG_MAX_DIFF_CHARS)"
      : `(~${contextTokens.toLocaleString()} token context limit for ${config.model})`;
    console.log(
      chalk.yellow(
        `Diff is large (${originalLength.toLocaleString()} chars). Truncating to ${maxDiffChars.toLocaleString()} chars ${reason}.`,
      ),
    );
    diff = diff.slice(0, maxDiffChars) + "\n\n… [diff truncated]";
  }

  console.log(chalk.dim(`Analyzing ${diff.length.toLocaleString()} characters of diff`));
  console.log(chalk.dim(`Provider: ${config.provider} · Model: ${config.model}`));
  if (config.provider === "Custom OpenAI Based Provider") {
    console.log(chalk.dim(`Base URL: ${config.extra?.baseUrl ?? "(none)"}`));
  }
  if (filteredFiles.length > 0) {
    console.log(
      chalk.dim(`Filtered ${filteredFiles.length} noisy file(s) from the diff: ${filteredFiles.join(", ")}`),
    );
  }

  await notifyModelStatus(config);

  const spinner = ora(getRandomJoke()).start();
  let firstMessage: string;
  try {
    const result = await generateCommitMessageFromDiff(config, diff, { hint: options.hint });
    firstMessage = extractMessageContent(result?.content).trim();
  } catch (error) {
    spinner.fail();
    console.log(chalk.red(chalk.bold("Error generating commit message:"), error));
    return;
  }

  if (!firstMessage) {
    spinner.fail("Model returned an empty commit message");
    return;
  }
  spinner.succeed();

  const warningLines = buildWarningLines(secretWarnings);

  const isInteractive = Boolean(process.stdin.isTTY) && Boolean(process.stdout.isTTY) && !options.print;

  if (!isInteractive) {
    console.log(renderWarnings(warningLines));
    console.log(renderMessage(firstMessage));
    return;
  }

  await runInteractiveLoop({
    variants: [firstMessage],
    index: 0,
    diff,
    config,
    stagedOnly,
    warningLines,
    hint: options.hint,
  });
}

function buildWarningLines(secretWarnings: { file: string; reason: string }[]): string[] {
  if (secretWarnings.length === 0) return [];
  return [
    "Possible secrets detected — double-check before committing:",
    ...secretWarnings.map((w) => `  ${w.file} — ${w.reason}`),
  ];
}

interface LoopState {
  variants: string[];
  index: number;
  diff: string;
  config: Config;
  stagedOnly: boolean;
  warningLines: string[];
  hint?: string;
  busy?: boolean;
  lastAction?: string;
  showHelp?: boolean;
}

async function runInteractiveLoop(state: LoopState): Promise<void> {
  render(state);

  return new Promise<void>((resolve) => {
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      teardown();
      resolve();
    };

    const teardown = () => {
      process.stdin.removeListener("keypress", onKeypress);
      if (process.stdin.isTTY) process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    const resumeInput = () => {
      readline.emitKeypressEvents(process.stdin);
      if (process.stdin.isTTY) process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on("keypress", onKeypress);
    };

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.resume();

    async function onKeypress(
      str: string,
      key: { name?: string; ctrl?: boolean; meta?: boolean; shift?: boolean },
    ) {
      if (state.busy) return;

      // Normalize key: prefer printable str, fall back to key.name (Windows-safe)
      const k = (str && str.length === 1 ? str : key?.name ?? "").toLowerCase();

      if ((key?.ctrl && key.name === "c") || k === "escape" || key?.name === "escape") {
        console.log(chalk.red("\nExiting..."));
        finish();
        return;
      }

      if (state.showHelp) {
        state.showHelp = false;
        render(state);
        return;
      }

      switch (k) {
        case "q":
          console.log(chalk.dim("\nExiting without committing."));
          finish();
          return;
        case "?":
        case "h": // allow h as help alias
          state.showHelp = true;
          console.clear();
          console.log(renderHelpOverlay());
          return;
        case "c": {
          state.lastAction = "Copying…";
          render(state);
          const ok = await copyToClipboard(state.variants[state.index] ?? "");
          state.lastAction = ok
            ? "Copied to clipboard."
            : "Could not access clipboard (try selecting & copying manually).";
          render(state);
          return;
        }
        case "e": {
          state.busy = true;
          teardown();
          try {
            const edited = await editMessageInEditor(state.variants[state.index] ?? "");
            if (edited !== null && edited.length > 0) {
              state.variants[state.index] = edited;
              state.lastAction = "Message updated.";
            } else {
              state.lastAction = "Edit discarded.";
            }
          } catch (err) {
            state.lastAction = `Editor failed: ${err instanceof Error ? err.message : err}`;
          }
          state.busy = false;
          resumeInput();
          render(state);
          return;
        }
        case "r": {
          // Prefer adding a new variant so the counter goes up (1/1 → 2/2).
          // Only replace in-place when already at MAX_VARIANTS.
          const atMax = state.variants.length >= MAX_VARIANTS;
          await regenerate(state, { replaceCurrent: atMax });
          render(state);
          return;
        }
        case "n": {
          if (state.index < state.variants.length - 1) {
            state.index++;
            state.lastAction = `Variant ${state.index + 1}/${state.variants.length}`;
            render(state);
          } else if (state.variants.length < MAX_VARIANTS) {
            await regenerate(state, { replaceCurrent: false });
            render(state);
          } else {
            state.index = 0;
            state.lastAction = `Variant 1/${state.variants.length} (wrapped)`;
            render(state);
          }
          return;
        }
        case "p": {
          state.index = state.index > 0 ? state.index - 1 : state.variants.length - 1;
          state.lastAction = `Variant ${state.index + 1}/${state.variants.length}`;
          render(state);
          return;
        }
        case "s": {
          if (!state.stagedOnly) {
            state.lastAction = "Nothing staged — press [a] to stage all first.";
            render(state);
            return;
          }
          await doCommit(state, { push: false });
          finish();
          return;
        }
        case "a": {
          await doStageAllAndCommit(state, { push: false });
          finish();
          return;
        }
        case "u": {
          if (state.stagedOnly) {
            await doCommit(state, { push: true });
          } else {
            await doStageAllAndCommit(state, { push: true });
          }
          finish();
          return;
        }
        case "d": {
          // Dry-run: print message clearly, then exit
          console.clear();
          console.log(renderWarnings(state.warningLines));
          console.log(renderMessage(state.variants[state.index] ?? ""));
          console.log(chalk.yellow("\n── Dry-run ──"));
          console.log(chalk.dim("Message printed above. No commit was made."));
          finish();
          return;
        }
        default:
          return;
      }
    }

    process.stdin.on("keypress", onKeypress);
  });
}

async function regenerate(state: LoopState, opts: { replaceCurrent: boolean }) {
  state.busy = true;
  state.lastAction = "Regenerating…";
  render(state);
  try {
    const avoid = state.variants.filter((_, i) => (opts.replaceCurrent ? i !== state.index : true));
    const result = await generateCommitMessageFromDiff(state.config, state.diff, {
      hint: state.hint,
      avoid,
    });
    const message = extractMessageContent(result?.content).trim();
    if (message) {
      if (opts.replaceCurrent) {
        state.variants[state.index] = message;
      } else {
        state.variants.push(message);
        state.index = state.variants.length - 1;
      }
      state.lastAction = opts.replaceCurrent ? "Regenerated current variant." : "Generated new variant.";
    } else {
      state.lastAction = "Model returned an empty message — kept the previous one.";
    }
  } catch (error) {
    state.lastAction = `Regenerate failed: ${error instanceof Error ? error.message : error}`;
  }
  state.busy = false;
}

async function doCommit(state: LoopState, opts: { push: boolean }) {
  console.clear();
  const message = state.variants[state.index] ?? "";
  try {
    await commitStaged(message);
    console.log(chalk.green("Committed changes successfully."));
  } catch (error) {
    console.log(chalk.red(chalk.bold("Error committing changes:"), error));
    return;
  }
  if (opts.push) {
    await doPush();
  }
}

async function doStageAllAndCommit(state: LoopState, opts: { push: boolean }) {
  console.clear();
  const message = state.variants[state.index] ?? "";
  try {
    await stageAll();
    await commitStaged(message);
    console.log(chalk.green("Staged and committed changes successfully."));
  } catch (error) {
    console.log(chalk.red(chalk.bold("Error committing changes:"), error));
    return;
  }
  if (opts.push) {
    await doPush();
  }
}

async function doPush() {
  try {
    const result = await pushCurrentBranch();
    if (result.setUpstream) {
      console.log(chalk.green(`Pushed and set upstream for '${result.branch}'.`));
    } else {
      console.log(chalk.green("Pushed changes successfully."));
    }
  } catch (error) {
    console.log(chalk.red(chalk.bold("Error pushing changes:"), error));
  }
}

function render(state: LoopState) {
  console.clear();

  const warnings = renderWarnings(state.warningLines);
  const message = renderMessage(state.variants[state.index] ?? "");
  const keybar = renderKeyBar({
    provider: state.config.provider,
    model: state.config.model,
    variantIndex: state.index,
    variantCount: state.variants.length,
    stagedOnly: state.stagedOnly,
    hasStagedChanges: state.stagedOnly,
    lastAction: state.lastAction,
  });

  // Push the key bar toward the bottom of the terminal (vim-style).
  const termRows = process.stdout.rows ?? 24;
  const contentLines = (warnings + message).split("\n").length;
  const keybarLines = keybar.split("\n").length;
  const pad = Math.max(0, termRows - contentLines - keybarLines - 1);

  if (warnings) console.log(warnings);
  console.log(message);
  if (pad > 0) console.log("\n".repeat(pad - 1));
  console.log(keybar);
}
