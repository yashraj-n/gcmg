# GCMG – In-Depth Implementation Plan

**Version:** 1.1  
**Date:** 2026-09-04  
**Goal:** Evolve GCMG from a simple linear yes/no CLI into a fast, keyboard-driven tool with **vim-style key bindings** shown at the bottom of the screen. Keep the experience lightweight and terminal-native. A full diny-style TUI is deferred as a **future option**.

This plan incorporates **all** features discussed:
- Staged-only default + optional stage-all
- Vim-style bottom key bar (primary interaction model)
- Multiple message variants + regenerate + edit + copy
- LazyVim-like editor experience when opening `$EDITOR`
- User hint (`-m` / `--context`)
- Noise filtering via `.gitignore` (+ smart extras)
- Secrets / sensitive-file warning
- Optional Git hook installer
- Dry-run / print-only mode
- Better push handling
- Local / OpenAI-compatible improvements (already partially present)
- Multiple commit message formats
- Secure key storage
- Changelog generation
- Multi-commit “compose / split” mode
- History context
- PR helpers (light)
- Yolo mode
- Full TUI as **future** enhancement

---

## 1. Current State Summary

| Area                    | Current Status                                      | Gap |
|-------------------------|-----------------------------------------------------|-----|
| CLI                     | Commander + linear prompts                          | Long chain of yes/no questions |
| Diff                    | `git diff HEAD` (staged + unstaged)                 | Aggressive stage-all, no filtering |
| LLM                     | LangChain (OpenAI, Anthropic, Google, OpenRouter, Custom) | Good foundation |
| Message UX              | One message → confirm add → commit → push           | No variants, no easy regenerate/edit/copy |
| Config                  | Global only, plain JSON                             | No keychain, limited options |
| Safety                  | Basic checks                                        | No secrets scan, weak push |
| Extra features          | Git Q&A chat                                        | Missing hooks, changelog, split, etc. |

---

## 2. Interaction Model (New Primary UX)

### 2.1 Vim-style Bottom Key Bar (Core Experience)

After generating the commit message(s), the terminal looks like this:

```
feat(auth): implement OAuth2 login flow

- Add Google and GitHub providers
- Store tokens securely
- Update user session handling

────────────────────────────────────────────────────────────
 Provider: OpenRouter · Model: anthropic/claude-sonnet-4 · Variant 1/3
────────────────────────────────────────────────────────────
 [c] Copy   [e] Edit   [r] Regenerate   [n] Next variant   [p] Prev
 [a] Stage all + Commit   [s] Commit staged   [u] Commit + Push
 [f] File picker   [d] Dry-run   [y] Yolo   [?] Help   [q] Quit
────────────────────────────────────────────────────────────
```

**Key principles**:
- Keys are always visible at the bottom (like vim, lazygit, or ranger).
- Single letter (or Ctrl+) shortcuts — no arrow-key menus required.
- The main content (message) stays clean and readable.
- Status line shows provider, model, current variant, and any warnings.
- Works perfectly in any terminal, SSH, tmux, etc.
- Extremely fast to use once muscle memory kicks in.

**Recommended key map** (can be made configurable later):

| Key | Action |
|-----|--------|
| `c` | Copy message to clipboard |
| `e` | Open in `$EDITOR` (LazyVim-style) |
| `r` | Regenerate current variant |
| `n` / `p` | Next / Previous variant |
| `a` | Stage all + Commit |
| `s` | Commit only what is already staged |
| `u` | Commit + Push |
| `f` | Simple file picker (stage/unstage) |
| `d` | Dry-run (print and exit) |
| `y` | Yolo (stage all + commit + push with minimal confirm) |
| `?` | Show full help overlay |
| `q` / `Esc` / `Ctrl+C` | Quit |

Ctrl combinations can be added for power users (e.g. `Ctrl+x` for quit, `Ctrl+s` for commit, etc.) if desired.

### 2.2 LazyVim-like Editor Experience

When the user presses `e`:

1. The current message is written to a temporary file.
2. `$EDITOR` (or `GIT_EDITOR` / `VISUAL`) is opened.
3. A short help footer is injected or shown (if the editor supports it), or we print a clear message before launching:

```
Opening editor...
  :wq / ZZ  → save and return
  :q!       → discard changes
  Useful: edit the message freely, then save & quit
```

4. After the editor closes, GCMG re-reads the file and returns to the main screen with the updated message and the same bottom key bar.
5. If the user wants a more guided experience, we can later detect popular editors (nvim, vim, helix, etc.) and pass flags or use a lightweight wrapper, but the default is pure `$EDITOR` for maximum compatibility.

This gives a familiar “LazyVim / vim” feeling without forcing a specific editor.

### 2.3 Full TUI (Future Option)

A rich diny-style full-screen TUI (boxes, arrow-key menus, themes, file picker panels, etc.) is explicitly marked as a **future enhancement**.  
It can be added later behind a flag (`gcmg --tui`) or config option once the vim-style flow is solid and popular.

---

## 3. High-Level Architecture Changes

### 3.1 Tech Stack Additions

- **Keyboard handling**: Use `readline` + raw mode, or a lightweight library such as `keypress` / `readline-sync` / custom raw stdin, or `ink` only for the bottom bar if needed. Prefer minimal dependencies.
- **Clipboard**: `clipboardy`
- **Gitignore parsing**: `ignore` (npm)
- **Keychain** (optional): `keytar`
- **No heavy TUI framework required** for the main path.

### 3.2 Proposed Directory Structure

```
src/
├── cli.ts
├── index.ts
├── cmd/
│   ├── commit.ts          # Main flow + key loop
│   ├── config.ts
│   ├── query-chat.ts
│   ├── hook.ts
│   ├── changelog.ts
│   └── yolo.ts
├── ui/                    # Lightweight UI helpers (NOT full TUI)
│   ├── keybar.ts          # Renders the bottom key bar + status
│   ├── messageView.ts     # Pretty-prints the commit message
│   ├── help.ts            # ? help overlay
│   └── editor.ts          # Launch $EDITOR with LazyVim-like hints
├── git/
│   ├── diff.ts
│   ├── stage.ts
│   ├── commit.ts
│   └── push.ts
├── llm/
├── misc/
│   ├── config.ts
│   ├── prompt.ts
│   ├── secrets.ts
│   ├── ignore.ts
│   └── utils.ts
└── hooks/
    └── prepare-commit-msg.sh
```

---

## 4. Feature-by-Feature Implementation Plan

### 4.1 Core Commit Flow with Vim-style Keys

1. Collect diff (staged-only by default).
2. Apply `.gitignore` + noise filtering + secrets scan.
3. Generate 1–3 message variants.
4. Enter the **interactive key loop**:
   - Clear / redraw message + status + bottom key bar.
   - Wait for a single keypress.
   - Execute the mapped action.
   - Redraw or exit.
5. Non-TTY / CI environments automatically fall back to `--print` behaviour.

### 4.2 Diff Handling

- **Default**: only staged changes (`git diff --cached`).
- Optional `--all` or key `a` to stage everything.
- Parse `.gitignore` (and nested) with the `ignore` package.
- Extra hard-coded noise rules (lockfiles, `dist/`, binaries, etc.).
- Secrets scanner → prominent warning in the status area + extra confirmation.
- Keep existing smart truncation based on model context.

### 4.3 Message Generation

- Multiple formats (conventional, conventional+body, plain, gitmoji, …) via config.
- User hint: `gcmg -m "fix race condition"` or `--context`.
- Generate up to 3 variants.
- Strong Zod validation on the LLM response.

### 4.4 Actions (via bottom keys)

| Key | Action | Notes |
|-----|--------|-------|
| `c` | Copy | Uses clipboardy, shows brief “Copied!” feedback |
| `e` | Edit | LazyVim-style $EDITOR experience |
| `r` | Regenerate | Can later accept free-text feedback |
| `n`/`p` | Next/Prev variant | Cycle through generated messages |
| `s` | Commit staged | Safe default |
| `a` | Stage all + Commit | Explicit |
| `u` | Commit + Push | Smart push logic |
| `f` | File picker | Simple checkbox list (can be basic) |
| `d` | Dry-run | Print and exit |
| `y` | Yolo | Fast path |
| `?` | Help | Overlay with full key list |
| `q` | Quit | Clean exit |

### 4.5 Git Hook Installer

- `gcmg hook install` / `uninstall`
- Installs a `prepare-commit-msg` hook that calls `gcmg --print --non-interactive` when no message is supplied.
- Clear documentation so users understand: “After installing the hook, normal `git commit` will automatically get an AI message.”

### 4.6 Additional Commands

- `gcmg` / `gcmg commit` → main key-driven flow
- `gcmg -m "..."` → with hint
- `gcmg --print` / `--dry-run`
- `gcmg --all`
- `gcmg yolo`
- `gcmg hook install|uninstall`
- `gcmg changelog [from] [to]`
- `gcmg config`
- Existing `gcmg <question>` chat remains

### 4.7 Configuration

- Global config (keep current location).
- New options: `format`, `variants` (1-3), `autoStage`, `includeHistory`, theme (for future), etc.
- Prefer OS keychain for API keys (`keytar`), with plain JSON fallback + warning.

### 4.8 Push Improvements

- Detect upstream.
- Offer to set upstream if missing.
- Block force-push to main/master by default.
- Clear success/error feedback.

### 4.9 Other Features

- **Changelog**: AI-generated Keep-a-Changelog between two refs.
- **Multi-commit split**: Later phase – analyse diff and propose logical commits.
- **History context**: Optionally inject recent commit messages into the prompt.
- **Local models**: Improve discoverability of the existing Custom OpenAI provider (Ollama / LM Studio presets).

---

## 5. Implementation Phases

### Phase 0 – Preparation
- Add dependencies (`clipboardy`, `ignore`, optional `keytar`).
- Create `ui/` helpers for keybar, message view, editor launcher.
- Refactor current commit flow into testable pieces.

### Phase 1 – Core Vim-style Experience (Highest Priority)
1. Staged-only diff + `.gitignore` filtering + secrets warning.
2. Generate message(s).
3. Implement the bottom key bar + key loop (`c e r n p s a u d q ?`).
4. Copy, Edit ($EDITOR), Regenerate, Commit variants, Dry-run.
5. `-m` / `--context` and `--print` flags.
6. Update README with screenshots of the new key bar.

**Deliverable**: A fast, keyboard-driven tool that already feels modern.

### Phase 2 – Safety, Hooks & Polish
- Git hook installer.
- Better push logic.
- Yolo mode.
- Keychain support.
- Multiple message formats.
- File picker (basic).
- Help overlay (`?`).

### Phase 3 – Power Features
- Multi-commit compose/split.
- Changelog command.
- History context.
- More advanced editor integration if needed.

### Phase 4 – Future
- Optional full diny-style TUI (`--tui` or config flag).
- Themes, richer file picker, timeline, etc.

---

## 6. Technical Notes & Risks

- **Raw key reading**: Must handle non-TTY gracefully (CI, pipes) → auto `--print`.
- **Editor experience**: Never assume a specific vim config; always work with plain `$EDITOR`.
- **Redrawing**: Keep the key bar stable; avoid excessive screen clearing that causes flicker.
- **Windows support**: Test key handling and clipboard carefully.
- **Bundle size**: Stay lightweight — no heavy React/Ink dependency on the main path.

---

## 7. Success Metrics

- Users can copy / edit / regenerate / commit with a single keypress.
- Bottom key bar is always visible and self-documenting.
- Opening the editor feels familiar (LazyVim-like hints).
- No accidental commits of ignored or secret files.
- Hook users can keep using plain `git commit`.
- The tool stays fast and works over SSH/tmux.

---

## 8. Documentation Deliverables

- Updated README with clear key-bar example.
- `docs/KEYS.md` – full key reference.
- `docs/HOOKS.md` – simple explanation of the prepare-commit-msg hook.
- `docs/EDITOR.md` – how the LazyVim-style edit flow works.
- Migration notes from the old linear prompts.

---

## Summary of Decisions

| Topic                    | Decision |
|--------------------------|----------|
| Primary UI               | Vim-style bottom key bar |
| Editor                   | Native `$EDITOR` + LazyVim-like helpful hints |
| Full TUI (diny-style)    | Future option only |
| Diff default             | Staged only |
| Noise filtering          | `.gitignore` + smart extras |
| Secrets                  | Warning + confirmation |
| Hook                     | Optional installer |
| Variants                 | Up to 3, switchable with `n`/`p` |
| Copy / Edit / Regenerate | First-class single keys |

This plan keeps GCMG fast, terminal-native, and easy to learn while delivering all the useful features we discussed. The vim-style key bar gives power and speed without the complexity of a full TUI.
