---
name: plate
description: The user's plate, what's open across their projects plus a daily log, kept in headquarters. Use when the user asks what's on their plate or what they did, and whenever work gets done, a blocker turns up, or an open question gets asked or answered.
argument-hint: "[add <item> | done <item> | note <text> | eod | week]"
---

Read [../hq/GUIDE.md](../hq/GUIDE.md) first for resolving the project and the writing rules.

The plate is the user's running list of what's open, plus a daily log of what happened. It lives in headquarters so every agent can read it and keep it current. What goes on it is the user's choice.

## Files

```
~/.headquarters/plate/
  plate.md               open items, one `## <project>` heading per project
  log/YYYY-MM-DD.md      one file per day
```

`plate.md` holds open items only, one line each, story ID first when there is one:

```markdown
## acme-shop
- [ ] SHOP-004: build the inventory UI (since 2026-09-30)
- [/] SHOP-003: cart migration (since 2026-09-24)
- [ ] SHOP-005: shop pricing — blocked: needs SHOP-003 merged (since 2026-09-30)
```

`[ ]` is open, `[/]` is in progress, and `— blocked:` or `— waiting on:` says what holds it up. Finished items leave the plate for the log, so the plate stays short. Anything that needs a future action (a follow-up, an email to send, an answer to chase) is a plate item.

A day's log records what happened, each line prefixed with its project:

```markdown
# 2026-10-01

## Meetings
- acme-shop: 9:30 AM–9:45 AM Daily standup
- billing-api: 2:00 PM–3:00 PM Export review with the client (tentative)

## Done
- acme-shop: SHOP-003: migrated v2 carts (`a1b2c3d`)

## Blockers
- acme-shop: SHOP-005: the pricing API returns 500 on staging

## Questions
- acme-shop: asked the product owner whether prices round per item or per cart
- billing-api: the client answered by email: the export runs nightly, not hourly

## Notes
- billing-api: standup moves to 9:30 from Monday
```

Meetings is the day's schedule, written by the `meetings` skill from the user's calendars and rewritten whenever it runs, so what came out of a meeting goes under Done, Questions, or Notes, linking the meeting's file in `~/.headquarters/meetings/` where its full transcript lives. Create a file, heading, or section when it is missing, and leave out empty sections. Today's date comes from the environment. Older logs may follow another shape (imported notes, say); read them as they are.

## Projects

The projects are the `##` headings in `plate.md`, plus `other` for anything that fits no project. Resolve an item's project in this order:

1. A heading named in the text.
2. A story ID: the headquarters project with `stories/<ID>/`, or the heading that already holds items with the same key.
3. The current project, resolved as the guide says.
4. Ask.

Add a heading when a new project turns up.

## Intents

Infer the intent from the argument; free-form text works ("finished the redirect bug" is **done**).

- **Show** (no argument): print the plate grouped by project, in-progress items first, flagging blocked items and items older than a week. Then list what's in today's log.
- **Add**: append the item under its project in `plate.md`. Several items in one message are several lines.
- **Done**: match the item in `plate.md` by its words or story ID, remove it, and add it to today's Done. Work that was never on the plate goes straight into the log. When the match is ambiguous, show the candidates and ask.
- **Blocker**: log it under Blockers and mark the plate item it holds up with `— blocked:`. When it clears, remove the mark and log what cleared it under Notes.
- **Question**: log it under Questions. When it waits on someone, add or mark a plate item `— waiting on:`. When the answer arrives, log the answer under Questions and clear the item.
- **Note**: append to today's Notes.
- **Eod**: read today's log and the plate. Ask the user what else happened today that isn't logged, including what came out of each of today's Meetings, and add it. Then give a three-line wrap-up: what got done, what's blocked or waiting, and what to start with tomorrow.
- **Week**: read the last 7 log files and summarize what got done per project, as short bullets ready to paste into a standup, timesheet, or recap.

## Agents keep it current

Any agent working with the user records events on the plate as they happen: work finished, a blocker found, a question raised or answered (in a meeting, an email, a chat thread). Write one line per event, in the user's voice and past tense. Point to the detail (a commit SHA, a story ID, a handoff path) rather than repeating it; detail belongs in the story file or handoff.

The user decides when an item is finished: when an agent completes the work, it logs what it did under Done and leaves the item `[/]` until the user says it's done.

After every write, report it in one line: "Plate: logged under acme-shop Done: migrated v2 carts."
