import chalk from "chalk";

import { renderBannerArt } from "@/ui/banner";
import { getKeyActions } from "@/ui/keymap";
import { packChips } from "@/ui/buttons";

export interface KeybarState {
  provider: string;
  model: string;
  variantIndex: number;
  variantCount: number;
  stagedOnly: boolean;
  lastAction?: string;
  /** When true the [y] chip shows "Yolo ON" in green; off shows dim "Yolo OFF". */
  yoloEnabled?: boolean;
}

function sep(width = 78, char = "─"): string {
  return chalk.dim(char.repeat(Math.max(20, width)));
}

const BUTTON_COLOR = chalk
  .bgRgb(48, 52, 58)
  .white
  .bold;

function chip(key: string, label: string, highlight?: boolean): string {
  const bg = highlight
    ? chalk.bgRgb(30, 100, 40).white.bold
    : BUTTON_COLOR;
  return `${bg(` ${key} `)} ${highlight ? chalk.greenBright(label) : chalk.white(label)}`;
}

export function renderBanner(width = 78): string {
  return renderBannerArt(width) + "\n" + sep(width);
}

export function renderStatusLine(state: KeybarState): string {
  const yoloBadge = state.yoloEnabled
    ? "  " + chalk.bgRgb(30, 100, 40).white.bold(" YOLO ") + chalk.greenBright(" ON")
    : "";

  const left = [
    chalk.dim("Provider:") +
      " " +
      chalk.cyan(state.provider),

    chalk.dim("Model:") +
      " " +
      chalk.cyan(state.model),

    chalk.dim("Variant:") +
      " " +
      chalk.cyan(
        `${state.variantIndex + 1}/${state.variantCount}`,
      ),
  ].join(chalk.dim("  ·  "));

  const lines = [" " + left + yoloBadge];

  if (!state.stagedOnly) {
    lines.push(
      " " +
        chalk.yellow(
          "Unstaged preview — press [a] to stage & commit",
        ),
    );
  }

  if (state.lastAction) {
    const isError = /fail|error|cancel|discard|unselected|empty/i.test(state.lastAction);
    const badge = isError
      ? chalk.bgRed.white.bold("  ✗ ACTION  ")
      : chalk.bgCyan.black.bold("  ▶ KEY ACTION  ");
    const msg = isError
      ? chalk.red.bold(`  ${state.lastAction}`)
      : chalk.bold.whiteBright(`  ${state.lastAction}`);
    lines.push("");
    lines.push(`  ${badge}${msg}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function renderKeyBar(
  state: KeybarState,
  width = 78,
): string {
  const actions = getKeyActions({
    stagedOnly: state.stagedOnly,
    yoloEnabled: state.yoloEnabled,
  });

  const chips = actions.map((a) =>
    chip(a.key, a.label, a.key === "y" && state.yoloEnabled),
  );
  const body = packChips(chips, width, { indent: 1, gap: 2 });

  return [
    "",
    sep(width),
    renderStatusLine(state),
    sep(width),
    ...body,
    sep(width),
  ].join("\n");
}