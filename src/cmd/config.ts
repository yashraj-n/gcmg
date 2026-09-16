import { testProvider } from "@/llm";
import { PROVIDER_MODELS } from "@/llm/models";
import { PROVIDERS } from "@/llm/provider";
import { Config, saveConfig } from "@/misc/config";
import { getLiveProviderModels } from "@/misc/model-status";
import { handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import pkg from "../../package.json";

export async function setupGcmg() {
  // ── UI mode preference (asked first, saved for future runs) ──────────
  const uiResult = await prompts(
    [
      {
        type: "select",
        name: "uiMode",
        message: "Preferred interactive UI",
        choices: [
          {
            title: "TUI",
            value: "tui",
          },
          {
            title: "CLI",
            value: "cli",
          },
        ],
        initial: 0,
      },
    ],
    { onCancel: handlePromptExit },
  );
  const uiMode = (uiResult?.uiMode as "tui" | "cli") || "tui";

  // ── Yolo mode preference ──────────────────────────────────────────────
  const yoloResult = await prompts(
    [
      {
        type: "confirm",
        name: "yolo",
        message:
          "Enable Yolo mode by default? (press [y] to stage all + commit + push in one shot)",
        initial: false,
      },
    ],
    { onCancel: handlePromptExit },
  );
  const yolo = Boolean(yoloResult?.yolo);

  const providerResult = await prompts(
    [
      {
        type: "select",
        name: "provider",
        message: "Select your preferred AI provider",
        choices: PROVIDERS.map((p) => ({
          title: p,
          value: p,
        })),
      },
    ],
    { onCancel: handlePromptExit },
  );
  const provider = providerResult?.provider as (typeof PROVIDERS)[number] | undefined;
  if (!provider || !PROVIDERS.includes(provider)) {
    console.log(chalk.red("No provider selected."));
    return;
  }

  let modelId = "";
  let providerBaseUrl: string | undefined;

  if (provider === "Custom OpenAI Based Provider") {
    const { model, baseUrl } = (await prompts(
      [
        {
          type: "text",
          name: "model",
          message: "Enter the Model ID",
        },
        {
          type: "text",
          name: "baseUrl",
          message: "Enter Base URL for your custom OpenAI provider",
        },
      ],
      { onCancel: handlePromptExit },
    )) as { model: string; baseUrl: string };
    modelId = model;
    providerBaseUrl = baseUrl;
  } else if (provider === "OpenRouter") {
    const { mode } = (await prompts(
      [
        {
          type: "select",
          name: "mode",
          message: "OpenRouter mode",
          choices: [
            {
              title: "Free  — openrouter/free (no credits)",
              value: "free",
            },
            {
              title: "Auto  — openrouter/auto (paid routing)",
              value: "auto",
            },
            {
              title: "Custom — enter any model ID",
              value: "custom",
            },
          ],
        },
      ],
      { onCancel: handlePromptExit },
    )) as { mode: "free" | "auto" | "custom" };

    if (mode === "free") {
      modelId = "openrouter/free";
    } else if (mode === "auto") {
      modelId = "openrouter/auto";
    } else {
      const { model } = (await prompts(
        [
          {
            type: "text",
            name: "model",
            message: "Model ID (e.g. meta-llama/llama-3.3-70b-instruct:free)",
            validate: (v: string) =>
              v.trim().length > 0 ? true : "Model ID is required",
          },
        ],
        { onCancel: handlePromptExit },
      )) as { model: string };
      modelId = model.trim();
    }
  } else {
    const liveSpinner = ora("Fetching latest models…").start();
    let modelChoices: string[] = PROVIDER_MODELS[provider] ?? [];
    try {
      const live = await getLiveProviderModels(true);
      const liveList = live[provider];
      if (liveList && liveList.length > 0) {
        modelChoices = liveList;
        liveSpinner.succeed(`Loaded ${liveList.length} live models`);
      } else {
        liveSpinner.info("Using built-in model list");
      }
    } catch {
      liveSpinner.info("Using built-in model list");
    }

    const { model } = await prompts(
      [
        {
          type: "autocomplete",
          name: "model",
          message: "Select your preferred model",
          choices: modelChoices.map((m: string) => ({
            title: m,
            value: m,
          })),
          suggest: async (input, choices) => {
            return choices.filter((c) =>
              c.title.toLowerCase().includes(input.toLowerCase()),
            );
          },
        },
      ],
      {
        onCancel: handlePromptExit,
      },
    );
    modelId = model;
  }

  const { apiKey } = await prompts(
    [
      {
        type: "password",
        name: "apiKey",
        message: "Enter your API key",
        validate: (v: string) =>
          v.trim().length > 0 ? true : "API key is required",
      },
    ],
    { onCancel: handlePromptExit },
  );

  if (!modelId?.trim() || !apiKey?.trim()) {
    console.log(chalk.red("Model ID and API key are required."));
    return;
  }

  const config: Config = {
    apiKey: String(apiKey).trim(),
    model: String(modelId).trim(),
    provider: provider,
    uiMode,
    yolo,
    extra: providerBaseUrl ? { baseUrl: String(providerBaseUrl).trim() } : undefined,
    version: pkg.version,
  };
  const spinner = ora("Testing provider...").start();
  try {
    await testProvider(config);
    spinner.succeed("Provider tested successfully");
    await saveConfig(config);
    console.log(
      chalk.cyan(`
 ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄ ▄▄▄      ▄▄▄  ▄▄▄▄▄▄▄
███▀▀▀▀▀  ███▀▀▀▀▀ ████▄  ▄████ ███▀▀▀▀▀
███       ███      ███▀████▀███ ███
███  ███▀ ███      ███  ▀▀  ███ ███  ███▀
▀██████▀  ▀███████ ███      ███ ▀██████▀
`),
    );
    console.log(
      chalk.green(
        `  Configuration saved (UI mode: ${uiMode.toUpperCase()}).\n  Run \`gcmg\` to generate a commit message.\n`,
      ),
    );
  } catch (error) {
    spinner.fail("Failed to test provider");
    const msg =
      error instanceof Error
        ? error.message
        : typeof error === "object" && error && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);

    // Surface common provider billing / auth errors cleanly
    if (/402|insufficient credits|never purchased credits/i.test(msg)) {
      console.log(chalk.red("\nOpenRouter: insufficient credits."));
      console.log(
        chalk.yellow(
          "  Your API key is valid, but this account has $0 balance.",
        ),
      );
      console.log(chalk.dim("  Fix one of:"));
      console.log(
        chalk.dim(
          "  1. Add credits: https://openrouter.ai/settings/credits",
        ),
      );
      console.log(
        chalk.dim(
          "  2. Re-run config and pick Free (openrouter/free), or a :free model ID:",
        ),
      );
      console.log(
        chalk.cyan(
          "       meta-llama/llama-3.3-70b-instruct:free",
        ),
      );
      console.log(
        chalk.cyan("       openrouter/free"),
      );
      console.log(
        chalk.dim(
          "  3. Or switch provider to Google / OpenAI / Anthropic with their own key.\n",
        ),
      );
      return;
    }
    if (/401|invalid.*api.?key|incorrect api key|user not found|MODEL_AUTHENTICATION/i.test(msg)) {
      console.log(chalk.red("\nAuthentication failed (401)."));
      console.log(chalk.dim("  Check your API key at https://openrouter.ai/settings/keys\n"));
      return;
    }
    console.log(chalk.red("\n" + msg.split("\n")[0] + "\n"));
    return;
  }
}
