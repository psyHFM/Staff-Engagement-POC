#!/usr/bin/env node
/*
 * surface_personas_on_apply.js — PreToolUse hook for the Skill tool.
 *
 * When a developer or the LLM invokes an OpenSpec *apply* skill
 * (`/opsx:apply` → `opsx:apply`, or the sibling `openspec-apply-change`),
 * this hook injects a reminder to consult the project personas in
 * `.claude/personas/` and the relevant ones for an implementation phase.
 *
 * It is NON-BLOCKING: it always exits 0. On a match it returns a
 * PreToolUse `additionalContext` payload (Claude Code feeds this back to the
 * model as context). On no match it prints nothing.
 *
 * Stdin (Claude Code PreToolUse contract):
 *   { tool_name: "Skill", tool_input: { skill: "<id>", args?: "..." }, cwd, ... }
 */
const fs = require('fs');
const path = require('path');

const APPLY_SKILLS = new Set(['opsx:apply', 'openspec-apply-change']);

// Curated relevance notes per persona for an implementation (apply) phase.
// Unknown personas found on disk are listed generically so this stays useful
// as new personas are added without requiring an edit here.
const RELEVANCE = {
  'constitution-guard.md':
    'Red-team the resulting diff against `.claude/constitution/*.yaml` before finishing the change.',
  'constitutional-backend-developer.md':
    'Primary implementer for backend tasks — Controller→Service→Repository, Lombok (no @Data), typed IDs, splice-aware.',
  'modular-monolith-architect.md':
    'Respect module boundaries, frozen contracts, and ArchUnit rules while implementing tasks.',
  'bdd-test-engineer.md':
    'Write BDD Given-When-Then unit tests for each task; drive toward PITest/Stryker mutation quality.',
  'angular-state-architect.md':
    'Use for frontend tasks only — Angular 22 Signals, unidirectional data flow, RxJS→Signal bridge.',
};

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try { if (process.stdin.isTTY) { finish(null); return; } } catch {}
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => finish(data || null));
    process.stdin.on('error', () => finish(null));
    setTimeout(() => finish(data || null), 1500);
  });
}

function listPersonas(cwd) {
  const dir = path.join(cwd, '.claude', 'personas');
  try { return fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort(); }
  catch { return []; }
}

function buildContext(personas) {
  const lines = [
    '## OpenSpec apply — consult project personas before implementing',
    '',
    'You are about to execute an OpenSpec change. Before writing code, read the relevant personas in `.claude/personas/` and follow them while you work. They encode the project\'s non-negotiable standards.',
    '',
    '### Personas to consult',
    '',
  ];
  if (personas.length === 0) {
    lines.push('- _(no persona files found in `.claude/personas/` — skipping)_');
  } else {
    for (const f of personas) {
      const note = RELEVANCE[f] || 'Consult for this change\'s relevant concerns.';
      lines.push(`- \`.claude/personas/${f}\` — ${note}`);
    }
  }
  lines.push('');
  lines.push('### Apply-phase checklist');
  lines.push('- Implement only within the change\'s owned folders; do not edit frozen `shared/**`, `master.yaml`, `application.yml`, or `pom.xml`.');
  lines.push('- Cross-module access goes through the frozen Service interfaces in `shared/api/` only.');
  lines.push('- Write a BDD Given-When-Then unit test for each unit of behaviour; keep ArchUnit boundary tests green.');
  lines.push('- Before marking the change done, red-team the diff with the Constitution Guard persona against `.claude/constitution/*.yaml`.');
  lines.push('');
  return lines.join('\n');
}

(async () => {
  const raw = await readStdin();
  let input = null;
  try { input = raw ? JSON.parse(raw) : null; } catch { process.exit(0); }
  if (!input) process.exit(0);

  const toolName = input.tool_name || (input.tool_input && input.tool_input.skill ? 'Skill' : null);
  const skill = input.tool_input && input.tool_input.skill;
  if (toolName !== 'Skill' || !skill || !APPLY_SKILLS.has(skill)) process.exit(0);

  const cwd = input.cwd || process.cwd();
  const personas = listPersonas(cwd);
  const ctx = buildContext(personas);

  // Structured PreToolUse context injection (non-blocking).
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      additionalContext: ctx,
    },
  }));
  process.exit(0);
})();