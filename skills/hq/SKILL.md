---
name: hq
description: Headquarters, the shared memory and notes wiki at ~/.headquarters for projects and user stories. Use to save information ("save this", "note that"), to recall what was learned or decided (a past meeting, an SME conversation, how something works), to update or forget stale memory, and whenever work would benefit from project or story memory the session hasn't loaded yet.
---

Read [GUIDE.md](GUIDE.md) first. It defines the layout, how to resolve the project and story, where knowledge goes, and the writing rules. Everything below assumes it.

## Pick the intent

Infer the intent from the user's phrasing, or from what the work needs when acting on your own:

- **Recall**: "what did we learn about auth?", "what did we talk about in last week's meeting?", "how do we deploy X?"
- **Remember**: "save this", "I just talked to Bob and we learned X", documentation worth keeping, or a lesson you want the next session to have.
- **Update**: a memory is outdated, incomplete, or contradicted by the code.
- **Forget**: the user asks to remove something, or a memory is simply wrong.

When the intent is still ambiguous, ask one short question.

## Recall

1. Resolve the project and, if relevant, the story.
2. Read `~/.headquarters/<project-slug>/project.md`, the project's `notes/index.md`, `~/.headquarters/notes/index.md`, and each Related project's `project.md`.
3. Map the question to tags using `~/.headquarters/tags.md`, then grep note frontmatter across headquarters for those tags, aliases, and the topic's words (`grep -rliE "^(tags|aliases|title|description):.*<term>" ~/.headquarters --include=*.md`). Grep stories, handoffs, and meetings for the topic too.
4. Read the matching notes and follow their links one hop to related pages.
5. Answer with the source path of each fact, and say so when a note's `status` is `draft` or `deprecated`. If headquarters has nothing, say so and name where else the answer might live (the story file, the repo's docs, git history).

## Remember

Deciding where and how to store the information is your job; the user only says what to save.

1. Resolve the project and story. When the information isn't about the current project, place it by its subject.
2. Run the audience and lifespan tests from the guide. When the destination is the story file or the repo, write it there and skip to step 5.
3. Within headquarters, pick the home by what the information is:
   - how the user works across all projects → `~/.headquarters/me.md`
   - working memory for one story → `stories/<ID>/notes.md`
   - a one- or two-line fact every session in the project should see → the matching section of `project.md`
   - documentation-style knowledge (how something works, how to do something, terms, decisions, what someone explained, anything longer than a couple of lines or likely to gather more facts) → a note in the wiki, following [NOTES.md](NOTES.md)
4. Search for an existing home first, the same way Recall does. Extend a matching note or entry rather than writing a near-duplicate, and create a new note only for a new topic. For a note, set its type, description, tags (reusing `tags.md`), aliases, and sources, link it to related notes, and update the bundle's `index.md` and `log.md`.
5. Write it as affirmative guidance, dated when timing matters (`2026-09-30, from Bob: ...`).
6. Report the write: the path, whether the note was new or extended, and any tag you coined.

## Update

Edit the entry in place so it states the current truth. For a note, bump `updated` and add a line to the bundle's `log.md`. Report the change with the old claim and the new one, so the user can course-correct.

## Forget

Delete the entry, then report what was removed and from where. When a note has only stopped being true, mark it `deprecated` and say what replaced it. When removing a note, take it out of its `index.md`, log the removal, and fix links that pointed at it.
