import fs from "fs/promises";
import os from "os";
import { PROVIDERS } from "@/llm/provider";
import { z } from "zod";
import path from "path";

export const configSchema = z.object({
  version: z.string().default("3.0.0"),
  provider: z.enum(PROVIDERS),
  apiKey: z.string(),
  model: z.string(),
  extra: z.optional(
    z.object({
      baseUrl: z.string(),
    }),
  ),
});

const configFileName = "gcmg-config.json";
export type Config = z.infer<typeof configSchema>;

function getConfigDirectory(): string {
  const homeDir = os.homedir();
  const appName = "gcmg";

  if (process.platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
      appName,
    );
  } else if (process.platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", appName);
  } else {
    return path.join(
      process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config"),
      appName,
    );
  }
}

export async function getConfig(): Promise<z.infer<
  typeof configSchema
> | null> {
  const configPath = path.join(getConfigDirectory(), configFileName);
  const config = await fs.readFile(configPath, "utf-8").catch(() => null);
  if (!config) {
    return null;
  }
  try {
    return configSchema.parse(JSON.parse(config));
  } catch (error) {
    console.warn("Failed to parse config file, creating new");
    return null;
  }
}

export async function saveConfig(config: Config) {
  const configPath = path.join(getConfigDirectory(), configFileName);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
