import { exec, execSync } from "node:child_process";
import Enquirer from "enquirer";
import { LLmManager } from "@/lib/llm";
import chalk from "chalk";
import shellQuote from "shell-quote";
import yoctoSpinner from "yocto-spinner";
import fs from "fs/promises";
import os from "os";
import path from "path";

const getDiff = (): string => {
  try {
    execSync("git add . -N"); // Add all files to the index so that newly created files are added to the diff
    return execSync("git --no-pager diff", {
      encoding: "utf8",
      // Ignore warnings
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch (error) {
    throw new Error(`Failed to get git diff: ${error}`);
  }
};

const executeGitCommand = (command: string): void => {
  try {
    execSync("git " + command, { stdio: "inherit" });
  } catch (error) {
    throw new Error(`Git command failed: ${error}`);
  }
};

const confirmAction = async (message: string): Promise<boolean> => {
  const response = await Enquirer.prompt<{ confirm: boolean }>({
    type: "confirm",
    name: "confirm",
    message,
  });
  return response.confirm;
};

const addAndCommit = async (commitMessage: string): Promise<void> => {
  const shouldProceed = await confirmAction(
    "Do you want to add and commit these changes?"
  );
  if (!shouldProceed) return process.exit(0);

  const tmpDir = os.tmpdir();
  const tmpFile = path.join(tmpDir, `gcmg-commit-msg-${Date.now()}.txt`);
  try {
    await fs.writeFile(tmpFile, commitMessage, { encoding: "utf8" });
    executeGitCommand("add .");
    executeGitCommand(`commit -F "${tmpFile}"`);
    await fs.unlink(tmpFile);
    console.log("✅ Changes committed successfully");
  } catch (error) {
    try { await fs.unlink(tmpFile); } catch {}
    console.error("❌ Failed to commit changes:", error);
    throw error;
  }
};

const pushChanges = async (): Promise<void> => {
  const shouldPush = await confirmAction("Do you want to push the changes?");
  if (!shouldPush) return;

  try {
    executeGitCommand("push");
    console.log("✅ Changes pushed successfully");
  } catch (error) {
    console.error("❌ Failed to push changes:", error);
    throw error;
  }
};

export async function generateCommitMessage(): Promise<void> {
  try {
    const spinner = yoctoSpinner({
      text: "Getting Changes...",
    }).start();
    const diff = getDiff();
    if (!diff.trim()) {
      spinner.stop();
      console.log(chalk.yellow("⚠️ No Changes Detected."));
      return;
    }

    if (diff.length > 10000) {
      spinner.warning(
        `⚠️ The diff exceeds the soft cap limit (10,000) currenty ${diff.length} characters. This may cause issues with the LLM. Do you want to continue?`
      );
      const shouldContinue = await confirmAction(
        "Do you want to continue?"
      );
      if (!shouldContinue) {
        process.exit(0);
      }
      spinner.start();
    }

    spinner.text = "Generating Commit Message...";
    const result = await LLmManager.getInstance().generateCommitMessage(diff);
    spinner.success("Commit Message Generated Successfully");
    spinner.stop();
    console.log();
    console.log(chalk.bold(result));

    const escapedCommitMsg = shellQuote.quote([result]).slice(1, -1); // Remove quotes
    await addAndCommit(escapedCommitMsg);
    await pushChanges();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error:", error.message);
    } else {
      console.error("Error:", error);
    }
    process.exit(1);
  }
}
