import { invokeWithHistory } from "@/llm";
import { getConfig } from "@/misc/config";
import { GIT_HELP_PROMPT } from "@/misc/prompt";
import { handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import { AIMessage, HumanMessage, SystemMessage } from "langchain";
import prompts from "prompts";

export async function queryChat(query: string) {
  const history = [];
  history.push(new SystemMessage(GIT_HELP_PROMPT));
  history.push(new HumanMessage(query));

  const config = await getConfig();
  if (!config) {
    console.error("No config found");
    return;
  }
  while (true) {
    console.log(chalk.dim("User: "), query);
    const response = await invokeWithHistory(config, history);
    console.log(chalk.dim("Assistant: "), response.content);
    history.push(new AIMessage(response.content));
    const { query: newQuery } = await prompts([
      {
        type: "text",
        name: "query",
        message: "Enter your new query (Ctrl+C to exit)",
      },
    ], {
        onCancel: handlePromptExit,
    });

    history.push(new HumanMessage(newQuery));
    query = newQuery;
  }
}
