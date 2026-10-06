---
name: hq-artifact-design
description: Headquarters' method for designing HTML pages people read, such as reports, reviews, and summaries. Use before writing or restyling any HTML page or report for the user, including changes to a skill's report template, and when writing the prose that fills one.
---

A page an agent writes for a person is read once, quickly, often while that person decides something. Design it for that reader: what they need first, what they act on, and what lets them trust it. Treat this as house method; the user's own words, then the project's existing styles, take precedence over everything here.

Read `~/.headquarters/me.md` first. Any design preferences there override the defaults below.

## 1. Plan before building

Settle three things and write them into the page as the first block of its `<style>`:

- **Layout**: one comment line describing the page's shape (for example "a sticky review bar over a single reading column; sections divided by rules").
- **Color**: four to six named tokens on `:root`: background, foreground, muted, rule, accent. Add semantic tokens (good, warning, bad) when the page shows state.
- **Type**: a font token for each role: a display face for headings, used sparingly; a body face; a mono face for code, paths, and numbers in columns.

Derive every later decision from those tokens. Ground the choices in the subject: an engineering review suits a technical sheet, a stakeholder report suits an editorial page. Include at least one detail only this subject would have, as content: its real units, terms, and figures (line counts, test totals, order IDs).

## 2. Fundamentals

**Typography.** Pair faces deliberately and give each a real fallback stack, because local pages may open offline (`"IBM Plex Sans", system-ui, sans-serif`). Load web fonts from Google Fonts only. Keep running text near 65 characters wide (`max-width: 68ch`), set one type scale and keep to it, use `text-wrap: balance` on headings, and add a little letter-spacing to uppercase labels. Use `font-variant-numeric: tabular-nums` wherever digits line up.

**Color and theme.** Tint neutrals slightly toward the accent so they read as chosen. Support light and dark at the token level: define every token on bare `:root` with light values, then redefine only the tokens under `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` and again under `:root[data-theme="dark"]`, each with `color-scheme: dark`. Style components through tokens only. Give `body` an explicit token background. Design the dark theme with the same care as the light one, keeping the accent legible on both.

**Layout.** Space sibling groups with flex or grid and `gap`. Keep a side gutter of at least 16px via `padding-inline` on `body`. Every flex or grid child that holds text, code, or a table gets `min-width: 0`, and every grid that holds them gets `grid-template-columns: minmax(0, 1fr)`; this is what keeps a long code line from widening the whole page. Let rows wrap and stack to one column near 400px wide. Only code, tables, and diagrams scroll sideways, each inside its own `overflow-x: auto` container.

**Surfaces.** A border, fill, radius, or shadow marks something as a separate object, so use them for the one or two elements that need to stand apart (a code block, the thing to copy). Divide ordinary sections with rules and space.

**Structure is information.** Numbering, labels, and order should say something true. Number sections only when the order means something, and say what it means ("ordered by where your judgement matters most"). Give findings IDs (F1, F2, …) when later parts of the page refer back to them, as a plan does ("Phase 0 · F4 F6 F7").

**Diagrams for structure.** When the subject is how parts fit together (layers, data flow, which code reaches which), draw it: boxes and arrows in HTML and CSS, or inline SVG, coloured from the theme tokens and labelled with the real names. Give it a `role="img"` and an `aria-label` that states what it shows. Put it inside an `overflow-x: auto` container so it can be wider than a phone.

**Scanned pages.** Most report readers scan before they read. Put the summary before the detail, and encode state in form as well as words: a chip, a pill, a strike-through for done. Derive that state from the page's data so it can't disagree with the content. Semantic color is separate from the accent. Interactive things look interactive, and keyboard focus is always visible.

**Complete at rest.** The first screen, as loaded, answers the reader's first questions without scrolling or interaction. Nothing waits on an animation or an observer to appear. Respect `prefers-reduced-motion`.

**Distinctive by default.** Generated pages drift toward a few stock looks: warm cream with a serif display and terracotta, near-black with one neon accent, a purple-to-blue gradient hero, Inter or Space Grotesk as the safe face, emoji section markers, everything centred, the same rounded card on every block, a coloured rail down the side of a rounded card. Choose from the subject instead, unless the user asks for one of these.

## 3. Write the copy

Words are design material.

- Short, direct sentences in active voice.
- Name things the way the reader knows them: the behaviour they see, the terms their team uses.
- Titles state the point ("Checkout no longer charges a card twice").
- Specific over clever: real numbers, real names, real paths.
- Plain statements throughout. Asides set off by dashes, "not X, but Y" framing, colon-then-reveal sentences, scare quotes, and stock phrases ("worth noting", "it's important to") all read as generated; rewrite them as plain sentences.
- A control says what it does ("Copy"), and its result confirms it ("Copied").

## 4. Local-page mechanics

Headquarters pages are files opened straight from disk, in any browser, by any agent's user.

- **Saved in headquarters.** A skill-made report goes where its skill says (`reviews/`). Any other page goes in `~/.headquarters/<project-slug>/stories/<ID>/reports/YYYY-MM-DD-HHMM-<slug>/index.html`, or under `general/`. Hand it over the way the hq guide describes (opened in the browser, plus a clickable `file:///` link), and keep it a local file even when the harness offers to publish pages to a hosted service such as claude.ai Artifacts, so every agent can find it in headquarters later.
- **Self-contained.** Inline the page's CSS and JS. Embed the page's data in a `<script type="application/json">` block, because a page opened from disk can't fetch a neighbouring data file. Inside that block, write `</` as `<\/`.
- **Numbers bound to data.** When a page reports measurements, keep the raw results in `data.json` beside it, and fill every figure on the page from the embedded copy (for example `<span data-k="warmMedian">` filled by the page's script), so the prose and the numbers can't disagree. Keep the scripts that produced the data in `scripts/`, write the page as `index.template.html` with an `embed` step that produces `index.html`, and end the page with a **Re-run** section listing the exact commands. Re-running then refreshes every number at once.
- **Links for every reader.** Each code reference gets a `vscode://` link for the user. When the repo has a GitHub remote and the commit is pushed, add a permalink pinned to that commit (`https://github.com/<org>/<repo>/blob/<sha>/<path>#L<line>`) beside it, so the page still works for anyone the user sends it to.
- **Assets beside the page.** Put images in an `assets/` folder next to the HTML and reference them relatively.
- **Editor link format.** `vscode://file/<absolute path>:<line>` opens a file at a line from the browser. Use forward slashes and drop any leading slash before the drive letter.
- **Browser storage** is a per-viewer convenience (a ticked checkbox, a collapsed section). Wrap every read and write in `try`/`catch` and render correctly without it.
- **Copy buttons** call `navigator.clipboard.writeText` inside the click handler, with a select-and-copy fallback.
- **Print.** Add a short `@media print` block that hides controls and keeps sections whole.

## 5. Check once

Look at the rendered page once before handing it over:

1. Run its script in a headless DOM (or open it) and confirm there are no errors.
2. Take one screenshot at desktop width and one at narrow width. Headless Chrome and Edge lay out no narrower than about 500px, so check narrow layouts at 520px.
3. Fix what the look shows in one pass, then hand the page over. Further polish is the user's call.
