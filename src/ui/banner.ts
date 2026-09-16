import chalk from "chalk";

/**
 * Single source of truth for the gcmg wordmark.
 * Both the OpenTUI screen and the CLI key-bar render this same art so the
 * two interaction modes feel like one product instead of two prototypes.
 */
export const GCMG_BANNER = [
  " ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄ ▄▄▄      ▄▄▄  ▄▄▄▄▄▄▄",
  "███▀▀▀▀▀  ███▀▀▀▀▀ ████▄  ▄████ ███▀▀▀▀▀",
  "███       ███      ███▀████▀███ ███",
  "███  ███▀ ███      ███  ▀▀  ███ ███  ███▀",
  "▀██████▀  ▀███████ ███      ███ ▀██████▀",
].join("\n");

/** Minimum width the full ASCII wordmark needs to look right. */
export const BANNER_MIN_COLS = 44;

/**
 * Plain-text fallback for narrow terminals (SSH sessions, split panes,
 * mobile terminals) where the block-art banner would wrap and look broken.
 */
function compactBanner(): string {
  return chalk.bold.cyan("gcmg") + chalk.dim("  ·  Git Commit Message Generator");
}

/**
 * Renders the banner for a given terminal width. Callers should render this
 * once, up top — both the TUI header and the CLI screen use it so switching
 * between `uiMode: tui` and `uiMode: cli` doesn't feel like two different
 * tools.
 */
export function renderBannerArt(cols = process.stdout.columns ?? 80): string {
  if (cols < BANNER_MIN_COLS) return compactBanner();
  return chalk.cyan(GCMG_BANNER);
}

let shownThisProcess = false;

/**
 * Prints the banner immediately, once per process, the moment `gcmg` is
 * invoked — before any diff collection, config loading, or network calls.
 * Silently a no-op when stdout isn't a TTY (piped/CI/--print) so scripted
 * consumers never get decorative bytes mixed into their output.
 */
export function showStartupBanner(): void {
  if (shownThisProcess) return;
  if (!process.stdout.isTTY) return;
  shownThisProcess = true;
  console.log(renderBannerArt());
  console.log();
}
