import chalk from "chalk";

export function noConfig() {
  console.warn(chalk.bold.red("⚠️  Configuration Error"));
  console.warn(chalk.red("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
  console.warn(chalk.yellow("Configuration file not found!"));
  console.warn(chalk.white("To set up your configuration, run:"));
  console.warn(chalk.bold.green("  gcmg config"));
  console.warn(chalk.red("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"));
}