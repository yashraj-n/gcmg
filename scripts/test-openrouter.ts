/**
 * Quick smoke test for OpenRouter provider wiring.
 * Run: npx tsx scripts/test-openrouter.ts
 *
 * Does NOT call the real API (no key required for this check).
 * For a live test, set OPENROUTER_API_KEY and uncomment the invoke block.
 */

import { getProvider, PROVIDERS } from "../src/llm/provider";
import type { Config } from "../src/misc/config";
import { PROVIDER_MODELS } from "../src/llm/models";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`ASSERT: ${msg}`);
}

async function main() {
  console.log("PROVIDERS includes OpenRouter:", PROVIDERS.includes("OpenRouter"));
  assert(PROVIDERS.includes("OpenRouter"), "OpenRouter missing from PROVIDERS");

  assert(
    Array.isArray(PROVIDER_MODELS["OpenRouter"]) &&
      PROVIDER_MODELS["OpenRouter"].includes("openrouter/auto"),
    "PROVIDER_MODELS.OpenRouter should contain openrouter/auto",
  );

  const autoConfig: Config = {
    version: "3.0.0",
    provider: "OpenRouter",
    apiKey: "sk-or-v1-test-dummy",
    model: "openrouter/auto",
  };

  const customConfig: Config = {
    version: "3.0.0",
    provider: "OpenRouter",
    apiKey: "sk-or-v1-test-dummy",
    model: "anthropic/claude-sonnet-4",
  };

  const autoProvider = getProvider("OpenRouter", autoConfig);
  const customProvider = getProvider("OpenRouter", customConfig);

  console.log(
    "Auto provider constructed:",
    autoProvider?.constructor?.name ?? typeof autoProvider,
  );
  console.log(
    "Custom provider constructed:",
    customProvider?.constructor?.name ?? typeof customProvider,
  );

  // Optional live test — only if real key is present
  const realKey = process.env.OPENROUTER_API_KEY;
  if (realKey) {
    console.log("\nOPENROUTER_API_KEY detected — running live testProvider...");
    const { testProvider } = await import("../src/llm");
    const liveConfig: Config = {
      ...autoConfig,
      apiKey: realKey,
    };
    const result = await testProvider(liveConfig);
    console.log("Live response content:", result.content);
    console.log("Live test PASSED");
  } else {
    console.log("\nNo OPENROUTER_API_KEY env — skipped live call.");
    console.log(
      "To live-test: OPENROUTER_API_KEY=sk-or-... npx tsx scripts/test-openrouter.ts",
    );
  }

  console.log("\nAll static OpenRouter checks passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
