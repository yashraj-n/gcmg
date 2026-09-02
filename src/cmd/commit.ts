import { generateCommitMessageFromDiff } from "@/llm";
import { getConfig } from "@/misc/config";
import { getModelDiffLimit, notifyModelStatus } from "@/misc/model-status";
import { extractMessageContent, getRandomJoke, handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import ora from "ora";
import simpleGit from "simple-git";
import prompts from "prompts";

const git = simpleGit();

export async function generateCommitMessage() {
  let diff: string;
  try {
    diff = await getDiff();
  } catch (error) {
    console.log(
      chalk.red(
        chalk.bold("Not a git repository (or git is unavailable)."),
      ),
      error instanceof Error ? error.message : error,
    );
    return;
  }

  if (!diff || diff.trim().length === 0) {
    console.log(chalk.red(chalk.bold("No changes to commit")));
    return;
  }

  const config = await getConfig();
  if (!config?.apiKey || !config?.model || !config?.provider) {
    console.log(
      chalk.red(
        chalk.bold("Invalid or missing configuration. Run: gcmg config"),
      ),
    );
    return;
  }

  const { maxDiffChars, contextTokens, isCustomOverride } =
    await getModelDiffLimit(config);

  const originalLength = diff.length;
  if (diff.length > maxDiffChars) {
    const reason = isCustomOverride
      ? "(via GCMG_MAX_DIFF_CHARS)"
      : `(~${contextTokens.toLocaleString()} token context limit for ${config.model})`;
    console.log(
      chalk.yellow(
        `Diff is large (${originalLength.toLocaleString()} chars). Truncating to ${maxDiffChars.toLocaleString()} chars ${reason}.`,
      ),
    );
    diff = diff.slice(0, maxDiffChars) + "\n\n… [diff truncated]";
  }

  console.log(
    chalk.dim(`Analyzing ${diff.length.toLocaleString()} characters of diff`),
  );
  console.log(
    chalk.dim(`Provider: ${config.provider} · Model: ${config.model}`),
  );
  if (config.provider === "Custom OpenAI Based Provider") {
    console.log(chalk.dim(`Base URL: ${config.extra?.baseUrl ?? "(none)"}`));
  }

  await notifyModelStatus(config);

  const spinner = ora(getRandomJoke()).start();

  try {
    const result = await generateCommitMessageFromDiff(config, diff);
    const commitMessage = extractMessageContent(result?.content).trim();

    if (!commitMessage) {
      spinner.fail("Model returned an empty commit message");
      return;
    }

    spinner.succeed();
    console.log("\n" + chalk.bold(commitMessage));

    const { confirmAdd } = await prompts(
      [
        {
          type: "confirm",
          initial: true,
          message: "Do you want to add the changes to the staging area?",
          name: "confirmAdd",
        },
      ],
      { onCancel: handlePromptExit },
    );

    if (!confirmAdd) return;

    try {
      await git.add(".");
      await git.commit(commitMessage);
      console.log(chalk.green("Committed changes successfully."));
    } catch (error) {
      console.log(chalk.red(chalk.bold("Error committing changes:"), error));
      return;
    }

    const { confirmPush } = await prompts(
      [
        {
          type: "confirm",
          initial: true,
          message: "Do you want to push the changes to the remote repository?",
          name: "confirmPush",
        },
      ],
      { onCancel: handlePromptExit },
    );
    if (!confirmPush) return;

    try {
      await git.push();
      console.log(chalk.green("Pushed changes successfully."));
    } catch (error) {
      console.log(chalk.red(chalk.bold("Error pushing changes:"), error));
    }
  } catch (error) {
    spinner.fail();
    console.log(
      chalk.red(chalk.bold("Error generating commit message:"), error),
    );
  }
}

async function getDiff(): Promise<string> {
  try {
    // Staged + unstaged changes vs HEAD
    return await git.diff(["HEAD"]);
  } catch {
    // Fallback if HEAD does not exist yet (e.g. freshly initialized repository)
    try {
      const staged = await git.diff(["--cached"]);
      const unstaged = await git.diff([]);
      return [staged, unstaged].filter(Boolean).join("\n");
    } catch {
      return await git.diff();
    }
  }
}
