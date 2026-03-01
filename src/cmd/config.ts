import { testProvider } from "@/llm";
import { PROVIDER_MODELS } from "@/llm/models";
import { PROVIDERS } from "@/llm/provider";
import { Config, saveConfig } from "@/misc/config";
import { handlePromptExit } from "@/misc/utils";
import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";

export async function setupGcmg() {
  const { provider } = (await prompts([
    {
      type: "select",
      name: "provider",
      message: "Select your preferred AI provider",
      choices: PROVIDERS.map((p) => ({
        title: p,
        value: p,
      })),
      validate: (value) => {
        if (!PROVIDERS.includes(value)) {
          return "Invalid provider";
        }
        return true;
      },
    },
  ])) as { provider: (typeof PROVIDERS)[number] };
  let modelId = "";
  let providerBaseUrl: string | undefined;

  if (provider === "Custom OpenAI Based Provider") {
    const { model, baseUrl } = (await prompts([
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
    ])) as { model: string; baseUrl: string };
    modelId = model;
    providerBaseUrl = baseUrl;
  } else {
    const { model } = await prompts(
      [
        {
          type: "autocomplete",
          name: "model",
          message: "Select your preferred model",
          choices: PROVIDER_MODELS[provider].map((m: string) => ({
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

  const { apiKey } = await prompts([
    {
      type: "password",
      name: "apiKey",
      message: "Enter your API key",
    },
  ]);

  const config: Config = {
    apiKey: apiKey,
    model: modelId,
    provider: provider,
    extra: providerBaseUrl ? { baseUrl: providerBaseUrl } : undefined,
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
