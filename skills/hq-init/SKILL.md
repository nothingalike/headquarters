---
name: hq-init
description: Set up or refresh a project's headquarters memory through a short interactive questionnaire.
disable-model-invocation: true
---

Read [../hq/GUIDE.md](../hq/GUIDE.md) first for the layout and the writing rules.

Finding facts is your job; decisions and unwritten knowledge are the user's. Ask the user only what the repo can't tell you.

## 1. Scan

Resolve the project slug. If `~/.headquarters/<project-slug>/project.md` exists, read it: this run updates it.

Then gather everything the environment already knows:

- README, and `CLAUDE.md`/`AGENTS.md`
- manifests and build files (`package.json`, `*.csproj`, `*.sln`, `pyproject.toml`, `Cargo.toml`, `ProjectSettings/` for Unity, and so on)
- `.workspace/pm-toolbox.yml`: if present, the repo uses `pmt`. Note its item key and the `project/` path, and add `pm-toolbox` to Related.
- `git remote -v` and the default branch
- `docs/adr/`, if present

## 2. Show, then ask

Present what you found in a few lines. Then ask, in one numbered round, only the questions whose answers are still missing or look stale:

1. What is this project for, in a sentence or two?
2. How do you set it up, run it, and test it? Anything the README gets wrong or leaves out?
3. What does it depend on: other projects, tools, services, environments? Which of these have their own headquarters folder?
4. What should every agent know that isn't written down: quirks, gotchas, people to ask, conventions?
5. Where do stories and work items live, if not in `pmt`?

Offer your best guess alongside each question when you have one. Ask a follow-up round only if an answer opens something new.

## 3. Write `project.md`

Write or update `~/.headquarters/<project-slug>/project.md`:

```md
---
project: <project-slug>
repo: <absolute path to git root>
updated: <YYYY-MM-DD>
---

# <Project name>

<What it is and what it's for.>

## Related

- <project-slug>: <why it's related>

## Setup and run

<Only what the README and manifests don't already say; otherwise link them.>

## Stories

<Where they live and the ID key, e.g. "pmt, key SHOP, in project/".>

## Things to know

- <Affirmative guidance: what to do or rely on.>
```

Leave out sections with nothing to say. On an update, keep entries that are still true, and call out each one you changed or removed.

Finish by reporting the path and a one-line summary of what changed.
