## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Interactive Full-Screen OpenTUI Mode**: Full-screen alternate terminal UI with flexbox layout, theme detection (OSC 10/11 dark/light palettes), inline message editing (`Ctrl+S` save, `Esc` cancel), and live status notes.
- **Single-Line Ungrouped Keybar & Footer**: Streamlined keybar in CLI mode and footer chips in TUI mode into a clean, responsive single line without redundant group headers.
- **Interactive Regeneration with Hints (`r`)**: Prompt for an optional guidance hint before re-querying the model in both TUI and CLI modes.
- **Interactive File Picker (`f`)**: Keyboard-driven staging checkbox list in both TUI and CLI (`↑`/`↓` / `k`/`j` to navigate, `Space` to toggle, `a` to toggle all, `Enter` to confirm). Staged files are updated, unstaged files are omitted from the diff, and the commit message is automatically regenerated for only the selected changes.
- **Yolo Mode (`y`, `--yolo`, `gcmg yolo`)**: Fast path that stages all files, generates a commit message, commits, and pushes in one shot. Pressing `y` in CLI or TUI toggles the mode ON/OFF, and persists the setting as a user preference in `gcmg-config.json`.
- **Automatic Git Repo Initialization Prompt**: When run inside a directory that is not a git repository, `gcmg` now offers to initialize git (`git init`) and start staging files instead of crashing with an error.
- **Multi-Variant Message Cycling (`n`/`p`)**: Generate and cycle between up to 3 commit message variants on demand.
- **Secret & Credential Scanner**: Scans diffs for accidentally committed AWS keys, GitHub tokens, OpenAI/Anthropic/Google credentials, and private keys.
- **Intelligent Diff Noise Filtering**: Automatically drops lockfiles (`bun.lock`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`), build outputs (`dist/`), images, and minified bundles from the diff sent to LLMs.
- **Cross-Platform Clipboard (`c`)**: Windows `clip.exe` (UTF-16LE), macOS `pbcopy`, Linux `xclip`/`xsel`, and clipboardy fallback.
- **OpenRouter Dynamic Context Budgeting**: Fetches live context window token limits and truncates oversized diffs at 85% capacity with clear warnings.

### Changed
- Refactored project architecture into modular subsystems: `src/git/`, `src/llm/`, `src/ui/`, `src/misc/`, and `src/cmd/`.
- Centralized shared configuration constants in `src/misc/constants.ts` (`MAX_VARIANTS`, `CHARS_PER_TOKEN`, `MIN_USABLE_TOKENS`, and file picker page sizes) to eliminate magic number duplication.
- Updated configuration wizard (`gcmg config`) to include interactive UI selection (`TUI` vs `CLI`), default Yolo mode preference, and dynamic package versioning from `package.json`.
- Optimized `getConfig` and `saveConfig` with process-level in-memory caching to prevent redundant disk I/O across sequential command phases.

### Fixed
- Fixed in-terminal CLI message editor: added dynamic cursor tracking, high-contrast visual block highlighting at the active edit point, full arrow-key multi-line navigation (`↑`/`↓`/`←`/`→`, `Home`, `End`), cursor-aware deletion (`Backspace`/`Delete`), live `[Line/Col]` status, and hardware cursor synchronization.
- Fixed keypress event listener re-attachment bug in CLI mode that could cause duplicate event processing.
- Fixed CLI screen padding calculation in `render()` to accurately align the bottom keybar without line overruns.
- Fixed potential duplicate tracking of renamed files in `src/git/stage.ts`.
- Fixed `renderHelpOverlay` to accurately display dynamic Yolo mode toggle status.
- Fixed dead code across the codebase: removed unused `getGroupedKeyActions` in `keymap.ts`, unused `buildChip` in `tui.ts`, unused `groupLabel` in palette, and dead provider fallback in `provider.ts`.
- Fixed duplicate dynamic imports of `collectDiff` and `filterNoiseFromDiff` in CLI file picker confirmation handler.
- Fixed TypeScript type error in `scripts/test-openrouter.ts` with updated configuration schema.
- Fixed diff generation on fresh repositories with zero previous commits using intent-to-add.

## [3.1.0] - 2026-09-02

- **Feature**: Add OpenRouter as a first-class provider with Auto (`openrouter/auto`) and custom model modes.
- **Feature**: Add live model discovery, 24-hour caching, model deprecation checks, and context-aware diff limits.
- **Fix**: Improve commit diff handling, including staged and unstaged changes and repositories without an initial commit.
- **Fix**: Create the config directory before writing `gcmg-config.json`.
- **Fix**: Improve structured LLM response handling, prompt cancellation, configuration validation, and push feedback.
- **Hardening**: Skip non-chat models and handle empty configuration, non-git repositories, empty responses, large diffs, and push failures.
- **Chore**: Simplify model generation and status handling, remove redundant code, and remove the obsolete `scripts/test-all.ts` smoke-test script.

## [3.0.1] - 2026-03-13

- **Refactor**: Dynamically load CLI metadata from `package.json`. (`bffe49b`)
- **Fix**: Improve commit command robustness and update LLM models. (`23de56f`)

## [3.0.0] - 2026-03-01

- **Refactor (breaking)**: Migrate from Vercel AI SDK to LangChain. (`c34d6e3`)
- **CI/Workflows**: Add and refine publish/build workflows and permissions. (`bbacf5b`, `a737e8a`, `c1beaf5`)

## [2.1.0] - 2025-12-08

- **Feature**: Update provider models and bump package version from `2.0.4` to `2.1.0`. (`a421255`)
- **Feature**: Add OpenRouter support and improve user experience (new provider, `git-msg` alias, jokes, improved model selection, docs cleanup). (`1a03ac4`)
- **Fix**: Improve temporary file handling and confirmation prompts. (`d4da50f`)

## [2.0.4] - 2025-10-24

- **Chore**: Bump version from `2.0.3` to `2.0.4`. (`0b55b2c`)
- **Fix**: Commit message file path and generation timestamp. (`09348be`)
- **Chore**: Update dependencies and generated models. (`14bd503`)

## [2.0.3] - 2025-08-15

- **Chore**: Bump package version to `2.0.3`. (`c3ac0c2`)
- **Chore**: Bump deps, regenerate lockfile & models, and tweak LLM token handling. (`f571128`)

## [2.0.2] - 2025-07-20

- **Chore**: Update package version from `2.0.1` to `2.0.2`. (`f309a16`)
- **Chore**: Update dependencies and regenerate models; improve commit message handling. (`a818cd1`)

## [2.0.1] - 2025-06-16

- **Chore**: Bump version to `2.0.1` and enhance git diff handling. (`12b9d43`)
- **Chore**: Update build script to use `tsx`. (`75b5b14`)
- **Fix**: Commit message quoting, push command execution, and logging; regenerate models. (`818f4d9`, `599ecf1`, `0c172f4`, `fa5fd8e`, `82881a0`)
- **Feature**: Refactor codebase and enhance features. (`b04ad45`)

## [1.0.1] - 2024-12-21

- **Chore**: Release `v1.0.1`. (`77e9637`)
- **Chore**: Add repository link to `package.json`. (`e6314a9`)

## [1.0.0] - 2024-12-21

- **Initial release**. (`21c5d9f`)