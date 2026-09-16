/**
 * Shared constants used across the codebase.
 * Centralised here to prevent magic-number duplication and drift between files.
 */

/** Maximum number of message variants the user can cycle through. */
export const MAX_VARIANTS = 3;

/**
 * Approximate characters per LLM token — used to convert a context-length
 * (in tokens) into a safe maximum diff size (in characters).
 * 3.5 is a conservative estimate that works well for code diffs (mix of
 * identifiers, punctuation, whitespace).
 */
export const CHARS_PER_TOKEN = 3.5;

/**
 * Minimum usable token budget even when the model reports a tiny context.
 * Guards against accidentally truncating to an unusably small diff.
 */
export const MIN_USABLE_TOKENS = 1_000;

/** Rows visible in the CLI raw-mode file picker at one time. */
export const FILE_PICKER_PAGE_SIZE_CLI = 10;

/** Rows visible in the TUI inline file picker overlay at one time. */
export const FILE_PICKER_PAGE_SIZE_TUI = 8;
