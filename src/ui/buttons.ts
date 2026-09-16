/**
 * Pack pre-rendered chips left→right, wrapping to new lines once they'd
 * exceed the available width. Shared by keybar.ts (CLI) and tui.ts (TUI) —
 * previously each had its own copy, and only the TUI's actually wrapped,
 * so a narrow terminal in CLI mode let the raw terminal hard-wrap the key
 * bar wherever it pleased instead of on chip boundaries.
 */
export function packChips(
  chips: string[],
  termWidth: number,
  opts: { indent?: number; gap?: number; visibleLen?: (s: string) => number } = {},
): string[] {
  const indent = opts.indent ?? 1;
  const gap = opts.gap ?? 2;
  const len = opts.visibleLen ?? ((s: string) => stripAnsi(s).length);
  const maxW = Math.max(20, termWidth - indent);

  const lines: string[] = [];
  let row: string[] = [];
  let rowLen = 0;

  for (const chip of chips) {
    const w = len(chip);
    const extra = row.length === 0 ? 0 : gap;
    if (row.length > 0 && rowLen + extra + w > maxW) {
      lines.push(" ".repeat(indent) + row.join(" ".repeat(gap)));
      row = [chip];
      rowLen = w;
    } else {
      row.push(chip);
      rowLen += extra + w;
    }
  }
  if (row.length) lines.push(" ".repeat(indent) + row.join(" ".repeat(gap)));
  return lines;
}

/** Strip ANSI escape codes so width math ignores color bytes. */
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}
