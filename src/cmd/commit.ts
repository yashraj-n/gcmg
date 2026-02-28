import { generateCommitMessageFromDiff } from "@/llm";
import { getConfig } from "@/misc/config";
import { getRandomJoke } from "@/misc/utils";
import chalk from "chalk";
import ora from "ora";
import simpleGit from "simple-git";
import prompts from "prompts";
import boxen from "boxen";

const git = simpleGit();

export async function generateCommitMessage() {
  const diff = await getDiff();
  if (diff.length === 0) {
    console.log(chalk.red(chalk.bold("No changes to commit")));
    return;
  }
  const config = await getConfig();
  console.log(
    chalk.dim(`Analyzing ${diff.length.toLocaleString()} characters of diff`),
  );
  if (config) {
    console.log(
      chalk.dim(`Provider: ${config.provider} · Model: ${config.model}`),
    );
    if (config.provider === "Custom OpenAI Based Provider") {
      console.log(chalk.dim(`Base URL: ${config.extra?.baseUrl}`));
    }
  }
  const spinner = ora(getRandomJoke()).start();

  try {
    const { content: commitMessage } = await generateCommitMessageFromDiff(
      config!,
      diff,
    );
    spinner.succeed();

    console.log("\n" + chalk.bold(commitMessage));

    const { confirmAdd } = await prompts([
      {
        type: "confirm",
        initial: true,
        message: "Do you want to add the changes to the staging area?",
        name: "confirmAdd",
      },
    ]);

    if (!confirmAdd) return;
    await git.add(".");
    await git.commit(commitMessage.toString(), ".");

    const { confirmPush } = await prompts([
      {
        type: "confirm",
        initial: true,
        message: "Do you want to push the changes to the remote repository?",
        name: "confirmPush",
      },
    ]);
    if (!confirmPush) return;
    await git.push();
  } catch (error) {
    console.log(
      chalk.red(chalk.bold("Error generating commit message:"), error),
    );
    spinner.fail();
    throw error;
  }
}

function getDiff() {
  return git.diff({});
}
