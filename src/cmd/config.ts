import { testProvider } from "@/llm";
import { PROVIDER_MODELS } from "@/llm/models";
import { PROVIDERS } from "@/llm/provider";
import { Config, saveConfig } from "@/misc/config";
import { getLiveProviderModels } from "@/misc/model-status";
import { handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";

export async function setupGcmg() {
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
              title: "Auto (openrouter/auto — smart model selection)",
              value: "auto",
            },
            {
              title: "Custom model (enter any OpenRouter model ID)",
              value: "custom",
            },
          ],
        },
      ],
      { onCancel: handlePromptExit },
    )) as { mode: "auto" | "custom" };

    if (mode === "auto") {
      modelId = "openrouter/auto";
    } else {
      const { model } = (await prompts(
        [
          {
            type: "text",
            name: "model",
            message:
              "Enter OpenRouter model ID (e.g. anthropic/claude-sonnet-4, openai/gpt-4o, google/gemini-2.5-pro)",
            validate: (v: string) =>
              v.trim().length > 0 ? true : "Model ID is required",
          },
        ],
        { onCancel: handlePromptExit },
      )) as { model: string };
      modelId = model.trim();
    }
  } else {
    // Prefer live OpenRouter catalog (cached 24h); fall back to baked-in list
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
    extra: providerBaseUrl ? { baseUrl: String(providerBaseUrl).trim() } : undefined,
    version: "3.0.0",
  };
  const spinner = ora("Testing provider...").start();
  try {
    await testProvider(config);
    spinner.succeed("Provider tested successfully");
    await saveConfig(config);
    console.log(
      chalk.dim(`                                          
 ▄▄▄▄▄▄▄   ▄▄▄▄▄▄▄ ▄▄▄      ▄▄▄  ▄▄▄▄▄▄▄  
███▀▀▀▀▀  ███▀▀▀▀▀ ████▄  ▄████ ███▀▀▀▀▀  
███       ███      ███▀████▀███ ███       
███  ███▀ ███      ███  ▀▀  ███ ███  ███▀ 
▀██████▀  ▀███████ ███      ███ ▀██████▀  
                                        
                                          
    `),
    );
  } catch (error) {
    spinner.fail("Failed to test provider");
    console.error("Failed to test provider", error);
    return;
  }
}
