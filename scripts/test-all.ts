/**
 * Smoke tests for OpenRouter support + live model status checks.
 *
 *   npx tsx scripts/test-all.ts
 *
 * Optional live API test:
 *   OPENROUTER_API_KEY=sk-or-... npx tsx scripts/test-all.ts
 */

import { PROVIDERS, getProvider } from "../src/llm/provider";
import type { Config } from "../src/misc/config";
import { PROVIDER_MODELS } from "../src/llm/models";
import {
  checkConfiguredModel,
  getLiveModels,
  getLiveProviderModels,
  getModelDiffLimit,
  notifyModelStatus,
} from "../src/misc/model-status";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`ASSERT FAIL: ${msg}`);
}

async function main() {
  console.log("=== 1. PROVIDERS & baked-in models ===");
  assert(PROVIDERS.includes("OpenRouter"), "OpenRouter in PROVIDERS");
  assert(
    PROVIDER_MODELS["OpenRouter"]?.includes("openrouter/auto"),
    "openrouter/auto in PROVIDER_MODELS",
  );
  console.log("  PROVIDERS:", PROVIDERS.join(", "));
  console.log("  OpenRouter models:", PROVIDER_MODELS["OpenRouter"]);

  console.log("\n=== 2. getProvider constructs ChatOpenAI for OpenRouter ===");
  const autoCfg: Config = {
    version: "3.0.0",
    provider: "OpenRouter",
    apiKey: "sk-or-v1-dummy",
    model: "openrouter/auto",
  };
  const customCfg: Config = {
    version: "3.0.0",
    provider: "OpenRouter",
    apiKey: "sk-or-v1-dummy",
    model: "anthropic/claude-sonnet-4",
  };
  const p1 = getProvider("OpenRouter", autoCfg);
  const p2 = getProvider("OpenRouter", customCfg);
  assert(p1, "auto provider instance");
  assert(p2, "custom provider instance");
  console.log("  instances OK:", (p1 as any).constructor?.name);

  console.log("\n=== 3. Live OpenRouter models API (network) ===");
  const models = await getLiveModels(true); // force refresh
  assert(models.length > 50, `expected many models, got ${models.length}`);
  console.log(`  fetched ${models.length} models`);
  const hasAuto = models.some((m) => m.id === "openrouter/auto");
  console.log("  openrouter/auto present:", hasAuto);

  console.log("\n=== 4. getLiveProviderModels mapping ===");
  const liveMap = await getLiveProviderModels();
  console.log("  OpenAI count:", liveMap.OpenAI?.length ?? 0);
  console.log("  Anthropic count:", liveMap.Anthropic?.length ?? 0);
  console.log("  Google count:", liveMap.Google?.length ?? 0);
  assert((liveMap.OpenAI?.length ?? 0) > 5, "OpenAI live models");
  assert((liveMap.Anthropic?.length ?? 0) > 3, "Anthropic live models");

  console.log("\n=== 5. checkConfiguredModel (all providers) ===");
  const okOpenAI = await checkConfiguredModel({
    version: "3.0.0",
    provider: "OpenAI",
    apiKey: "x",
    model: liveMap.OpenAI![0],
  });
  console.log("  OpenAI:", liveMap.OpenAI![0], "→", okOpenAI.status);
  assert(
    okOpenAI.status === "ok" || okOpenAI.status === "deprecated",
    "OpenAI should resolve",
  );

  const okAnthropic = await checkConfiguredModel({
    version: "3.0.0",
    provider: "Anthropic",
    apiKey: "x",
    model: liveMap.Anthropic![0],
  });
  console.log("  Anthropic:", liveMap.Anthropic![0], "→", okAnthropic.status);
  assert(
    okAnthropic.status === "ok" || okAnthropic.status === "deprecated",
    "Anthropic should resolve",
  );

  const okGoogle = await checkConfiguredModel({
    version: "3.0.0",
    provider: "Google",
    apiKey: "x",
    model: liveMap.Google![0],
  });
  console.log("  Google:", liveMap.Google![0], "→", okGoogle.status);
  assert(
    okGoogle.status === "ok" || okGoogle.status === "deprecated",
    "Google should resolve",
  );

  const missing = await checkConfiguredModel({
    version: "3.0.0",
    provider: "OpenAI",
    apiKey: "x",
    model: "definitely-not-a-real-model-xyz-999",
  });
  console.log("  missing model status:", missing.status);
  assert(missing.status === "not_found", "should be not_found");

  const autoCheck = await checkConfiguredModel(autoCfg);
  console.log("  openrouter/auto status:", autoCheck.status);
  assert(
    autoCheck.status === "ok" || autoCheck.status === "deprecated",
    "auto should resolve",
  );

  console.log("\n=== 6. notifyModelStatus (prints warning for missing) ===");
  await notifyModelStatus({
    version: "3.0.0",
    provider: "OpenAI",
    apiKey: "x",
    model: "definitely-not-a-real-model-xyz-999",
  });

  console.log("\n=== 7. getModelDiffLimit dynamic context calculation ===");
  const geminiLimit = await getModelDiffLimit({
    version: "3.0.0",
    provider: "Google",
    apiKey: "x",
    model: "gemini-2.5-pro",
  });
  console.log(
    `  gemini-2.5-pro: context=${geminiLimit.contextTokens.toLocaleString()} tokens -> maxDiffChars=${geminiLimit.maxDiffChars.toLocaleString()} chars`,
  );
  assert(geminiLimit.maxDiffChars > 1_000_000, "Gemini diff limit > 1M chars");

  const claudeLimit = await getModelDiffLimit({
    version: "3.0.0",
    provider: "Anthropic",
    apiKey: "x",
    model: "claude-sonnet-4",
  });
  console.log(
    `  claude-sonnet-4: context=${claudeLimit.contextTokens.toLocaleString()} tokens -> maxDiffChars=${claudeLimit.maxDiffChars.toLocaleString()} chars`,
  );
  assert(claudeLimit.maxDiffChars > 300_000, "Claude diff limit > 300k chars");

  const gpt4Limit = await getModelDiffLimit({
    version: "3.0.0",
    provider: "OpenAI",
    apiKey: "x",
    model: "gpt-4",
  });
  console.log(
    `  gpt-4: context=${gpt4Limit.contextTokens.toLocaleString()} tokens -> maxDiffChars=${gpt4Limit.maxDiffChars.toLocaleString()} chars`,
  );
  assert(gpt4Limit.maxDiffChars < 50_000, "GPT-4 diff limit < 50k chars");

  console.log("\n=== 8. Optional live testProvider ===");
  const realKey = process.env.OPENROUTER_API_KEY;
  if (realKey) {
    const { testProvider } = await import("../src/llm");
    const live: Config = { ...autoCfg, apiKey: realKey };
    const res = await testProvider(live);
    console.log("  live reply:", JSON.stringify(res.content));
    console.log("  LIVE TEST PASSED");
  } else {
    console.log("  skipped (set OPENROUTER_API_KEY to run)");
  }

  console.log("\n✅ All smoke tests passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
