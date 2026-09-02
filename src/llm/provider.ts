import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { Config } from "@/misc/config";

export const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "OpenRouter",
  "Custom OpenAI Based Provider",
] as const;

export type GcmgProviders = (typeof PROVIDERS)[number];

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export function getProvider(provider: GcmgProviders, config: Config) {
  const activeProvider = provider || config.provider;
  const clientConfig = {
    apiKey: config.apiKey,
    model: config.model,
    configuration: config.extra?.baseUrl
      ? { baseURL: config.extra.baseUrl }
      : undefined,
    temperature: 0.0,
    maxRetries: 2,
  };

  switch (activeProvider) {
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
    case "OpenRouter":
      return new ChatOpenAI({
        apiKey: config.apiKey,
        model: config.model,
        temperature: 0.0,
        maxRetries: 2,
        configuration: {
          baseURL: OPENROUTER_BASE_URL,
          defaultHeaders: {
            "HTTP-Referer": "https://github.com/yashraj-n/gcmg",
            "X-Title": "gcmg",
          },
        },
      });
    case "Custom OpenAI Based Provider":
      return new ChatOpenAI({
        ...clientConfig,
      });
    default:
      throw new Error(`Invalid provider: ${activeProvider}`);
  }
}
