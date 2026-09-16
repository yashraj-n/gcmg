import chalk from "chalk";
import { getKeyActions } from "@/ui/keymap";

/**
 * Full key reference. Pulled from the shared keymap so it can never say
 * something the actual key handler doesn't do.
 */
export function renderHelpOverlay(
  ctx: { stagedOnly: boolean; yoloEnabled?: boolean } = { stagedOnly: true },
): string {
  const actions = getKeyActions(ctx);
  const keyCol = Math.max(...actions.map((a) => a.key.length)) + 2;

  const lines = [chalk.bold("gcmg — key reference"), ""];
  for (const action of actions) {
    lines.push(
      `  ${chalk.cyan.bold(action.key.padEnd(keyCol))} ${action.description}`,
    );
  }
  lines.push("");
  lines.push(chalk.dim("Press any key to return."));
  return lines.join("\n");
}
