import ConfigManager from "@/lib/config";
import { execSync } from "node:child_process";
import path from "node:path";
import chalk from "chalk";

export function editConfig() {
  const command = getOpenComand();
  execSync(`${command} ${ConfigManager.getInstance().getConfigFileDir()}`);
  console.log(chalk.bold("Config file opened in default editor"));
}

function getOpenComand() {
  switch (process.platform) {
    case "darwin":
      return "open";
    case "win32":
      return "start";
    default:
      return "xdg-open";
  }
}
