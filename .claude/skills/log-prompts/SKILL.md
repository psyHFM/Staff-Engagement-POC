---
name: log-prompts
description: Use when the user wants to log prompts, asks about the prompt-logging setup, or wants to manually flush the latest prompt to their log. This skill documents the log-prompts Stop hook and can run it on demand.
---

# Log Prompts

Append prompts from the current Claude Code session to a per-developer file under `prompts/`. Each entry shows the **git author name** (header), the **model** used, **token usage** (input / output / cache read / cache write / total), and the prompt text.

Because every developer has their own file (e.g. `prompts/hendrik-muller.md`), concurrent work never creates merge conflicts in a shared prompt log.

## How it works

The actual work is done by `.claude/hooks/log_prompts.js` (Node). It reads the current session transcript, takes the most recent user prompt and the assistant turn that follows it (which carries `usage` + `model`), grabs `git config user.name`, and appends a formatted block to `prompts/<git-name>.md`.

**Automation (the normal path):** a `Stop` hook in `.claude/settings.json` runs the script after every assistant turn — so every prompt gets logged automatically, for every dev, into that dev's own file. No manual step.

**Manual flush:** run the script yourself to log the latest prompt right now:

```bash
node .claude/hooks/log_prompts.js
```

## Output format

```markdown
### <git name> — 2026-06-22 14:30:05

> **Model:** `<model id>`
> **Tokens:** `1,234` in / `567` out · cache read `8,900` / write `200` · **10,801 total**

<the prompt text>
```

The credits block (model + tokens) is a blockquote so it visually separates from the prompt text. Numeric values are code-formatted and thousand-separated for readability.

## File layout

- `prompts/<developer-slug>.md` — one file per developer, named after `git config user.name`.
- `prompts/` is committed and shared.
- `Prompts.md` at the project root is no longer used; it was migrated into per-developer files.

## Setup for the team

1. `.claude/hooks/log_prompts.js` — committed (ships to all devs).
2. `.claude/settings.json` — committed `Stop` hook entry (ships to all devs):
   ```json
   { "hooks": { "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node .claude/hooks/log_prompts.js" }] }] } }
   ```
3. `.gitignore` — ignores `.claude/hooks/.log-prompts-state.json` (dedup state is per-dev, must NOT be committed).
4. `prompts/*.md` — committed per-dev files; grow as the team works.
5. `.gitattributes` — applies `merge=union` to `prompts/*.md` to avoid rare conflicts.

## Rules

- The dedup state file (`.log-prompts-state.json`) is local per dev — never commit it.
- Each dev appends only to their own file. Never hand-edit another dev's entries.
- Git name comes from each dev's `git config user.name` — make sure it's set.
- If token usage shows `0 in / 0 out`, the assistant turn hadn't been written to the transcript when the hook fired; it'll catch the next prompt normally.

## Common Mistakes

- **Putting the hook in `settings.local.json`** — that file is personal/gitignored; other devs won't get it. Use committed `.claude/settings.json`.
- **Committing the state file** — causes cross-dev dedup collisions. Keep it gitignored.
- **Expecting the skill to auto-run** — skills run only when invoked; the Stop hook is what makes "every prompt" work.
- **Looking for `Prompts.md`** — that file has been removed; logs are now under `prompts/`.
