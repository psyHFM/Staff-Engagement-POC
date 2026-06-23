#!/usr/bin/env node
/*
 * log_prompts.js — append the most recent prompt from the current Claude Code
 * session to Prompts.md in the project root, annotated with:
 *   - git author name (above the prompt)
 *   - model used
 *   - token usage (input / output / cache read / cache write / total)
 *
 * Runs two ways:
 *   1. As a Stop hook: Claude pipes hook JSON on stdin (includes transcript_path + cwd).
 *   2. As a skill helper: no stdin — falls back to finding the newest transcript
 *      for the current project under ~/.claude/projects/<slug>/.
 *
 * Dedup: a small state file records the last logged user-prompt line index per
 * transcript, so the same prompt is never logged twice (re-runs, double Stop fires).
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, '.log-prompts-state.json');

function safeJson(s) { try { return JSON.parse(s); } catch { return null; } }

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try { if (process.stdin.isTTY) { finish(null); return; } } catch {}
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => finish(data ? safeJson(data) : null));
    process.stdin.on('error', () => finish(null));
    setTimeout(() => finish(data ? safeJson(data) : null), 1500);
  });
}

function readState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } }
function writeState(s) { try { fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch {} }

function findTranscript(cwd) {
  const slug = cwd.replace(/[^A-Za-z0-9]/g, '-');
  const dir = path.join(os.homedir(), '.claude', 'projects', slug);
  let best = null, bestM = -1;
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.jsonl')) continue;
      const st = fs.statSync(path.join(dir, f));
      if (st.mtimeMs > bestM) { bestM = st.mtimeMs; best = path.join(dir, f); }
    }
  } catch {}
  return best;
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const t = content.find((b) => b && b.type === 'text');
    return t ? t.text : null;
  }
  return null;
}

function cleanPrompt(p) {
  return String(p)
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, '')
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, '')
    .trim();
}

// Text that marks a synthetic (non-human) user message we should never log.
// Claude Code injects these into the transcript as `user`-role messages:
//   - context-compaction summaries ("This session is being continued...")
//   - <command-message>/<command-name>/<system-reminder> wrappers
//   - tool_result blocks (no `text` block, so extractText returns null)
const SYNTHETIC_MARKERS = [
  'This session is being continued from a previous conversation',
];

function isSynthetic(text) {
  const t = cleanPrompt(text);
  if (!t) return true; // empty after stripping wrappers = not a real prompt
  return SYNTHETIC_MARKERS.some((m) => t.startsWith(m));
}

function parseTranscript(transcriptPath) {
  const raw = fs.readFileSync(transcriptPath, 'utf8').split('\n');
  let lastUserPrompt = null, lastAssistant = null, lastUserLine = -1;
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!line) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.type === 'user' && obj.message && obj.message.content) {
      const text = extractText(obj.message.content);
      // Skip synthetic messages (compaction summaries, wrapper-only, tool results).
      if (text && !isSynthetic(text)) {
        lastUserPrompt = text; lastUserLine = i;
      }
    } else if (obj.type === 'assistant' && obj.message) {
      lastAssistant = obj.message;
    }
  }
  return { lastUserPrompt, lastAssistant, lastUserLine };
}

(async () => {
  const input = await readStdin();
  const cwd = (input && input.cwd) || process.cwd();
  const explicit = input && input.transcript_path;

  let gitName = 'unknown';
  try {
    gitName = (execSync('git config user.name', { cwd, encoding: 'utf8' }) || '').trim() || 'unknown';
  } catch {}

  const transcriptPath = explicit || findTranscript(cwd);
  if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0);

  const { lastUserPrompt, lastAssistant, lastUserLine } = parseTranscript(transcriptPath);
  if (!lastUserPrompt || lastUserLine < 0) process.exit(0);

  const state = readState();
  if (state.transcript === transcriptPath && state.lastUserLine != null && lastUserLine <= state.lastUserLine) {
    process.exit(0); // already logged this prompt
  }

  const usage = (lastAssistant && lastAssistant.usage) || {};
  const model = (lastAssistant && lastAssistant.model) || 'unknown';
  const inTok = usage.input_tokens || 0;
  const outTok = usage.output_tokens || 0;
  const cacheRead = usage.cache_read_input_tokens || 0;
  const cacheWrite = usage.cache_creation_input_tokens || 0;
  const total = inTok + outTok + cacheRead + cacheWrite;

  // Local time as UTC+2 (project timezone) — avoid host locale variance.
  const ts = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace(/\..+$/, '');
  const fmt = (n) => Number(n).toLocaleString('en-US');
  const entry =
    `### ${gitName} — ${ts}\n` +
    `\n` +
    `> **Model:** \`${model}\`  \n` +
    `> **Tokens:** \`${fmt(inTok)}\` in / \`${fmt(outTok)}\` out · cache read \`${fmt(cacheRead)}\` / write \`${fmt(cacheWrite)}\` · **${fmt(total)} total**\n` +
    `\n` +
    `${cleanPrompt(lastUserPrompt)}\n\n`;

  const promptsFile = path.join(cwd, 'Prompts.md');
  if (!fs.existsSync(promptsFile)) {
    fs.writeFileSync(promptsFile, '# Prompts\n\nShared log of prompts across the team. Auto-appended by the `log-prompts` Stop hook.\n\n');
  }
  fs.appendFileSync(promptsFile, entry);

  writeState({ transcript: transcriptPath, lastUserLine });
})();