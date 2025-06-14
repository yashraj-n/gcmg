import Enquirer from "enquirer";
import { providers } from "@/lib/generated-models";
import ConfigManager, { Config } from "@/lib/config";
import { COMMIT_PROMPT, HELP_PROMPT } from "@/prompts";
import chalk from "chalk";
import { showHelp } from "./help";
import { LLmManager } from "@/lib/llm";
import yoctoSpinner from "yocto-spinner";

export async function configure() {
  const { name } = await Enquirer.prompt<{
    name: keyof typeof providers;
  }>({
    type: "select",
    name: "name",
    message: "Please Choose AI Provider:",
    choices: Object.keys(providers),
  });

  const { model, apiKey } = await Enquirer.prompt<{
    model: string;
    apiKey: string;
  }>([
    {
      type: "select",
      name: "model",
      message: "Please Choose Model:",
      choices: providers[name].models.sort((a, b) => a.localeCompare(b)),
    },
    {
      type: "password",
      name: "apiKey",
      message: "Please enter your API Key:",
    },
  ]);

  const payload: Config = {
    name,
    model,
    apiKey,
    provider: providers[name].provider,
    prompts: {
      commit: COMMIT_PROMPT,
      help: HELP_PROMPT,
    },
  };

  const spinner = yoctoSpinner({
    text: "Saving Configuration...",
  }).start();
  const savedPath = ConfigManager.getInstance().saveConfig(payload);
  spinner.text = "Testing LLM...";
  const isValidLLM = await LLmManager.getInstance().testLLM();
  if (!isValidLLM) {
    spinner.stop()
    spinner.clear();
    return;
  }
  spinner.success("LLM Tested Successfully");

  const boxWidth = 80;
  const message = `💾 Configuration saved to ${savedPath}`;
  const padding = Math.max(0, boxWidth - message.length - 2);

  console.log("\n" + chalk.blue("╭" + "─".repeat(boxWidth) + "╮"));
  console.log(
    chalk.blue("│") +
      " " +
      chalk.bold.blue(message) +
      " ".repeat(padding) +
      chalk.blue("│")
  );
  console.log(chalk.blue("╰" + "─".repeat(boxWidth) + "╯\n"));

  console.log(chalk.bold.greenBright("Available Commands:"));
  showHelp();
}
