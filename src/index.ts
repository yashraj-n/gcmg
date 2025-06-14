// @ts-expect-error Types are not availible
import args_parser from "args-parser";
import { configure } from "@/commands/configure";
import { generateCommitMessage } from "@/commands/commit-gen";
import chalk from "chalk";
import ConfigManager from "@/lib/config";
import { showHelp } from "@/commands/help";
import { editConfig } from "./commands/edit-config";
import { noConfig } from "./commands/no-config";
import { generateQueryCommand } from "./commands/query";

type ArgsType = {
  config: boolean;
  help: boolean;
  edit: boolean;
  [key: string]: boolean;
};

async function main() {
  const args: ArgsType = args_parser(process.argv);

  switch (true) {
    case args.config:
      await configure()
      break;
    case !ConfigManager.getInstance().doesConfigExists():
      noConfig();
      break;
    case args.help:
      showHelp();
      break;
    case args.edit:
      editConfig();
      break;
    default:
      const hasAdditionalArgs = process.argv.length > 2;

      if (hasAdditionalArgs) {
        await generateQueryCommand(process.argv.slice(2).join(" "));
        break;
      }
      await generateCommitMessage();
      console.log(chalk.green("👋 Goodbye!"));
      break;
  }
}

main().catch(console.error);
