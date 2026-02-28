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

type GcmgProviders = (typeof PROVIDERS)[number];

export const PROVIDER_MODELS: Record<GcmgProviders, string[]> = {
  OpenAI: [
    "gpt-5.2",
    "gpt-5.2-pro",
    "gpt-5.1",
    "gpt-5",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
  ],
  Anthropic: [
    "claude-opus-4-6",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-opus-4-5-20251101",
    "claude-sonnet-4-5",
  ],
  Google: [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ],
  "Custom OpenAI Based Provider": ["gpt-4o", "gpt-4o-mini"],
};

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
