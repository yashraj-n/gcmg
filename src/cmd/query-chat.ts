import { invokeWithHistory } from "@/llm";
import { getConfig } from "@/misc/config";
import { notifyModelStatus } from "@/misc/model-status";
import { GIT_HELP_PROMPT } from "@/misc/prompt";
import { extractMessageContent, handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "langchain";
import prompts from "prompts";

export async function queryChat(query: string) {
  if (!query || !query.trim()) {
    console.log(chalk.red("Please provide a question about git."));
    return;
  }

  const config = await getConfig();
  if (!config?.apiKey || !config?.model || !config?.provider) {
    console.error(
      chalk.red("No valid configuration found. Run: gcmg config"),
    );
    return;
  }

  await notifyModelStatus(config);

  const history: BaseMessage[] = [
    new SystemMessage(GIT_HELP_PROMPT),
    new HumanMessage(query.trim()),
  ];

  let currentQuery = query.trim();

  while (true) {
    console.log(chalk.dim("User: "), currentQuery);
    try {
      const response = await invokeWithHistory(config, history);
      const content = extractMessageContent(response?.content).trim() || "(empty reply)";
      console.log(chalk.dim("Assistant: "), content);
      history.push(new AIMessage(content));
    } catch (error) {
      console.log(
        chalk.red(chalk.bold("Error from model:"), error),
      );
      return;
    }

    const { query: newQuery } = await prompts(
      [
        {
          type: "text",
          name: "query",
          message: "Enter your new query (Ctrl+C to exit)",
        },
      ],
      { onCancel: handlePromptExit },
    );

    if (!newQuery || !String(newQuery).trim()) {
      console.log(chalk.dim("Empty query — exiting."));
      return;
    }

    currentQuery = String(newQuery).trim();
    history.push(new HumanMessage(currentQuery));
  }
}
