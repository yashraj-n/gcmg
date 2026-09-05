import chalk from "chalk";

export function renderHelpOverlay(): string {
  const rows: [string, string][] = [
    ["c", "Copy the current message to the clipboard"],
    ["e", "Open the message in the system editor"],
    ["r", "Generate a new variant (or replace if at max 3)"],
    ["n", "Next variant (generates one if needed)"],
    ["p", "Previous variant"],
    ["d", "Dry-run: print the message and exit"],
    ["s", "Commit staged changes only"],
    ["a", "Stage everything, then commit"],
    ["u", "Commit (and stage if needed), then push"],
    ["?", "Toggle this help overlay"],
    ["q / Esc / Ctrl+C", "Quit without committing"],
  ];

  const lines = [chalk.bold("gcmg — key reference"), ""];
  for (const [key, desc] of rows) {
    lines.push(` ${chalk.cyan(key.padEnd(18))} ${desc}`);
  }
  lines.push("", chalk.dim("Press any key to return."));
  return lines.join("\n");
}
