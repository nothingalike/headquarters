---
name: hq-setup
description: One-time machine setup for headquarters, covering your working preferences and the pointers that let every agent find it.
disable-model-invocation: true
---

Read [../hq/GUIDE.md](../hq/GUIDE.md) first for the layout and the writing rules.

This runs once per machine, and again whenever the user wants to revise their preferences. Each step is idempotent: detect what already exists and change only what's missing or outdated.

## 1. Create or clone headquarters

Ask whether the user already keeps headquarters in a git remote, from another machine.

- **Yes, and `~/.headquarters` doesn't exist**: clone it with sparse checkout, then ask which projects this machine works on and check out those plus the shared folders, as the guide's "Syncing between machines" describes:

  ```bash
  git clone --sparse <remote> ~/.headquarters
  git -C ~/.headquarters sparse-checkout set plate notes <project-slug> ...
  ```

  `me.md` then already exists, so step 2 reviews it instead of asking from scratch.
- **No**: create `~/.headquarters` if it doesn't exist. Offer to make it a git repo for syncing later: `git init`, the guide's `.gitignore`, and a private remote the user creates. Leave the first commit and push to the user, or to `/hq sync`.

## 2. Write `me.md`

`~/.headquarters/me.md` holds the user's working preferences across every project and agent. Every agent loads it at session start, so keep it short and let each line change behaviour.

If `me.md` exists, show its current entries and ask what to add, change, or remove. Otherwise, ask in one numbered round:

1. How should agents handle git: commit on their own, or leave commits and pushes to you after review?
2. How should agents report what they changed: every write, a summary at the end, or only on request?
3. How do you want guidance written for agents (skills, docs, memory)?
4. What conventions do you follow (branch names, story tracking, tools) that agents should honour or flag when broken?
5. What else should every agent know about how you like to work?

Offer your best guess alongside each question when you have one. Write each preference as affirmative guidance with its reason, grouped under `# Working preferences`.

## 3. Point agents at headquarters

For each agent config directory that exists, add a `## Headquarters` section to its user-level instructions file, or refresh the section if it's already there. Leave the rest of the file untouched.

- **Claude Code**, `~/.claude/CLAUDE.md`:

  ```md
  ## Headquarters

  Shared memory for projects and stories lives in `~/.headquarters`. Use the `hq` skill to recall or record what was learned; its GUIDE.md says where each kind of knowledge goes.

  @~/.headquarters/me.md
  ```

  Tell the user that Claude Code asks once to approve the external `@` import, and that approving it is what loads `me.md`.

- **Codex**, `~/.codex/AGENTS.md`. It has no import syntax, so name the file instead:

  ```md
  ## Headquarters

  Shared memory for projects and stories lives in `~/.headquarters`. Use the `hq` skill to recall or record what was learned; its GUIDE.md says where each kind of knowledge goes. Read `~/.headquarters/me.md` at the start of every session: it holds the user's working preferences.
  ```

For any other agent config directory you find, show the user the Codex wording and ask where that agent reads user-level instructions.

## 4. Report

List every file created or changed. Close by suggesting `/hq-init` inside each project the user works on.
