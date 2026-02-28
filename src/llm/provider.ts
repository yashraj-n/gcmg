import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Config } from "@/misc/config";

export const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Custom OpenAI Based Provider",
] as const;

export type GcmgProviders = (typeof PROVIDERS)[number];

export function getProvider(provider: GcmgProviders, config: Config) {
  const clientConfig = {
    apiKey: config.apiKey,
    model: config.model,
    configuration: config.extra?.baseUrl
      ? { baseURL: config.extra.baseUrl }
      : undefined,
    temperature: 0.0,
    maxRetries: 2,
  };

  switch (config.provider) {
    case "OpenAI":
      return new ChatOpenAI({
        ...clientConfig,
      });
    case "Anthropic":
      return new ChatAnthropic({
        ...clientConfig,
      });
    case "Google":
      return new ChatGoogleGenerativeAI({
        ...clientConfig,
      });
    case "Custom OpenAI Based Provider":
      return new ChatOpenAI({
        ...clientConfig,
      });
    default:
      throw new Error(`Invalid provider: ${provider}`);
  }
}
