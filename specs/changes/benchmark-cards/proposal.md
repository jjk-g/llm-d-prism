# Proposal: Benchmark Cards — results repos with Dashboard Cards

**Status:** Draft — awaiting Gate A review (one of @seanhorgan, @diamondburned,
@jjk-g per `specs/main/dashboard-pipeline.md`).
**Supersedes:** `specs/changes/on-demand-dashboards.md` (absorbed — see §7).

## 1. Context / Intent

Prism has two converging capabilities and one gap between them:

- The **Results Store** (PR #88) gives us a submission UX: users stage or
  submit collections of benchmark reports (BRv0.2+), which flow through a
  review pipeline (staged → processing → in_review → approved/rejected).
- The **UI blueprint** (PR #91) gives us a style contract and a proven
  results→dashboard pipeline — but it produces *hand-registered, code-level*
  well-lit dashboards, one PR each.
- The **on-demand-dashboards proposal** sketched user-authored dashboards
  from Results Store runs, but treated the dashboard as a free-floating
  document disconnected from any submission.

**Benchmark Cards unifies these, HuggingFace-style.** A submission creates a
**repo** — a living, namespaced collection of benchmark results
(`<github-user>/<repo-name>`). Every repo has a **Dashboard Card**: an
auto-generated, owner-editable dashboard that is to the repo what a Model
Card is to a model. Prism becomes browsable: a card catalog with structured
facets over everything the community has published.

Well-lit paths remain the curated, code-level tier (Gates A/B unchanged).
Benchmark Cards is the self-serve tier below it: publishing a card requires
no PR, no deploy, and no dashboard code.

## 2. Concepts

### Repo
- Identity: `<github-user>/<repo-name>` (shortname regex `^[a-z0-9-]+$`).
- **One repo per collection, unique per owner.** A repo represents exactly
  one results collection; `(owner, name)` is globally unique and creation
  fails on collision within the owner's namespace. A user can create as many
  repos as they have collections — the submission wizard requires each
  submission to target exactly one repo (a new one, or one the submitter
  already owns when extending that same collection). Runs are never pooled
  across repos, and a report file belongs to exactly one repo.
- A **living collection**: the owner can add runs (new report files) over
  time; each mutation records a revision entry (who/when/what) so a card can
  say "updated 3 days ago, 14 runs".
- Contents: BRv0.2+ report files (the source of truth), the card config, and
  repo metadata (title, description, tags).
- Created implicitly by the existing submission wizard: "Submit for review"
  targets a new or existing repo the submitter owns.

### Dashboard Card
- A block-based dashboard config (§4) attached to exactly one repo,
  rendered by Prism's shared renderer using `src/components/ui/` primitives
  under the `skills/style.md` contract.
- **Auto-generated on submission, then owner-editable.** Owners may
  rearrange, annotate (markdown blocks), or extend — the auto-generated
  blocks remain regenerable when new runs land ("refresh card from data").

### The card generator (what "service-side analyze heuristics" means)

`skills/analyze_benchmark_results.md` is prose executed by an agent with
judgment; it cannot run on every submission. The card generator is that
skill's decision procedure re-implemented as a deterministic server module
(`server/results/cardGenerator.ts`) — plain code, no LLM in the loop:

1. **Parse & validate** each report against the BRv0.2+ schema; unparseable
   files are excluded and surfaced in a warnings block, never fatal.
2. **Constants-vs-variance analysis**: compare `scenario.*` and stack fields
   across all runs. Fields identical everywhere are scenario constants →
   the `scenario-panel` block. Fields that vary are sweep dimensions → the
   x-axis (one dimension) or per-dimension selectors (multiple).
3. **Stat audit**: for each metric, detect which stats exist (mean/p50/p90/
   p99). This drives the stat ToggleGroups exactly as style.md requires:
   options the data lacks are omitted; single-stat metrics render the
   "Mean — only stat reported" static text.
4. **Canonical mapping**: report metric names map onto the canonical
   selector sets (TTFT/ITL/E2E/TPOT/NTPOT; Output/Input/Total/QPS) with
   units taken from the reports' `units:` fields — never assumed.
5. **Block emission**, in the well-lit section order: `scenario-panel` →
   `kpi-row` (best-config-by-throughput, best-latency, spread — each with
   its direction stated) → one chart block per metric family (one axis,
   ≤5 series, `CHART_SERIES` order) → `results-table` (all runs × all
   available metrics, best values flagged) → an empty `markdown` block
   placeholder inviting the owner's narrative. All emitted blocks carry
   `origin: "auto"`.
6. **Determinism**: same set of approved reports → byte-identical
   `card.json` (stable sort orders, no timestamps or randomness inside
   blocks). Regeneration is therefore idempotent and diffable, and can
   safely replace `origin:"auto"` blocks without touching owner content.

Degenerate shapes are handled, not rejected: a single-run repo gets
scenario panel + metric tiles + table (no sweep charts); a heterogeneous
collection (e.g. mixed models) promotes the varying identity field to a
selector rather than pretending it is a sweep.

What the generator deliberately does **not** do is the judgment half of the
skill: no narrative, no hero copy, no "what this means" analysis — that is
the owner's markdown, or a future opt-in agent assist. The skill remains
the design tool for curated well-lit paths; the generator is its commodity
tier for every submission.

### Visibility (gated by the existing review pipeline)
| Repo state | Who sees the repo + card |
|---|---|
| staged (local browser only) | submitter's browser only (IndexedDB, as today) |
| processing / in_review | owner + reviewers/admins |
| approved | **public** — listed in browse/search |
| rejected | owner + reviewers (with feedback), never listed |

Approval applies per submission batch: an approved repo that receives new
unreviewed runs stays public but shows the new runs as "pending review" and
excludes them from the public card until approved.

## 3. User journeys

1. **Submit → card exists.** An engineer submits six P/D sweep reports via
   the existing wizard, naming the repo `jkramberger/pd-ratio-sweep`. On
   submission, Prism auto-generates the card. Once a reviewer approves, the
   repo appears in browse/search and the card is public at
   `/u/jkramberger/pd-ratio-sweep`.
2. **Curate.** The owner opens the card, adds a markdown block explaining
   the memory-wall context, pins the "best ratio" KPI to the top, and hides
   the input-throughput chart. Auto-blocks refresh when run 7 is approved.
3. **Browse.** A user opens **Benchmark Cards** in the nav, facets by
   `model: Qwen3-Coder-480B` + `accelerator: TPU v7x`, and finds three repos
   from different owners; each card renders on click, no login required.
4. **Compose (secondary, absorbed from on-demand-dashboards).** A CE creates
   a *composed card* not bound to one repo — same block schema, datasets
   reference runs across public repos — published under their namespace.

## 4. Card schema

Extends the absorbed on-demand-dashboards schema (v1.0 → v2.0):

- Keeps: `metadata`, `datasets` (`run-id | gcs-path | raw-json`), `layout`
  blocks `markdown | bar-chart | scatter-plot | table`.
- Adds block types matching the well-lit anatomy: `scenario-panel`,
  `kpi-row`, `results-table`, `line-chart`.
- Adds per-block `origin: "auto" | "owner"` — auto blocks are regenerated by
  "refresh from data"; owner blocks are never touched by the generator.
- Adds top-level `repo` binding (`owner`, `name`) — absent for composed
  cards.
- Chart blocks are constrained to the style contract: canonical metric
  selectors, `CHART_SERIES` palette, one axis per chart. The renderer
  enforces this (invalid configs fail schema validation server-side).

## 5. Storage & API (extends `specs/main/results-api/`)

```
gs://<bucket>/repos/<owner>/<name>/
    reports/<file>.yaml        # submitted BRv0.2+ reports (existing pipeline)
    card.json                  # card config (schema §4)
    meta.json                  # title, description, tags, revisions, state
gs://<bucket>/index/cards.json # browse/search index (rebuilt on approval)
```

- `GET  /api/repos` — public; returns the browse index (approved repos only)
  with facet metadata.
- `GET  /api/repos/:owner/:name` — repo meta + card + run summaries
  (visibility rules from §2).
- `POST /api/repos/:owner/:name/card` — owner-only (GitHub OAuth); validates
  against schema; writes `card.json`.
- `POST /api/repos/:owner/:name/regenerate` — owner-only; re-runs the card
  generator over approved runs, replacing `origin:"auto"` blocks only.
- Submission/review endpoints: existing results-api routes, extended to
  target a repo.

**Facet index (v1 scope):** model, accelerator family, workload/tool,
report keywords, owner, run count, last-updated, review state. Derived from
`scenario.standardized` + `run.keywords` at approval time. Free-text search,
metric-threshold queries, and leaderboards are explicitly out of scope for
v1 (future considerations).

## 6. Frontend

- **Browse view** ("Benchmark cards" in the Utility suite nav): faceted card
  grid — each entry a summary tile (title, owner, model/hardware chips, run
  count, updated-at). Built from `ui/` primitives; this is also the forcing
  function to extract the deferred `ResultsTable`/card-tile primitives.
- **Card view** at `/u/:owner/:name` (adopting the absorbed proposal's
  collision-safe `/u/` routing + SPA fallback).
- **Card editor**: block list editor (add/remove/reorder/edit), reusing the
  submission wizard's design language. Markdown sanitized on render
  (dompurify + marked). Edit affordances visible to the owner only.
- Cards are **not** well-lit paths: no home-rail card, no nav entry per
  repo, no `ITEM_THEMES`. The card renderer applies the well-lit glass/dark
  aesthetic but page chrome marks it as community content (owner avatar,
  review status, report-format version).

## 7. Relationship to existing specs

- `specs/changes/on-demand-dashboards.md` is **absorbed**: its routing,
  storage-scoping, security model, and block schema carry into §§4-6; its
  standalone dashboards become "composed cards" (§3.4). On approval of this
  proposal, move it to `specs/archive/` with a pointer here.
- `specs/main/dashboard-pipeline.md` is unchanged: Gates A/B govern well-lit
  paths and this spec itself — not individual community cards, whose gate is
  the Results Store review.
- `skills/style.md` governs the block library and renderer. Any new block
  type is a style-contract change (approval: @seanhorgan or @Raji14).

## 8. Security

Carried from the absorbed proposal: namespace scoping via the GCS prefix as
the authorization boundary; server-side JSON-schema validation of card
configs; markdown sanitization on render; shortname regex. Added: card
writes require repo ownership (not just any authenticated user), and the
browse index only ever contains approved content.

## 9. Success criteria

- A submission through the existing wizard yields a rendered, sharable card
  with zero authoring effort; approval flips it public with no further
  action.
- Card pages are visually consistent with well-lit dashboards (same
  primitives, palette, glass surfaces) — verifiable via the style ratchet.
- Browse/search returns faceted results from the index in <2s; card pages
  load without authentication.
- The on-demand-dashboards CUJs (create/share/edit a custom study in
  minutes, namespaced URL) remain satisfied via composed cards.
- No new code paths bypass the review pipeline: nothing unapproved is ever
  publicly listed.

## 10. Open questions

1. Repo transfer/renaming and org namespaces (e.g. `/org/llm-d/…`) — v2?
2. Run retraction: if an approved run is later retracted, does the card
   auto-regenerate, annotate, or freeze? (Absorbed proposal's open question,
   now concrete.)
3. Quotas: max repos/runs per user before we need limits.
4. Should the card generator run client-side at staging time (instant
   preview for local-only bundles) as well as server-side at submission?
