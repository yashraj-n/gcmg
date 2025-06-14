import { generateText, LanguageModel, streamText } from "ai";
import ConfigManager, { Config } from "./config";
import chalk from "chalk";

export class LLmManager {
  private config: Config = ConfigManager.getInstance().getConfig();
  private static instance: LLmManager;

  public static getInstance() {
    if (!LLmManager.instance) {
      LLmManager.instance = new LLmManager();
    }
    return LLmManager.instance;
  }

  async _initializeModel(): Promise<LanguageModel> {
    const providerPkg = await import(this.config.provider);
    const creatorName = `create${this.config.name.replace(/\s/g, "")}`;
    const creator = providerPkg[creatorName];
    if (typeof creator !== "function") {
      throw new Error(`Invalid provider configuration for ${this.config.name}`);
    }
    return creator({
      apiKey: this.config.apiKey,
    })(this.config.model);
  }

  async testLLM(): Promise<boolean> {
    try {
      const llm = await this._initializeModel();
      await generateText({
        model: llm,
        prompt: ".",
        maxTokens: 1,
      });
      return true;
    } catch (error) {
      console.error(chalk.red("❌ Failed to test LLM:"));
      console.error(chalk.red(error));
      return false;
    }
  }

  async generateCommitMessage(diff: string): Promise<string> {
    const llm = await this._initializeModel();
    const result = await generateText({
      model: llm,
      prompt: `${this.config.prompts.commit}\n${diff}`,
    });
    return result.text.trim();
  }

  async generateQuery(query: string): Promise<AsyncIterable<string>> {
    const llm = await this._initializeModel();
    const result = streamText({
      model: llm,
      prompt: `${this.config.prompts.help}\n${query}`,
    });
    return result.textStream;
  }
}
