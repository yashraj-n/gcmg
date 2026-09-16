import fs from "fs/promises";
import os from "os";
import { PROVIDERS } from "@/llm/provider";
import { z } from "zod";
import path from "path";

export const configSchema = z.object({
  version: z.string().default("3.1.0"),
  provider: z.enum(PROVIDERS),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  /** Preferred interactive UI: full-screen OpenTUI or lightweight CLI key-bar. */
  uiMode: z.enum(["tui", "cli"]).default("tui"),
  /**
   * Yolo mode preference. When true, pressing [y] stages every file, commits,
   * and pushes in one shot without extra confirmation. Toggle with [y] — the
   * new value is persisted automatically so it carries across sessions.
   */
  yolo: z.boolean().default(false),
  extra: z
    .object({
      baseUrl: z.string().min(1),
    })
    .optional(),
});

const configFileName = "gcmg-config.json";
export type Config = z.infer<typeof configSchema>;

export function getConfigDirectory(): string {
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

let cachedConfig: Config | null = null;

export async function getConfig(forceRefresh = false): Promise<Config | null> {
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }
  const configPath = path.join(getConfigDirectory(), configFileName);
  const config = await fs.readFile(configPath, "utf-8").catch(() => null);
  if (!config) {
    return null;
  }
  try {
    const parsed = JSON.parse(config);
    cachedConfig = configSchema.parse(parsed);
    return cachedConfig;
  } catch {
    console.warn("Failed to parse config file, treating as missing");
    return null;
  }
}

export async function saveConfig(config: Config) {
  cachedConfig = config;
  const dir = getConfigDirectory();
  await fs.mkdir(dir, { recursive: true });
  const configPath = path.join(dir, configFileName);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}
