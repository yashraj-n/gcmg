import { Config } from "@/misc/config";
import { getProvider } from "./provider";
import { COMMIT_PROMPT } from "@/misc/prompt";
import { BaseMessage, HumanMessage, SystemMessage } from "langchain";

export function testProvider(config: Config) {
  return invoke(config, "Reply with '.' only", "");
}

export function generateCommitMessageFromDiff(config: Config, diff: string) {
  return invoke(config, COMMIT_PROMPT, diff);
}

function invoke(config: Config, system: string, user: string) {
  const provider = getProvider(config.provider, config);
  if (!user || !user.trim()) {
    return provider.invoke(system);
  }
  return provider.invoke([
    new SystemMessage(system),
    new HumanMessage(user),
  ]);
}

export function invokeWithHistory(config: Config, history: BaseMessage[]) {
  const provider = getProvider(config.provider, config);
  return provider.invoke(history);
}
