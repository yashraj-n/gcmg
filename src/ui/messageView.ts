import chalk from "chalk";

export function renderMessage(message: string): string {
  return "\n" + chalk.bold(message) + "\n";
}

export function renderWarnings(lines: string[]): string {
  if (lines.length === 0) return "";
  return "\n" + lines.map((line) => chalk.yellow.bold("⚠ " + line)).join("\n") + "\n";
}
