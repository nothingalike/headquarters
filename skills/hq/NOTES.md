# Notes wiki

Notes are headquarters' wiki: one Markdown page per topic, found by tags and description, and linked to each other. They hold documentation-style knowledge that belongs to no single story: how something works, how to do something, what a term means, why a choice was made, what someone explained in a meeting.

Each `notes/` folder is a bundle in Google's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) (OKF v0.2): Markdown files with YAML frontmatter, a required `type`, an `index.md` listing, and a `log.md` changelog. Any OKF-aware tool, and Obsidian, can read the notes as they are.

## Where a note lives

- `~/.headquarters/<project-slug>/notes/<slug>.md`: the topic belongs to one project.
- `~/.headquarters/notes/<slug>.md`: the topic spans projects or belongs to none (a client, a vendor, a tool, a practice).

Place a note by its subject, not by the repo the session happens to be in. A note about Shopify app proxies learned while working on `acme-shop` goes in `notes/` when it holds for any Shopify store, and in `acme-shop/notes/` when it describes that store's setup.

The **slug** is the title in lowercase kebab-case. `index.md` and `log.md` are reserved and never used as slugs.

## Page format

```md
---
type: how-to
title: Deploying billing-api to staging
description: Push billing-api to the staging slot and confirm the worker picked up the release.
tags: [deploy, staging, billing-api]
aliases: [billing deploy, staging deploy]
project: billing-api
status: stable
sources:
  - id: working-session
    resource: ../../meetings/2026-10-05-1030-billing-working-session.md
    title: Working session, 2026-10-05
  - id: bill-004
    resource: BILL-004
    title: Staging access story
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-06 }
updated: 2026-10-06
---

# Deploying billing-api to staging

<The knowledge, written as affirmative guidance, with headings as it grows. Attribute a claim to a source with a footnote keyed to its id.>[^working-session]

## Related

- [billing-api architecture](./billing-api-architecture.md): what the deploy pushes and where it runs

[^working-session]: Explained by the platform lead in the 2026-10-05 working session.
```

- **type** (required): one of `how-to` (steps to do something), `reference` (facts to look up: settings, endpoints, accounts, contacts by role), `explainer` (how something works and why), `decision` (a choice and its reason), `troubleshooting` (a symptom and its fix), `glossary` (terms and what they mean here).
- **title**: the page's display name.
- **description**: one sentence saying what the page answers. It is what search and the index show, so write it as the answer someone scanning would need.
- **tags**: 2–5 tags from the vocabulary in `~/.headquarters/tags.md`, naming the subjects a future search would mention: systems, tools, domains, clients, repos.
- **aliases**: other names a person would search for: acronyms, old names, the phrasing the user used when saving it.
- **project**: the project slug; omit it for a note in `~/.headquarters/notes/`.
- **status**: `draft` while the knowledge is partial or unconfirmed, `stable` once confirmed, `deprecated` when it no longer holds (keep the page and say what replaced it).
- **sources**: where the knowledge came from, each with a short `id`, a `resource` (relative path, story ID, or URL), and a `title`. For a conversation, the resource is `"<role>, YYYY-MM-DD"`. The story or meeting stays the record; the note links back to it.
- **generated**: who first wrote the page: `claude-code/<model-id>`, `codex/<model>`, or `human:<name>`, and the date.
- **updated**: today's date on every edit.

Link generously in the body with relative Markdown links (`[billing-api architecture](./billing-api-architecture.md)`, or `../../notes/shopify-app-proxy.md` across bundles) wherever another note covers what a sentence mentions. End with a **Related** list giving one line per link on why it matters.

## Tag vocabulary

`~/.headquarters/tags.md` is the single list of tags, one line each: `- <tag>: <what it covers>`. Tags are lowercase kebab-case. A project's slug is the tag for that project, and a repo's name is the tag for that repo.

Reuse a listed tag whenever one covers the subject. Coin a new tag only for a subject no listed tag covers and more notes are likely to share, and add it to `tags.md` in the same edit. Create `tags.md` when it is missing.

## Index and log

Every `notes/` folder has two reserved files, created with the first note:

- `index.md`, the bundle's home page: frontmatter `okf_version: "0.2"`, then every note as `- [<title>](./<slug>.md) (<type>): <description>`, grouped under headings by type or theme once the list passes about ten.
- `log.md`, the changelog: a `## YYYY-MM-DD` heading per day, with one line per change: `- added|updated|deprecated|removed [<title>](./<slug>.md): <what changed>`.

Adding, renaming, deprecating, or deleting a note updates both files in the same edit. A project's `project.md` links its `notes/index.md` from a **Notes** section.

## Keeping the wiki healthy

- **One topic per page.** When a note starts covering a second topic, split it and link the halves.
- **Extend before creating.** A new fact about a topic that already has a page goes into that page, under the heading where it fits, with its source added.
- **Flag contradictions.** When a new fact contradicts a page, update the page to the current truth, keep the old claim in a short "Previously" line with its date and source, and report both to the user.
- **Renames update links.** When a slug changes, grep headquarters for the old filename and update every link, the index, and the log.
