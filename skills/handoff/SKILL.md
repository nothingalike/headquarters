---
name: handoff
description: Write a handoff to headquarters so a fresh session can pick up this work.
argument-hint: "[story ID] [context for the next session]"
disable-model-invocation: true
---

Read [../hq/GUIDE.md](../hq/GUIDE.md) first for resolving the project and story, where knowledge goes, and the writing rules.

A handoff captures this session so a fresh one continues with a clear head, and it gives the user a moment to take stock of the work.

## 1. Resolve and gather

1. Resolve the project and story. The argument may hold a story ID, context for the next session (its focus, a story reference, a goal), or both. Treat any context as the lens for the whole handoff.
2. Rebuild what actually happened from evidence, not from memory alone. In a git repo, run `git status`, `git log` for this session's commits, and `git diff` (staged and unstaged). Confirm that the key files you plan to cite exist.
3. Read the story file, if there is one, so the handoff can link to it without repeating it.
4. Read the previous handoff in the same `handoffs/` folder, if any, so this one continues the trail.
5. Note any ADRs written during this session.

## 2. Update the story file

Apply the audience test from the guide to what this session produced. Write what a teammate needs into the story file: open questions into `## Questions`, plan changes into `## Plan`, a one-line progress row into `## Work History`. Leave the story's status alone. Keep this list of edits for the report.

Then bring the plate up to date, following [../plate/SKILL.md](../plate/SKILL.md): add this session's finished work, blockers, and questions that today's log doesn't have yet, and mark the story's plate item `[/]`. Keep these lines for the report too.

## 3. Write the handoff

Write `~/.headquarters/<project-slug>/stories/<ID>/handoffs/YYYY-MM-DD-HHMM-<slug>.md` (or under `general/`), using local time and a three-to-five-word slug of the session's focus. Create folders as needed.

```md
---
project: <project-slug>
story: <ID or "general">
datetime: <YYYY-MM-DD HH:MM>
branch: <branch>
commit: <short HEAD sha>
focus: <the argument's context, or a one-line focus>
previous: <filename of the previous handoff, if any>
---

# <Short title>

<TL;DR for the user: a few plain-language sentences on where things stand and what comes next.>

## Working on
## Accomplished
## Learned
## Decisions
## Open questions
## Next steps
## Key files
## Suggested skills
```

What each section holds:

- **Working on**: the goal and why it matters, linking the story file.
- **Accomplished**: what's done, backed by the git evidence (commits, changed files). Separate committed from uncommitted work.
- **Learned**: lessons as affirmative guidance, each one something the next agent can do or rely on.
- **Decisions**: "We chose X because Y." Link any ADRs written this session.
- **Open questions**: what's unresolved, and who or what it waits on.
- **Next steps**: ordered and concrete; the first one is where the next session starts.
- **Key files**: paths (with line numbers where useful) and one line on each file's role.
- **Suggested skills**: skills the next agent should invoke, and when.

Everything below the TL;DR is written for the next agent: dense, specific, paths over prose. Leave out any section with nothing to say.

## 4. Report

Print the TL;DR, the handoff's path, the list of story-file edits, and the plate lines written. Mention that `/pickup` resumes from it.
