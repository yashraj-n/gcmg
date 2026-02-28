import { program } from "commander";
import { setupGcmg } from "./cmd/config";
import { ensureConfig } from "./misc/utils";
import { generateCommitMessage } from "./cmd/commit";
import { queryChat } from "./cmd/query-chat";

program
  .name("gcmg")
  .description("Generate commit messages based on your changes or query")
  .version("3.0.0");

program
  .argument(
    "[query...]",
    "Optional query to guide the generated commit message",
  )
  .description(
    "Generate a commit message based on the changes in the current directory (or your query)",
  )
  .action(async (queryParts: string[]) =>
    ensureConfig(async () => {
      const query = queryParts?.length ? queryParts.join(" ") : undefined;
      if (query) {
       await queryChat(query);
      } else {
        await generateCommitMessage();
      }
    }),
  );

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
