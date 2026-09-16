import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import type { Config } from "./config";
import { getConfigDirectory } from "./config";
import type { GcmgProviders } from "@/llm/provider";
import { CHARS_PER_TOKEN, MIN_USABLE_TOKENS } from "@/misc/constants";

const CACHE_FILE = "models-cache.json";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5_000;
const NOTIFY_BUDGET_MS = 2_500;

type OpenRouterModel = {
  id: string;
  name?: string;
  expiration_date?: string | null;
  created?: number;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
  };
};

type ModelsCache = {
  fetchedAt: number;
  models: OpenRouterModel[];
};

export type ModelCheckResult =
  | {
      status: "ok";
      openRouterId: string;
      name?: string;
      contextLength?: number;
    }
  | { status: "not_found"; openRouterId: string }
  | {
      status: "deprecated";
      openRouterId: string;
      expiration?: string;
      name?: string;
      contextLength?: number;
    }
  | { status: "skipped" }
  | { status: "error"; message: string };

const USELESS_KEYWORDS = [
  "image",
  "dall-e",
  "dalle",
  "tts",
  "whisper",
  "embedding",
  "embed-",
  "moderation",
  "transcribe",
  "realtime",
  "video",
  "veo-",
  "imagen",
  "lyria",
  "sora",
  "computer-use",
  "audio-only",
] as const;

export function isUselessModelId(id: string): boolean {
  if (!id || typeof id !== "string") return true;
  const lower = id.toLowerCase();
  return USELESS_KEYWORDS.some((kw) => lower.includes(kw));
}

function mapToOpenRouterId(
  provider: GcmgProviders,
  model: string,
): string | null {
  if (!model || typeof model !== "string") return null;
  const trimmed = model.trim();
  if (!trimmed) return null;

  if (provider === "OpenRouter") return trimmed;
  if (provider === "Custom OpenAI Based Provider") return null;
  if (trimmed.includes("/")) return trimmed;

  return `${provider.toLowerCase()}/${trimmed}`;
}

let memoryCache: ModelsCache | null = null;

async function readCache(): Promise<ModelsCache | null> {
  if (memoryCache && Date.now() - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache;
  }
  try {
    const raw = await fs.readFile(
      path.join(getConfigDirectory(), CACHE_FILE),
      "utf-8",
    );
    const data = JSON.parse(raw) as ModelsCache;
    if (
      !data ||
      typeof data.fetchedAt !== "number" ||
      !Array.isArray(data.models)
    ) {
      return null;
    }
    memoryCache = data;
    return data;
  } catch {
    return null;
  }
}

async function writeCache(cache: ModelsCache): Promise<void> {
  memoryCache = cache;
  try {
    const dir = getConfigDirectory();
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, CACHE_FILE),
      JSON.stringify(cache),
      "utf-8",
    );
  } catch {
    // non-fatal
  }
}

async function fetchModelsFromOpenRouter(): Promise<OpenRouterModel[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { data?: OpenRouterModel[] };
    if (!Array.isArray(json?.data)) return [];
    return json.data.filter((m) => m && typeof m.id === "string");
  } finally {
    clearTimeout(timer);
  }
}

export async function getLiveModels(force = false): Promise<OpenRouterModel[]> {
  const cached = await readCache();
  const isFresh =
    cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS && !force;

  if (isFresh) return cached.models;

  try {
    const models = await fetchModelsFromOpenRouter();
    if (models.length > 0) {
      await writeCache({ fetchedAt: Date.now(), models });
      return models;
    }
    return cached?.models ?? [];
  } catch {
    return cached?.models ?? [];
  }
}

export async function checkConfiguredModel(
  config: Config,
): Promise<ModelCheckResult> {
  if (!config?.model || !config?.provider) {
    return { status: "skipped" };
  }

  const openRouterId = mapToOpenRouterId(config.provider, config.model);
  if (!openRouterId) return { status: "skipped" };

  try {
    const models = await getLiveModels();
    if (models.length === 0) {
      return {
        status: "error",
        message: "Could not reach OpenRouter models API",
      };
    }

    const modelLower = config.model.trim().toLowerCase();
    const idLower = openRouterId.toLowerCase();

    const match = models.find((m) => {
      if (!m?.id) return false;
      const mid = m.id.toLowerCase();
      if (mid === idLower || mid === modelLower || mid.endsWith(`/${modelLower}`)) return true;
      const bare = mid.split(":")[0];
      return bare === idLower || bare.endsWith(`/${modelLower}`);
    });

    if (!match) {
      return { status: "not_found", openRouterId };
    }

    if (match.expiration_date) {
      const exp = new Date(match.expiration_date).getTime();
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      if (!Number.isNaN(exp) && exp < Date.now() + ninetyDays) {
        return {
          status: "deprecated",
          openRouterId: match.id,
          expiration: match.expiration_date,
          name: match.name,
          contextLength: match.context_length,
        };
      }
    }

    return {
      status: "ok",
      openRouterId: match.id,
      name: match.name,
      contextLength: match.context_length,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getFallbackContextLength(modelName: string): number {
  if (!modelName) return 32_768;
  const lower = modelName.toLowerCase();
  if (lower.includes("gemini")) return 1_000_000;
  if (lower.includes("claude")) return 200_000;
  if (
    lower.includes("gpt-4o") ||
    lower.includes("o1") ||
    lower.includes("o3") ||
    lower.includes("o4") ||
    lower.includes("gpt-5") ||
    lower.includes("llama-3") ||
    lower.includes("qwen") ||
    lower.includes("mistral") ||
    lower.includes("deepseek") ||
    lower.includes("gpt-4-turbo") ||
    lower.includes("gpt-4.1")
  ) {
    return 128_000;
  }
  if (lower.includes("gpt-3.5-turbo")) return 16_384;
  if (lower.includes("gpt-4")) return 8_192;
  return 32_768;
}

export async function getModelDiffLimit(config: Config): Promise<{
  contextTokens: number;
  maxDiffChars: number;
  isCustomOverride: boolean;
}> {
  if (process.env.GCMG_MAX_DIFF_CHARS) {
    const parsed = Number.parseInt(process.env.GCMG_MAX_DIFF_CHARS, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return {
        contextTokens: Math.floor(parsed / CHARS_PER_TOKEN),
        maxDiffChars: parsed,
        isCustomOverride: true,
      };
    }
  }

  let contextTokens = getFallbackContextLength(config.model);

  try {
    const check = await Promise.race([
      checkConfiguredModel(config),
      new Promise<ModelCheckResult>((res) =>
        setTimeout(() => res({ status: "skipped" }), 1500),
      ),
    ]);

    if (
      (check.status === "ok" || check.status === "deprecated") &&
      check.contextLength &&
      check.contextLength > 0
    ) {
      contextTokens = check.contextLength;
    }
  } catch {
    // fallback used
  }

  const usableTokens = Math.max(MIN_USABLE_TOKENS, Math.floor(contextTokens * 0.85) - 2000);
  const maxDiffChars = Math.floor(usableTokens * CHARS_PER_TOKEN);

  return {
    contextTokens,
    maxDiffChars,
    isCustomOverride: false,
  };
}

export async function notifyModelStatus(config: Config): Promise<void> {
  try {
    const result = await Promise.race([
      checkConfiguredModel(config),
      new Promise<ModelCheckResult>((resolve) =>
        setTimeout(
          () => resolve({ status: "error", message: "timeout" }),
          NOTIFY_BUDGET_MS,
        ),
      ),
    ]);

    switch (result.status) {
      case "not_found":
        console.log(
          chalk.yellow(
            `⚠  [${config.provider}] Model "${config.model}" is no longer available.`,
          ),
        );
        if (result.openRouterId && result.openRouterId !== config.model) {
          console.log(
            chalk.dim(
              `   Checked as ${result.openRouterId}. It may have been renamed or retired.`,
            ),
          );
        } else {
          console.log(
            chalk.dim(`   It may have been renamed or retired.`),
          );
        }
        console.log(
          chalk.dim(
            `   Run ${chalk.bold("gcmg config")} to pick a current model.`,
          ),
        );
        break;
      case "deprecated":
        console.log(
          chalk.yellow(
            `⚠  [${config.provider}] Model "${result.name ?? config.model}" is marked for deprecation` +
              (result.expiration ? ` (expires ${result.expiration})` : "") +
              ".",
          ),
        );
        console.log(
          chalk.dim(
            `   Consider switching with ${chalk.bold("gcmg config")}.`,
          ),
        );
        break;
      default:
        break;
    }
  } catch {
    // never break the CLI
  }
}

export async function getLiveProviderModels(
  force = false,
): Promise<Partial<Record<GcmgProviders, string[]>>> {
  const models = await getLiveModels(force);
  const now = Date.now();
  const byProvider: Record<string, { id: string; created: number }[]> = {};

  for (const m of models) {
    if (!m?.id || isUselessModelId(m.id)) continue;

    if (m.expiration_date) {
      const exp = new Date(m.expiration_date).getTime();
      if (!Number.isNaN(exp) && exp < now) continue;
    }

    const [provider, ...rest] = m.id.split("/");
    if (!provider || rest.length === 0) continue;

    const modelId = rest.join("/").split(":")[0]?.trim();
    if (!modelId || isUselessModelId(modelId)) continue;

    const key = provider.toLowerCase();
    if (!byProvider[key]) byProvider[key] = [];
    byProvider[key].push({ id: modelId, created: m.created ?? 0 });
  }

  const formatList = (items?: { id: string; created: number }[]) => {
    if (!items || items.length === 0) return [];
    const map = new Map<string, number>();
    for (const item of items) {
      const existing = map.get(item.id) ?? 0;
      if (item.created > existing) map.set(item.id, item.created);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .map(([id]) => id);
  };

  return {
    OpenAI: formatList(byProvider["openai"]),
    Anthropic: formatList(byProvider["anthropic"]),
    Google: formatList(byProvider["google"]),
    OpenRouter: [
      "openrouter/free",
      "openrouter/auto",
      ...formatList(byProvider["openrouter"]).filter(
        (id) => id !== "auto" && id !== "free",
      ),
    ],
  };
}
