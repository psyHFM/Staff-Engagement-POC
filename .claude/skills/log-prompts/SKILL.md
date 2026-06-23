---
name: log-prompts
description: Use when the user wants to log prompts to the shared Prompts.md, asks about the prompt-logging setup, or wants to manually flush the latest prompt to the team log. This skill documents the log-prompts Stop hook and can run it on demand.
---

# Log Prompts

Append prompts from the current Claude Code session to a shared, committed `Prompts.md` at the project root. Each entry shows the **git author name** (header), the **model** used, **token usage** (input / output / cache read / cache write / total), and the prompt text.

## How it works

The actual work is done by `.claude/hooks/log_prompts.js` (Node). It reads the current session transcript, takes the most recent user prompt and the assistant turn that follows it (which carries `usage` + `model`), grabs `git config user.name`, and appends a formatted block to `Prompts.md`.

**Automation (the normal path):** a `Stop` hook in `.claude/settings.json` runs the script after every assistant turn — so every prompt gets logged automatically, for every dev, into the same committed file. No manual step.

**Manual flush:** run the script yourself to log the latest prompt right now:

```bash
node .claude/hooks/log_prompts.js
```

## Output format

```markdown
### <git name> — 2026-06-22 14:30:05

- **Model:** <model id>
- **Tokens:** 1234 in / 567 out (cache read 8900, cache write 200) — 10801 total

<the prompt text>
```

## Setup for the team

1. `.claude/hooks/log_prompts.js` — committed (ships to all devs).
2. `.claude/settings.json` — committed `Stop` hook entry (ships to all devs):
   ```json
   { "hooks": { "Stop": [{ "matcher": "", "hooks": [{ "type": "command", "command": "node .claude/hooks/log_prompts.js" }] }] } }
   ```
3. `.gitignore` — ignores `.claude/hooks/.log-prompts-state.json` (dedup state is per-dev, must NOT be committed).
4. `Prompts.md` — committed; grows as the team works.

## Rules

- The dedup state file (`.log-prompts-state.json`) is local per dev — never commit it.
- `Prompts.md` is shared and committed; never hand-edit entries, never delete others' entries.
- Git name comes from each dev's `git config user.name` — make sure it's set.
- If token usage shows `0 in / 0 out`, the assistant turn hadn't been written to the transcript when the hook fired; it'll catch the next prompt normally.

## Common Mistakes

- **Putting the hook in `settings.local.json`** — that file is personal/gitignored; other devs won't get it. Use committed `.claude/settings.json`.
- **Committing the state file** — causes cross-dev dedup collisions. Keep it gitignored.
- **Expecting the skill to auto-run** — skills run only when invoked; the Stop hook is what makes "every prompt" work.