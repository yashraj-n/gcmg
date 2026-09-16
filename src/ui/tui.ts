import { generateCommitMessageFromDiff } from "@/llm";
import { extractMessageContent } from "@/misc/utils";
import { commitStaged } from "@/git/commit";
import { stageAll, getChangedFiles, stageFiles, unstageFiles } from "@/git/stage";
import { collectDiff } from "@/git/diff";
import { pushCurrentBranch } from "@/git/push";
import { filterNoiseFromDiff } from "@/misc/ignore";
import { copyToClipboard } from "@/ui/clipboard";
import { GCMG_BANNER, BANNER_MIN_COLS } from "@/ui/banner";
import { getKeyActions, type KeyGroup } from "@/ui/keymap";
import { saveConfig } from "@/misc/config";
import type { Config } from "@/misc/config";
import { MAX_VARIANTS, FILE_PICKER_PAGE_SIZE_TUI } from "@/misc/constants";
import chalk from "chalk";

type OTChunk = import("@opentui/core").TextChunk;

/** Theme-aware colour palette. Adapts button / text colours so they stay
 *  readable on both dark and light terminal backgrounds. OpenTUI exposes
 *  `renderer.themeMode` ("dark" | "light" | null); we fall back to dark. */
function buildPalette(mode: "dark" | "light" | null) {
  const isLight = mode === "light";
  return {
    // Accent for banner + message group keys
    accent: isLight ? "#0891B2" : "#22D3EE", // darker cyan on light bg
    // Commit / success
    success: isLight ? "#059669" : "#34D399",
    // Meta / de-emphasised
    muted: isLight ? "#64748B" : "#94A3B8",
    // Key-chip background (grey) + text (white) — same on both themes so the
    // "button" always has high contrast against the terminal background.
    chipBg: "#2B2F33",
    chipFg: "#FFFFFF",
    // Body text
    text: isLight ? "#0F172A" : "#F8FAFC",
    textMuted: isLight ? "#475569" : "#CBD5E1",
    textDim: isLight ? "#64748B" : "#64748B",
    // Borders / separators
    border: isLight ? "#94A3B8" : "#475569",
    sep: isLight ? "#CBD5E1" : "#334155",
    // Status / warning
    warning: isLight ? "#D97706" : "#FBBF24",
    error: isLight ? "#DC2626" : "#F87171",
  };
}

type Palette = ReturnType<typeof buildPalette>;

/** Group → accent colour for the key chip (message/commit/meta). */
function groupColor(group: KeyGroup, p: Palette): string {
  if (group === "message") return p.accent;
  if (group === "commit") return p.success;
  return p.muted;
}

export interface TuiState {
  variants: string[];
  index: number;
  diff: string;
  config: Config;
  stagedOnly: boolean;
  warningLines: string[];
  hint?: string;
  lastAction?: string;
  /** success | error — controls colour of banner feedback */
  lastActionKind?: "ok" | "err" | "info";
  busy?: boolean;
  showHelp?: boolean;
  statusNote?: string;
  /** Inline edit mode (stays inside TUI) */
  editing?: boolean;
  editBuffer?: string;
  /** Interactive hint input before regeneration */
  askingHint?: boolean;
  hintBuffer?: string;
  /** Yolo mode: when true [y] executes stage-all + commit + push immediately */
  yoloEnabled?: boolean;
  /** File picker overlay active */
  showFilePicker?: boolean;
  /** File picker list (loaded on open) */
  filePickerFiles?: Array<{ path: string; status: string; staged: boolean }>;
  /** Cursor position inside the file picker */
  filePickerCursor?: number;
  /** Scroll offset for file picker viewport */
  filePickerScrollOffset?: number;
}

export type TuiAction =
  | "quit"
  | "commit-staged"
  | "stage-all-commit"
  | "commit-push"
  | "dry-run"
  | "yolo";

export interface RunTuiOptions {
  /** Generate the first message inside the TUI (show loading UI first). */
  generateFirst?: boolean;
}

type OpenTuiModule = typeof import("@opentui/core");

async function loadOpenTui(): Promise<OpenTuiModule> {
  try {
    return await import("@opentui/core");
  } catch (err) {
    throw new Error(
      [
        "Failed to load OpenTUI (@opentui/core).",
        "Install:  bun add @opentui/core",
        "Requires Bun 1.3+ or Node >= 26.4 with --experimental-ffi.",
        String(err instanceof Error ? err.message : err),
      ].join("\n"),
    );
  }
}

function normalizeKey(key: {
  name?: string;
  ctrl?: boolean;
  sequence?: string;
  raw?: string;
}): string {
  if (key.ctrl && (key.name === "c" || key.name === "C")) return "__ctrl_c__";
  if (key.name === "escape" || key.sequence === "\x1b") return "escape";

  const seq = key.sequence ?? key.raw ?? "";
  if (seq.length === 1) {
    const ch = seq.toLowerCase();
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) return ch;
  }

  const name = (key.name ?? "").toLowerCase();
  if (name.length === 1) return name;
  return name || seq.toLowerCase();
}


export async function runTui(
  state: TuiState,
  options: RunTuiOptions = {},
): Promise<{ action: TuiAction | null; state: TuiState }> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return { action: "dry-run", state };
  }

  const ot = await loadOpenTui();
  const { createCliRenderer, BoxRenderable, TextRenderable, StyledText, fg, bg, bold } = ot;

  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    screenMode: "alternate-screen",
  });

  // Detect terminal theme once (OpenTUI queries OSC 10/11). Falls back to
  // dark so colours stay readable on the majority of developer terminals.
  let palette = buildPalette(
    (renderer as { themeMode?: "dark" | "light" | null }).themeMode ?? "dark",
  );

  // Re-build palette if the terminal theme flips while we're running.
  try {
    (renderer as { on?: (ev: string, cb: (m: "dark" | "light" | null) => void) => void }).on?.(
      "theme_mode",
      (mode) => {
        palette = buildPalette(mode);
        redraw();
      },
    );
  } catch {
    /* OpenTUI theme event not available on this version — ignore */
  }

  const s: TuiState = {
    ...state,
    variants: [...state.variants],
    busy: options.generateFirst || state.variants.length === 0,
    statusNote: options.generateFirst
      ? "Generating commit message..."
      : state.statusNote,
  };

  /**
   * Renders ungrouped key actions into a single clean line (wrapping gracefully
   * if the terminal width is narrow).
   */
  function buildFooterChunks(cols: number): OTChunk[] {
    const actions = getKeyActions({ stagedOnly: s.stagedOnly, yoloEnabled: s.yoloEnabled });
    const maxW = Math.max(20, cols - 4);
    const out: OTChunk[] = [];
    let line: OTChunk[] = [];
    let lineWidth = 0;

    const flush = () => {
      if (out.length > 0) out.push(fg(palette.text)("\n"));
      out.push(...line);
      line = [];
      lineWidth = 0;
    };

    for (const a of actions) {
      // Highlight [y] chip when yolo is enabled
      const isYoloOn = a.key === "y" && s.yoloEnabled;
      const chipColor = isYoloOn ? palette.success : groupColor(a.group, palette);
      const keyChunk = bg(palette.chipBg)(fg(isYoloOn ? palette.success : palette.chipFg)(bold(` ${a.key} `)));
      const labelChunk = fg(chipColor)(` ${a.label}`);
      const c = { chunks: [keyChunk, labelChunk], width: 3 + 1 + a.label.length };

      const gap = line.length ? 2 : 0;
      if (line.length && lineWidth + gap + c.width > maxW) {
        flush();
      }
      if (line.length) {
        line.push(fg(palette.sep)("  "));
        lineWidth += 2;
      }
      line.push(...c.chunks);
      lineWidth += c.width;
    }
    if (line.length) flush();
    return out;
  }

  const root = new BoxRenderable(renderer, {
    id: "root",
    width: "100%",
    height: "100%",
    flexDirection: "column",
    padding: 1,
    gap: 0,
  });

  const termCols = () => process.stdout.columns ?? 80;
  // Header: logo left · config right. On narrow terminals we switch to
  // a compact one-line banner (below BANNER_MIN_COLS columns) so the ASCII
  // art never overlaps the meta panel.
  const headerRow = new BoxRenderable(renderer, {
    id: "header-row",
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 2,
  });
  const bannerArt = new TextRenderable(renderer, {
    id: "banner-art",
    content: GCMG_BANNER,
    fg: palette.accent,
  });
  const metaBox = new BoxRenderable(renderer, {
    id: "meta-box",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
    paddingRight: 1,
  });
  const metaProvider = new TextRenderable(renderer, {
    id: "meta-provider",
    content: "",
    fg: palette.accent,
  });
  const metaModel = new TextRenderable(renderer, {
    id: "meta-model",
    content: "",
    fg: palette.muted,
  });
  const metaUi = new TextRenderable(renderer, {
    id: "meta-ui",
    content: "",
    fg: palette.textDim,
  });
  const metaScope = new TextRenderable(renderer, {
    id: "meta-scope",
    content: "",
    fg: palette.warning,
  });
  metaBox.add(metaProvider);
  metaBox.add(metaModel);
  metaBox.add(metaUi);
  metaBox.add(metaScope);
  headerRow.add(bannerArt);
  headerRow.add(metaBox);

  const bannerSep = new TextRenderable(renderer, {
    id: "banner-sep",
    content: "  " + "─".repeat(Math.min(72, termCols() - 4)),
    fg: palette.sep,
  });

  const warningsText = new TextRenderable(renderer, {
    id: "warnings",
    content: "",
    fg: palette.warning,
  });

  const messageTitle = new TextRenderable(renderer, {
    id: "msg-title",
    content: "",
    fg: palette.textMuted,
  });
  const messageBody = new TextRenderable(renderer, {
    id: "msg-body",
    content: "",
    fg: palette.text,
  });
  const messagePanel = new BoxRenderable(renderer, {
    id: "msg-panel",
    flexDirection: "column",
    border: true,
    borderColor: palette.border,
    padding: 1,
    flexGrow: 1,
    marginTop: 1,
    gap: 1,
  });
  messagePanel.add(messageTitle);
  messagePanel.add(messageBody);

  const statusText = new TextRenderable(renderer, {
    id: "status",
    content: "",
    fg: palette.muted,
  });

  const footerSep = new TextRenderable(renderer, {
    id: "footer-sep",
    content: "  " + "─".repeat(Math.min(56, termCols() - 4)),
    fg: palette.sep,
  });
  const footerKeys = new TextRenderable(renderer, {
    id: "footer-keys",
    content: "",
    fg: palette.text,
  });

  root.add(headerRow);
  root.add(bannerSep);
  root.add(warningsText);
  root.add(messagePanel);
  root.add(statusText);
  root.add(footerSep);
  root.add(footerKeys);
  renderer.root.add(root);

  function redraw() {
    const cols = termCols();

    // Adaptive banner: full ASCII art only when there's room for both the
    // wordmark *and* the meta panel; otherwise a compact one-liner so the
    // right-hand config never overlaps the logo.
    if (cols < BANNER_MIN_COLS) {
      bannerArt.content = "gcmg  ·  Git Commit Message Generator";
      // Hide the multi-line meta when space is tight — put essentials into the
      // single-line banner instead of colliding.
      metaProvider.content = "";
      metaModel.content = "";
      metaUi.content = "";
      metaScope.content = s.stagedOnly ? "staged" : "unstaged";
      metaScope.fg = s.stagedOnly ? palette.success : palette.warning;
    } else {
      bannerArt.content = GCMG_BANNER;
      metaProvider.content = s.config.provider;
      metaModel.content = s.config.model;
      metaUi.content = `UI  ${(s.config.uiMode ?? "tui")}`.toUpperCase();
      metaScope.content = s.stagedOnly ? "scope  staged" : "scope  unstaged";
      metaScope.fg = s.stagedOnly ? palette.success : palette.warning;
    }
    bannerArt.fg = palette.accent;
    metaProvider.fg = palette.accent;
    metaModel.fg = palette.muted;
    metaUi.fg = palette.textDim;

    if (s.warningLines.length > 0) {
      warningsText.content =
        "\n" +
        s.warningLines
          .slice(0, 3)
          .map((l) => `  !  ${l}`)
          .join("\n");
      warningsText.fg = palette.warning;
    } else {
      warningsText.content = "";
    }

    // Feedback line sits prominently at the TOP of the message panel
    let feedback = "";
    if (s.lastAction) {
      const kind =
        s.lastActionKind ??
        (/fail|error|401|402|403|auth|✗|unselected|empty/i.test(s.lastAction) ? "err" : "ok");
      const icon = kind === "ok" ? "✓" : kind === "err" ? "✗" : "▶";
      feedback = `  [ KEY ACTION ] ${icon} ${s.lastAction.toUpperCase()}\n`;
      messageTitle.fg = kind === "ok" ? palette.success : kind === "err" ? palette.error : palette.accent;
    } else {
      messageTitle.fg = palette.textMuted;
    }

    messageBody.fg = palette.text;
    messagePanel.borderColor = palette.border;

    if (s.showHelp) {
      messageTitle.content = "  Keys — press any key to close";
      messageTitle.fg = palette.warning;
      const actions = getKeyActions({ stagedOnly: s.stagedOnly, yoloEnabled: s.yoloEnabled });
      const helpLines: string[] = [""];
      for (const action of actions) {
        helpLines.push(`  [${action.key}]  ${action.label.padEnd(18)} ${action.description}`);
      }
      messageBody.content = helpLines.join("\n");
    } else if (s.showFilePicker) {
      // ── File picker overlay with scrolling viewport ─────────────────────
      messageTitle.content = "  File picker  ·  ↑↓/jk move  ·  Space toggle  ·  a toggle all  ·  Enter confirm  ·  Esc cancel";
      messageTitle.fg = palette.accent;
      const files = s.filePickerFiles ?? [];
      const cur = s.filePickerCursor ?? 0;
      const TUI_PAGE_SIZE = FILE_PICKER_PAGE_SIZE_TUI;
      let scrollOffset = s.filePickerScrollOffset ?? 0;
      if (cur < scrollOffset) {
        scrollOffset = cur;
      } else if (cur >= scrollOffset + TUI_PAGE_SIZE) {
        scrollOffset = cur - TUI_PAGE_SIZE + 1;
      }
      s.filePickerScrollOffset = scrollOffset;

      if (files.length === 0) {
        messageBody.content = "\n  No changed files found.\n";
      } else {
        const rows: string[] = [
          "\n  " +
            ["STG", "STA", "FILE"].map((h) => h.padEnd(5)).join("  ") +
            `   (showing ${scrollOffset + 1}–${Math.min(files.length, scrollOffset + TUI_PAGE_SIZE)} of ${files.length})`,
        ];
        if (scrollOffset > 0) {
          rows.push(`  ▲ ... (${scrollOffset} more file${scrollOffset > 1 ? "s" : ""} above)`);
        }
        const visibleSlice = files.slice(scrollOffset, scrollOffset + TUI_PAGE_SIZE);
        for (let idx = 0; idx < visibleSlice.length; idx++) {
          const actualIdx = scrollOffset + idx;
          const f = visibleSlice[idx]!;
          const cb = f.staged ? "[✓]" : "[ ]";
          const row = `  ${cb.padEnd(4)} ${f.status.padEnd(4)}  ${f.path}`;
          rows.push(actualIdx === cur ? `▶ ${row}` : `  ${row}`);
        }
        const remaining = files.length - (scrollOffset + visibleSlice.length);
        if (remaining > 0) {
          rows.push(`  ▼ ... (${remaining} more file${remaining > 1 ? "s" : ""} below)`);
        }
        const stagedCount = files.filter((f) => f.staged).length;
        rows.push(`\n  ${stagedCount} / ${files.length} files selected   [File ${cur + 1} of ${files.length}]`);
        messageBody.content = rows.join("\n");
      }
    } else if (s.askingHint) {
      messageTitle.content =
        feedback + "  Regenerate with Hint (optional)  ·  Enter confirm  ·  Esc as-is";
      messageTitle.fg = palette.accent;
      const body = s.hintBuffer ?? "";
      messageBody.content =
        "\n  Enter a hint to guide generation (or press Enter/Esc to regenerate on its own):\n\n" +
        "  > " +
        body +
        "█\n";
    } else if (s.editing) {
      // Single save binding: Ctrl+S only (reliable across Win / macOS / Linux)
      messageTitle.content =
        feedback + "  Editing  ·  Ctrl+S save  ·  Esc cancel";
      messageTitle.fg = palette.warning;
      const body = s.editBuffer ?? "";
      messageBody.content = "\n  " + body.replace(/\n/g, "\n  ") + "█";
    } else if (s.busy && s.variants.length === 0) {
      messageTitle.content = feedback + "  Generating...";
      messageBody.content =
        "\n  Please wait while the model writes your commit message.\n";
    } else {
      messageTitle.content =
        feedback +
        `  Commit message  ·  variant ${s.index + 1}/${Math.max(1, s.variants.length)}` +
        (s.busy ? "  ·  working..." : "");
      const body = s.variants[s.index] ?? "(empty)";
      messageBody.content = "\n  " + body.replace(/\n/g, "\n  ");
    }

    const yoloBadge = s.yoloEnabled ? "  [YOLO ON]" : "";
    const scope = s.stagedOnly
      ? `  Ready to commit staged changes${yoloBadge}`
      : `  Unstaged preview — press [a] to stage & commit${yoloBadge}`;
    const note = s.statusNote ? `   ${s.statusNote}` : "";
    const actionLine = s.lastAction
      ? `  ▶ KEY ACTION: ${s.lastAction.toUpperCase()} ◀\n`
      : "";
    statusText.content = `\n${actionLine}${scope}${note}`;
    statusText.fg = s.lastAction ? palette.accent : s.stagedOnly ? palette.success : palette.warning;

    bannerSep.content = "  " + "─".repeat(Math.min(56, cols - 4));
    bannerSep.fg = palette.sep;
    footerSep.content = "  " + "─".repeat(Math.min(56, cols - 4));
    footerSep.fg = palette.sep;

    if (s.showHelp) {
      footerKeys.content = "  Press any key to close";
    } else if (s.showFilePicker) {
      footerKeys.content = "  [↑↓/jk] Move     [Space] Toggle     [a] Toggle all     [Enter] Confirm     [Esc] Cancel";
    } else if (s.askingHint) {
      footerKeys.content = "  [Enter] Regenerate with hint     [Esc] Regenerate on its own     [Ctrl+C] Cancel";
    } else if (s.editing) {
      // Only one save action shown — Ctrl+S works on every OS
      footerKeys.content = "  [Ctrl+S] Save     [Esc] Cancel";
    } else if (s.busy && s.variants.length === 0) {
      footerKeys.content = "  [q] Cancel";
    } else {
      footerKeys.content = new StyledText(buildFooterChunks(cols));
    }
    footerKeys.fg = palette.text;

    try {
      renderer.requestRender?.();
    } catch {
      /* ignore */
    }
  }

  redraw();

  async function regenerate(replaceCurrent: boolean) {
    s.busy = true;
    s.lastAction = "Regenerating...";
    s.statusNote = undefined;
    redraw();
    try {
      const avoid = s.variants.filter((_, i) =>
        replaceCurrent ? i !== s.index : true,
      );
      const result = await generateCommitMessageFromDiff(s.config, s.diff, {
        hint: s.hint,
        avoid,
      });
      const message = extractMessageContent(result?.content).trim();
      if (message) {
        if (replaceCurrent && s.variants.length > 0) {
          s.variants[s.index] = message;
          s.lastAction = "Regenerated";
          s.lastActionKind = "ok";
        } else {
          s.variants.push(message);
          s.index = s.variants.length - 1;
          s.lastAction = "Ready";
          s.lastActionKind = "ok";
        }
      } else {
        s.lastAction = "Empty response";
        s.lastActionKind = "err";
      }
    } catch (err) {
      s.lastAction = `Failed: ${err instanceof Error ? err.message : String(err)}`;
      s.lastActionKind = "err";
    } finally {
      s.busy = false;
      redraw();
    }
  }

  // If asked to generate the first message inside the TUI, fire it off now.
  const firstGen =
    options?.generateFirst && s.variants.length === 0
      ? (async () => {
          s.busy = true;
          redraw();
          try {
            const result = await generateCommitMessageFromDiff(
              s.config,
              s.diff,
              { hint: s.hint },
            );
            const msg = extractMessageContent(result?.content).trim();
            if (msg) {
              s.variants = [msg];
              s.index = 0;
            } else {
              s.lastAction = "Empty response";
              s.lastActionKind = "err";
            }
          } catch (err) {
            s.lastAction = `Failed: ${
              err instanceof Error ? err.message : String(err)
            }`;
          }
          s.busy = false;
          redraw();
        })()
      : Promise.resolve();

  return new Promise((resolve) => {
    let finished = false;

    const finish = (action: TuiAction | null) => {
      if (finished) return;
      finished = true;
      try {
        renderer.destroy();
      } catch {
        /* ignore */
      }
      resolve({ action, state: s });
    };

    void firstGen;

    renderer.keyInput.on(
      "keypress",
      async (key: {
        name?: string;
        ctrl?: boolean;
        sequence?: string;
        raw?: string;
      }) => {
        const k = normalizeKey(key);

        // ── Asking hint mode (press Enter to confirm, Esc to regenerate as-is) ──
        if (s.askingHint) {
          const seq = key.sequence ?? key.raw ?? "";
          const name = (key.name ?? "").toLowerCase();

          // Cancel
          if (k === "__ctrl_c__") {
            s.askingHint = false;
            s.hintBuffer = undefined;
            s.lastAction = "Regenerate cancelled";
            s.lastActionKind = "info";
            redraw();
            return;
          }

          // Enter: apply hint and regenerate
          if (name === "return" || name === "enter" || seq === "\r" || seq === "\n") {
            const entered = (s.hintBuffer ?? "").trim();
            if (entered.length > 0) {
              s.hint = entered;
              s.lastAction = `Hint set: "${entered}"`;
              s.lastActionKind = "ok";
            }
            s.askingHint = false;
            s.hintBuffer = undefined;
            await regenerate(s.variants.length >= MAX_VARIANTS);
            return;
          }

          // Esc: regenerate on its own without modifying hint
          if (k === "escape" || name === "escape") {
            s.askingHint = false;
            s.hintBuffer = undefined;
            s.lastAction = "Regenerating…";
            s.lastActionKind = "info";
            await regenerate(s.variants.length >= MAX_VARIANTS);
            return;
          }

          // Backspace / Delete
          if (name === "backspace" || name === "delete" || seq === "\x7f" || seq === "\b") {
            s.hintBuffer = (s.hintBuffer ?? "").slice(0, -1);
            redraw();
            return;
          }

          // Printable character (ignore ctrl/meta combos)
          if (!key.ctrl && seq.length === 1 && seq >= " ") {
            s.hintBuffer = (s.hintBuffer ?? "") + seq;
            redraw();
            return;
          }
          return;
        }

        // ── Inline edit mode (stays in TUI) — Win / macOS / Linux ─────
        if (s.editing) {
          const seq = key.sequence ?? key.raw ?? "";
          const name = (key.name ?? "").toLowerCase();

          // Cancel
          if (k === "escape" || k === "__ctrl_c__" || name === "escape") {
            s.editing = false;
            s.editBuffer = undefined;
            s.lastAction = "Edit cancelled";
            s.lastActionKind = "info";
            redraw();
            return;
          }

          // Save: Ctrl+S only (all platforms). Detect both key.name and raw 0x13
          // so it works under Windows Terminal, macOS Terminal, iTerm, kitty,
          // Alacritty, etc.
          const isSave =
            (key.ctrl && (name === "s" || name === "S")) ||
            seq === "\u0013" ||
            seq === "\x13";

          if (isSave) {
            const edited = (s.editBuffer ?? "").trimEnd();
            if (edited.length > 0) {
              s.variants[s.index] = edited;
              s.lastAction = "Message updated";
              s.lastActionKind = "ok";
            } else {
              s.lastAction = "Edit cancelled (empty)";
              s.lastActionKind = "info";
            }
            s.editing = false;
            s.editBuffer = undefined;
            redraw();
            return;
          }

          // Newline
          if (name === "return" || name === "enter" || seq === "\r" || seq === "\n") {
            s.editBuffer = (s.editBuffer ?? "") + "\n";
            redraw();
            return;
          }

          // Backspace / Delete
          if (name === "backspace" || name === "delete" || seq === "\x7f" || seq === "\b") {
            s.editBuffer = (s.editBuffer ?? "").slice(0, -1);
            redraw();
            return;
          }

          // Printable character (ignore ctrl/meta combos)
          if (!key.ctrl && seq.length === 1 && seq >= " ") {
            s.editBuffer = (s.editBuffer ?? "") + seq;
            redraw();
            return;
          }
          return;
        }

        if (k === "__ctrl_c__" || k === "escape") {
          if (s.showHelp) {
            s.showHelp = false;
            redraw();
            return;
          }
          if (s.showFilePicker) {
            s.showFilePicker = false;
            s.filePickerFiles = undefined;
            s.filePickerCursor = undefined;
            s.filePickerScrollOffset = undefined;
            s.lastAction = "File picker cancelled";
            s.lastActionKind = "info";
            redraw();
            return;
          }
          finish(null);
          return;
        }

        // ── File picker navigation (stays in TUI) ─────────────────────
        if (s.showFilePicker) {
          const files = s.filePickerFiles ?? [];
          const name = (key.name ?? "").toLowerCase();
          const seq = key.sequence ?? key.raw ?? "";

          if (name === "up" || seq === "\u001b[A" || name === "k") {
            s.filePickerCursor = Math.max(0, (s.filePickerCursor ?? 0) - 1);
            redraw();
            return;
          }
          if (name === "down" || seq === "\u001b[B" || name === "j") {
            s.filePickerCursor = Math.min(files.length - 1, (s.filePickerCursor ?? 0) + 1);
            redraw();
            return;
          }
          if (name === "space" || seq === " ") {
            const cur = s.filePickerCursor ?? 0;
            const f = files[cur];
            if (f) {
              try {
                if (f.staged) {
                  await unstageFiles([f.path]);
                  f.staged = false;
                } else {
                  await stageFiles([f.path]);
                  f.staged = true;
                }
              } catch {
                /* ignore per-file errors */
              }
              redraw();
            }
            return;
          }
          if (name === "a" || seq === "a") {
            const allStaged = files.every((f) => f.staged);
            for (const f of files) {
              if (f.staged === allStaged) {
                if (allStaged) {
                  await unstageFiles([f.path]).catch(() => undefined);
                  f.staged = false;
                } else {
                  await stageFiles([f.path]).catch(() => undefined);
                  f.staged = true;
                }
              }
            }
            redraw();
            return;
          }
          if (name === "return" || name === "enter" || seq === "\r" || seq === "\n") {
            // Confirm: close picker, refresh diff for strictly selected files, and regenerate commit message
            const allFiles = s.filePickerFiles ?? [];
            const selectedFiles = allFiles.filter((f) => f.staged).map((f) => f.path);
            const unselectedFiles = allFiles.filter((f) => !f.staged).map((f) => f.path);

            s.showFilePicker = false;
            s.filePickerFiles = undefined;
            s.filePickerCursor = undefined;
            s.filePickerScrollOffset = undefined;

            // Immediately clear previous message so it disappears from the screen!
            s.variants = [];
            s.index = 0;
            s.busy = true;
            s.statusNote = selectedFiles.length > 0
              ? `Selected ${selectedFiles.length} file(s) — writing commit message...`
              : "No files selected";
            s.lastAction = `Selected ${selectedFiles.length} file(s)`;
            s.lastActionKind = "ok";
            redraw();

            if (unselectedFiles.length > 0) await unstageFiles(unselectedFiles).catch(() => undefined);
            if (selectedFiles.length > 0) await stageFiles(selectedFiles).catch(() => undefined);

            if (selectedFiles.length === 0) {
              s.diff = "";
              s.stagedOnly = false;
              s.busy = false;
              s.statusNote = "All files unselected — nothing staged.";
              s.lastAction = "All files unselected";
              s.lastActionKind = "info";
              redraw();
              return;
            }

            const { collectDiff } = await import("@/git/diff");
            const { filterNoiseFromDiff } = await import("@/misc/ignore");
            const { diff: newRawDiff, stagedOnly: newStaged } = await collectDiff({
              all: false,
              stagedOnly: true,
              paths: selectedFiles,
            });

            if (!newRawDiff || newRawDiff.trim().length === 0) {
              s.diff = "";
              s.stagedOnly = false;
              s.busy = false;
              s.statusNote = "No changes found in selected files.";
              s.lastAction = "Empty diff for selected files";
              s.lastActionKind = "info";
              redraw();
              return;
            }

            const { diff: filteredDiff } = await filterNoiseFromDiff(newRawDiff);
            s.diff = filteredDiff.trim().length > 0 ? filteredDiff : newRawDiff;
            s.stagedOnly = newStaged;
            s.statusNote = "Writing commit message for selected files...";
            redraw();

            await regenerate(false);
            return;
          }
          return; // swallow all other keys while picker is open
        }

        if (s.busy && s.variants.length === 0) {
          if (k === "q") finish(null);
          return;
        }

        if (s.busy) return;

        if (s.showHelp) {
          s.showHelp = false;
          redraw();
          return;
        }

        const name = (key.name ?? "").toLowerCase();
        const seq = key.sequence ?? key.raw ?? "";
        if ((name === "return" || name === "enter" || seq === "\r" || seq === "\n") && s.yoloEnabled) {
          finish("yolo");
          return;
        }

        switch (k) {
          case "q":
            finish(null);
            return;
          case "h":
            s.showHelp = true;
            redraw();
            return;
          case "c": {
            s.lastAction = "Copying...";
            redraw();
            const ok = await copyToClipboard(s.variants[s.index] ?? "");
            s.lastAction = ok ? "Copied" : "Clipboard unavailable";
            s.lastActionKind = ok ? "ok" : "err";
            redraw();
            return;
          }
          case "e": {
            s.editing = true;
            s.editBuffer = s.variants[s.index] ?? "";
            s.lastAction = "Editing in place (Ctrl+S to save, Esc to cancel)";
            s.lastActionKind = "info";
            redraw();
            return;
          }
          case "r": {
            s.askingHint = true;
            s.hintBuffer = s.hint ?? "";
            s.lastAction = "Regenerate with hint (Enter to submit, Esc as-is)";
            s.lastActionKind = "info";
            redraw();
            return;
          }
          case "n": {
            if (s.index < s.variants.length - 1) {
              s.index++;
              s.lastAction = `Switched to Variant ${s.index + 1}/${s.variants.length}`;
              s.lastActionKind = "ok";
              redraw();
            } else if (s.variants.length < MAX_VARIANTS) {
              s.lastAction = "Generating new variant...";
              s.lastActionKind = "info";
              await regenerate(false);
            } else {
              s.index = 0;
              s.lastAction = `Switched to Variant 1/${s.variants.length}`;
              s.lastActionKind = "ok";
              redraw();
            }
            return;
          }
          case "p": {
            s.index =
              s.index > 0 ? s.index - 1 : s.variants.length - 1;
            s.lastAction = `Switched to Variant ${s.index + 1}/${s.variants.length}`;
            s.lastActionKind = "ok";
            redraw();
            return;
          }
          case "f": {
            // Open in-TUI file picker
            s.lastAction = "Loading files...";
            s.lastActionKind = "info";
            redraw();
            try {
              const files = await getChangedFiles();
              s.filePickerFiles = files;
              s.filePickerCursor = 0;
              s.filePickerScrollOffset = 0;
              s.showFilePicker = true;
              s.lastAction = "File picker opened — Space to toggle, Enter to confirm";
              s.lastActionKind = "info";
            } catch {
              s.lastAction = "Could not read file status";
              s.lastActionKind = "err";
            }
            redraw();
            return;
          }
          case "s": {
            if (!s.stagedOnly) {
              s.lastAction = "Nothing staged — press [a]";
              redraw();
              return;
            }
            finish("commit-staged");
            return;
          }
          case "a":
            finish("stage-all-commit");
            return;
          case "u":
            finish("commit-push");
            return;
          case "y": {
            s.yoloEnabled = !s.yoloEnabled;
            s.config.yolo = s.yoloEnabled;
            await saveConfig(s.config).catch(() => undefined);
            s.lastAction = s.yoloEnabled
              ? "Yolo mode ON (saved) — press [Enter] to stage all, commit & push (or [y] to turn off)"
              : "Yolo mode OFF (saved)";
            s.lastActionKind = "ok";
            redraw();
            return;
          }
          case "d":
            finish("dry-run");
            return;
          default:
            return;
        }
      },
    );
  });
}

export async function executeTuiAction(
  action: TuiAction,
  state: TuiState,
): Promise<void> {
  const message = state.variants[state.index] ?? "";

  if (action === "dry-run") {
    console.log(message);
    console.log(chalk.yellow("\n-- Dry-run --"));
    console.log(chalk.dim("Message printed above. No commit was made."));
    return;
  }

  try {
    if (
      action === "stage-all-commit" ||
      action === "yolo" ||
      (action === "commit-push" && !state.stagedOnly)
    ) {
      await stageAll();
      await commitStaged(message);
      console.log(chalk.green("Staged and committed successfully."));
    } else if (action === "commit-staged" || action === "commit-push") {
      await commitStaged(message);
      console.log(chalk.green("Committed successfully."));
    }

    if (action === "commit-push" || action === "yolo") {
      try {
        const result = await pushCurrentBranch();
        if (result.setUpstream) {
          console.log(
            chalk.green(`Pushed and set upstream for '${result.branch}'.`),
          );
        } else {
          console.log(chalk.green("Pushed successfully."));
        }
      } catch (error) {
        console.log(chalk.red(chalk.bold("Error pushing:"), error));
      }
    }
  } catch (error) {
    console.log(chalk.red(chalk.bold("Error committing:"), error));
  }
}
