---
name: review
description: Explain a finished slice of work to the user before they commit, as an HTML report with what changed, why, and links to each file and line. Use when a slice of work is ready for the user to review before committing, or when the user asks what was done or why.
argument-hint: "[scope, e.g. 'since main' or 'last 3 commits']"
---

Read [../hq/GUIDE.md](../hq/GUIDE.md) first for resolving the project and story, where knowledge goes, and the writing rules.

The report lets the user review the work and the code in one pass before committing. It reads like an outcome report: sections about behaviour, each a short plain-language explanation. Every claim is anchored to the code by a link that opens VS Code at the line, so the user reads code in their editor and the page stays readable. It moves the story's workflow from working to in review.

## 1. Resolve the scope

1. Resolve the project and story.
2. Pick the scope:
   - **Argument given**: use it (`since main` → `git diff main...HEAD` plus uncommitted work; `last 3 commits` → `HEAD~3`).
   - **Uncommitted work exists**: everything not yet committed, meaning `git diff HEAD` plus untracked files from `git status`.
   - **Otherwise**: commits made since the newest report in this story's `reviews/` folder (its `datetime`), plus any uncommitted work. With no earlier report, ask the user what to cover.
3. Record the scope in one line, including the base commit, for the report.

## 2. Understand the work

Read the full diff for the scope, and read enough of each changed file to explain it. Use the conversation for the *why*: what the user asked for, the reasoning behind each choice, anything tried and adjusted.

Organise the work into **sections by behaviour**: what the system or the user now experiences ("A restart resumes only the unfinished imports"), not which files moved. **Order the sections by where the user's judgement matters most**: the riskiest, least verified, or most surprising first, and routine changes last. The page numbers sections in that order and says so, so the order itself tells the user where to start. For each section:

- **Attention**: for the one to three sections that most need the user's eye, one sentence on exactly what to check.
- **Size**: lines added and removed and files touched, summed from `git diff --numstat` over the section's files (count untracked files' lines as added).
- **Body**: a short paragraph on what changed and why, in plain language.
- **How it's built**: a list of claims, each a short sentence tied to the file and line range that carries it. Take line numbers from the new side of each diff hunk. Every changed code file appears under some section.
- **Snippet**: at most one per section, 20 lines or fewer, verbatim from the file, and only when the lines themselves are the point (a condition, a query, a signature). Most sections have none; the links carry the reader to the code.
- **Proven by**: the tests that exercise this behaviour, each linked to its test.
- **Screenshots**: when the section changes something visible, a before/after pair. Capture with the project's browser tooling (`project.md` says which). Use captures taken earlier in the session for "before", or the base commit in a separate worktree. With no "before" available, show "after" alone.

Story and tracker files go in **Also changed**, not in a section. Changes that serve another goal (a bug fixed along the way, a rename, a dependency bump) go in **side changes**, so nothing slips in unnoticed.

Then note what was verified (each check with its result) and how, and write the **caveats**: the conditions behind that evidence and how far it can be trusted (local data only, a path that couldn't be exercised, an assumption about an external API). Tie each caveat to the section it qualifies when it has one. Where the slice moved something measurable (test counts, timings, sizes), record it as a before/after number.

The page derives state chips from this data: *look closely* from `attention`, *untested* from a section with no tests, *finding* from code-review findings, and *caveat* from caveats tied to the section. Fill those fields faithfully and the risk shows at a glance.

**Write the copy** by the rules in [../hq-artifact-design/SKILL.md](../hq-artifact-design/SKILL.md) (section 3). A section title states the behaviour ("Checkout no longer charges a card twice"), and each claim under *How it's built* is one sentence.

## 3. Update the story file and headquarters

Apply the audience test from the guide, the same way `/handoff` does: open questions and plan changes go into the story file, and lessons go to headquarters. Leave the story's status alone. Every edit, including any stale-memory fix (old claim → new claim), goes in the report's `alsoChanged` section.

## 4. Write the report

The report is always this template, so every review looks the same and can be updated in place. Changes to the template's design itself follow `hq-artifact-design`.

1. Create `~/.headquarters/<project-slug>/stories/<ID>/reviews/YYYY-MM-DD-HHMM-<slug>/` (or under `general/`), using local time and a three-to-five-word slug.
2. Copy [template.html](template.html) into it as `index.html`. Save screenshots in `assets/` beside it and reference them as `assets/<name>.png`.
3. Replace the JSON inside `<script type="application/json" id="report-data">` with this report's data, and change nothing else in the file. Inside that block, write every `</` as `<\/` so the script tag can't close early.

The data uses the same shape as the template's example:

| Field | Holds |
|---|---|
| `title` | The slice in a few words. |
| `project`, `story` (`id`, `title`, `path`), `repo`, `branch`, `datetime`, `scope` | Header details. `path` and `repo` are absolute. |
| `checkedHow` | One line on how the work was checked: tools, environment, data. |
| `summary` | Two or three plain sentences: what changed and why. |
| `kpis[]` | Optional, only for measurable change: `label`, `value`, `from`, `delta`. |
| `sections[]` | In review order: `title`, optional `attention`, `size` (`added`, `removed`, `files`), `body`, `points[]` (`text`, `path` absolute, `line`, optional `endLine`), optional `snippet` (`path`, `line` of its first line, `code`), `tests[]` (`text`, `path`, optional `line`), optional `images[]` (`src`, `caption`, `tag`: `before` or `after`, optional `wide`), and optional `review`. |
| `sideChanges[]` | `text`, `path`, optional `line`. |
| `decisions[]` | `text` ("We chose X because Y") and `links[]` (`label`, `href`) to any ADRs. |
| `verified[]` | Each check that was run, with its result. |
| `caveats[]` | The limits of that evidence: `text`, plus `section` (its 1-based number) when it qualifies one section. |
| `alsoChanged[]` | `path` and `note` for each story-file, tracker, or headquarters edit. |
| `commitMessage` | A suggested message matching the repo's style in `git log`, with the story ID when the repo uses one. |

Leave a field out or an array empty when there's nothing for it. The page hides empty parts.

## 5. Open, report, and wait

1. Hand over `index.html` the way the guide describes: open it in the default browser and give its clickable `file:///` link.
2. In chat, give the summary in two or three lines with that link.
3. When the change is large or risky (many files, or anything touching auth, data, migrations, or a public interface), offer to run `/code-review` as well. Its results go into this same report: set each section's `review` (`standards` and `spec` as `"ok"` or a short verdict, plus `findings[]` with `text`, `path`, `line`), update the data block, and reopen the page.
4. Wait. The user's reply decides what happens next: requested changes send the work back to working, and "committed" starts the next slice. The user makes every commit.
