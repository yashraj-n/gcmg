import { program } from "commander";
import { setupGcmg } from "./cmd/config";
import { ensureConfig } from "./misc/utils";
import { generateCommitMessage } from "./cmd/commit";
import { queryChat } from "./cmd/query-chat";
import pkg from "../package.json";

program.name(pkg.name).description(pkg.description).version(pkg.version);

program
  .argument(
    "[query...]",
    "Optional query to guide the generated commit message",
  )
  .option("-m, --context <text>", "Hint to guide the generated commit message")
  .option("-a, --all", "Diff/stage all changes instead of staged-only")
  .option("-p, --print", "Print the generated message and exit (no prompts)")
  .option("--dry-run", "Alias for --print")
  .description(
    "Generate a commit message based on the changes in the current directory (or your query)",
  )
  .action(async (queryParts: string[], opts: {
    context?: string;
    all?: boolean;
    print?: boolean;
    dryRun?: boolean;
  }) => {
    const query = queryParts?.length ? queryParts.join(" ") : undefined;
    await ensureConfig(async () => {
      if (query) {
        await queryChat(query);
      } else {
        await generateCommitMessage({
          hint: opts.context,
          all: opts.all,
          print: opts.print || opts.dryRun,
        });
      }
    });
  });

program
  .command("config")
  .description("Configure application settings")
  .action(async () => {
    await setupGcmg();
    program.help();
  });

program
  .command("help")
  .description("Show this help message")
  .action(() => program.help());

program.parse();
