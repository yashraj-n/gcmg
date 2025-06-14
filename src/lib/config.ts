import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import z from "zod";

// Config validation schema
export const configSchema = z.object({
  name: z.string(),
  provider: z.string(),
  model: z.string(),
  apiKey: z.string(),
  prompts: z.object({
    commit: z.string(),
    help: z.string(),
  }),
});

export type Config = z.infer<typeof configSchema>;

export default class ConfigManager {
  // Singletone
  private static instance: ConfigManager;

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  // Vars
  private readonly configFolderName = "gcmg";

  private getConfigDirectory(): string {
    const homeDir = os.homedir();

    if (process.platform === "win32") {
      // Windows: Use the %APPDATA% directory
      return path.join(
        process.env.APPDATA || path.join(homeDir, "AppData", "Roaming"),
        this.configFolderName
      );
    } else if (process.platform === "darwin") {
      // macOS: Use ~/Library/Application Support
      return path.join(
        homeDir,
        "Library",
        "Application Support",
        this.configFolderName
      );
    } else {
      // Linux/Unix: Use ~/.config
      return path.join(
        process.env.XDG_CONFIG_HOME || path.join(homeDir, ".config"),
        this.configFolderName
      );
    }
  }

  private readonly configFileDir = path.join(
    this.getConfigDirectory(),
    ".gcmg-config"
  );

  public getConfigFileDir() {
    let dir = this.getConfigDirectory();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!this.doesConfigExists()) {
      fs.writeFileSync(this.configFileDir, "{}");
    }

    return this.configFileDir;
  }

  public doesConfigExists() {
    return fs.existsSync(this.configFileDir);
  }

  public saveConfig(config: Config) {
    const configFilePath = this.getConfigFileDir();
    fs.writeFileSync(configFilePath, JSON.stringify(config, null, 2));
    return configFilePath;
  }

  public getConfig(): Config {
    const configFilePath = this.getConfigFileDir();
    const config = fs.readFileSync(configFilePath, "utf8");
    return configSchema.parse(JSON.parse(config));
  }
}

