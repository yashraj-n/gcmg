import chalk from "chalk";

export interface KeybarState {
  provider: string;
  model: string;
  variantIndex: number;
  variantCount: number;
  stagedOnly: boolean;
  hasStagedChanges: boolean;
  lastAction?: string;
}

const WIDTH = 78;
/** Fixed column width so every row lines up vertically */
const COL = 26;

function sep(char = "─"): string {
  return chalk.dim(char.repeat(WIDTH));
}

/** One key cell padded to COL so columns align across rows */
function cell(key: string, label: string, width = COL): string {
  const content = `[${chalk.bold(key)}] ${label}`;
  const visible = `[${key}] ${label}`.length;
  return content + " ".repeat(Math.max(0, width - visible));
}

export function renderStatusLine(state: KeybarState): string {
  const left = [
    chalk.dim("Provider:") + " " + chalk.cyan(state.provider),
    chalk.dim("Model:") + " " + chalk.cyan(state.model),
    chalk.dim("Variant:") + " " + chalk.cyan(`${state.variantIndex + 1}/${state.variantCount}`),
  ].join(chalk.dim("  ·  "));

  const lines = [" " + left];

  if (!state.stagedOnly) {
    lines.push(" " + chalk.yellow("⚠  unstaged preview — press [a] to stage & commit"));
  }

  if (state.lastAction) {
    lines.push(" " + chalk.green("✓  " + state.lastAction));
  }

  return lines.join("\n");
}

/**
 * Clean table-like bottom key bar with consistent 3-column alignment.
 */
export function renderKeyBar(state: KeybarState): string {
  // Row 1 – message actions
  const row1 = [
    cell("c", "Copy"),
    cell("e", "Edit"),
    cell("r", "Regenerate"),
  ].join("");

  // Row 2 – navigation (pad third cell so columns stay aligned)
  const row2 = [
    cell("n", "Next variant"),
    cell("p", "Prev variant"),
    cell(" ", ""),
  ].join("");

  // Row 3 – commit actions
  let row3: string;
  if (state.stagedOnly) {
    row3 = [
      cell("s", "Commit staged"),
      cell("a", "Stage all + Commit"),
      cell("u", "Commit + Push"),
    ].join("");
  } else {
    // Keep same 3-column grid; shorten label so it fits COL
    row3 = [
      cell("a", "Stage all + Commit"),
      cell("u", "Stage+Commit+Push"),
      cell(" ", ""),
    ].join("");
  }

  // Row 4 – utility
  const row4 = [
    cell("d", "Dry-run"),
    cell("?", "Help"),
    cell("q", "Quit"),
  ].join("");

  return [
    "",
    sep(),
    renderStatusLine(state),
    sep(),
    " " + row1,
    " " + row2,
    " " + row3,
    " " + row4,
    sep(),
  ].join("\n");
}
