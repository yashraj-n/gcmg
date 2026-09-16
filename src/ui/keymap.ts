export type KeyGroup = "message" | "commit" | "meta";

export interface KeyAction {
  key: string;
  /** Short word shown on the button / key bar, e.g. "Copy". */
  label: string;
  /** Full sentence shown in the help panel / overlay. */
  description: string;
  group: KeyGroup;
  /** Only show this key when the predicate returns true (defaults to always). */
  when?: (ctx: { stagedOnly: boolean; yoloEnabled?: boolean }) => boolean;
}

export const KEY_ACTIONS: KeyAction[] = [
  {
    key: "c",
    label: "Copy",
    description: "Copy the current message variant to the system clipboard.",
    group: "message",
  },
  {
    key: "e",
    label: "Edit",
    description: "Edit the message in place (Ctrl+S to save, Esc to cancel).",
    group: "message",
  },
  {
    key: "r",
    label: "Regen",
    description: "Regenerate: ask the model for a fresh variant (replaces the current one once you have 3).",
    group: "message",
  },
  {
    key: "n",
    label: "Next",
    description: "Next variant — generates a new one on the fly if you haven't reached 3 yet.",
    group: "message",
  },
  {
    key: "p",
    label: "Prev",
    description: "Previous variant.",
    group: "message",
  },
  {
    key: "f",
    label: "Files",
    description: "Open file picker — toggle individual files staged/unstaged before committing.",
    group: "commit",
  },
  {
    key: "s",
    label: "Commit",
    description: "Commit the changes already staged with git. Disabled when nothing is staged.",
    group: "commit",
    when: (ctx) => ctx.stagedOnly,
  },
  {
    key: "a",
    label: "Stage all + Commit",
    description: "Stage every changed file, then commit with the current message.",
    group: "commit",
  },
  {
    key: "u",
    label: "Commit + Push",
    description: "Commit (staging everything first if needed) and push the current branch, setting upstream if missing.",
    group: "commit",
  },
  {
    key: "y",
    label: "Yolo OFF",
    description: "Yolo mode is OFF — press to enable: stage all + commit + push in one shot.",
    group: "commit",
    when: (ctx) => !ctx.yoloEnabled,
  },
  {
    key: "y",
    label: "Yolo ON",
    description: "Yolo mode is ON — press to execute stage-all + commit + push now (or press again to disable).",
    group: "commit",
    when: (ctx) => !!ctx.yoloEnabled,
  },
  {
    key: "d",
    label: "Dry-run",
    description: "Print the current message to the terminal and exit — nothing is staged or committed.",
    group: "meta",
  },
  {
    key: "h",
    label: "Help",
    description: "Toggle this help panel.",
    group: "meta",
  },
  {
    key: "q",
    label: "Quit",
    description: "Quit without committing (Esc and Ctrl+C do the same).",
    group: "meta",
  },
];

export function getKeyActions(ctx: { stagedOnly: boolean; yoloEnabled?: boolean }): KeyAction[] {
  return KEY_ACTIONS.filter((a) => (a.when ? a.when(ctx) : true));
}


