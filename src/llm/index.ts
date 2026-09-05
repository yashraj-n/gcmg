import { Config } from "@/misc/config";
import { getProvider } from "./provider";
import { COMMIT_PROMPT } from "@/misc/prompt";
import { BaseMessage, HumanMessage, SystemMessage } from "langchain";

export function testProvider(config: Config) {
  return invoke(config, "Reply with '.' only", "");
}

export interface GenerateCommitMessageOptions {
  /** User-supplied hint, e.g. from `-m`/`--context`. */
  hint?: string;
  /** Previously generated variants, so a regenerate/next-variant call produces something different. */
  avoid?: string[];
}

export function generateCommitMessageFromDiff(
  config: Config,
  diff: string,
  options: GenerateCommitMessageOptions = {},
) {
  let userContent = diff;
  if (options.hint?.trim()) {
    userContent = `User-provided hint about this change: ${options.hint.trim()}\n\n${userContent}`;
  }
  if (options.avoid?.length) {
    const avoidList = options.avoid.map((m, i) => `${i + 1}. ${m}`).join("\n");
    userContent += `\n\n## Previously generated messages for this diff\nProduce a genuinely different variant (different wording/emphasis), do not repeat these:\n${avoidList}`;
  }
  return invoke(config, COMMIT_PROMPT, userContent);
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
