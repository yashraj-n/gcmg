import { Config } from "@/misc/config";
import { getProvider } from "./provider";
import { COMMIT_PROMPT } from "@/misc/prompt";

export function testProvider(config: Config) {
  return invoke(config, "Reply with '.' only", "");
}

export function generateCommitMessageFromDiff(config: Config, diff: string) {
  return invoke(config, COMMIT_PROMPT, diff);
}

function invoke(config: Config, system: string, user: string) {
  const provider = getProvider(config.provider, config);
  return provider.invoke(system + "\n\n" + user);
}
