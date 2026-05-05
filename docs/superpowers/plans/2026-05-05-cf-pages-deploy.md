# Cloudflare Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the public landing site (`docs/index.html`, `docs/privacy.html`, `docs/{en,zh}/index.html`) into a new top-level `site/` directory and make the HTML domain-portable, so Cloudflare Pages Git Integration can serve it at `https://dapp-inspector.chain.moe`.

**Architecture:** Pure file moves + small textual edits. No build step, no new tooling. CF Pages dashboard is configured manually by the repo owner (out of plan scope, documented in spec §5). All deploy automation is provided by CF Pages Git Integration — this codebase ships zero workflow code for site deploys.

**Tech Stack:** Static HTML/CSS/JS only. `git mv` for moves, manual `Edit`/`Read` for content tweaks. No npm/pnpm changes; no test additions.

**Spec:** `docs/superpowers/specs/2026-05-05-cf-pages-deploy-design.md`

---

## File Structure

**Created:**
- `site/index.html` — moved from `docs/index.html`
- `site/privacy.html` — moved from `docs/privacy.html`
- `site/en/index.html` — moved from `docs/en/index.html`
- `site/zh/index.html` — moved from `docs/zh/index.html`

**Modified:**
- `site/index.html` — relative `canonical` + `hreflang` (head, lines 9–12)
- `site/en/index.html` — same
- `site/zh/index.html` — same
- `site/privacy.html` — relative `canonical` (head, line 9)
- `docs/store/privacy.md` — line 3 hosting note
- `README.md` — add Site/Privacy links under badge block
- `README.zh-CN.md` — add Site/Privacy links under badge block

**Deleted:**
- `docs/index.html`, `docs/privacy.html`, `docs/en/index.html`, `docs/zh/index.html` — moved, not deleted (handled by `git mv`)
- `docs/.nojekyll` — GH Pages artifact

**Untouched:**
- `docs/images/`, `docs/store/` (except `privacy.md`), `docs/superpowers/` (except adding this plan)
- `src/`, `tests/`, all build/CI configuration
- `.github/workflows/{ci,build}.yml`

---

## Task 1: Relocate landing site to `site/`

Pure structural move. No content changes here — content edits are Task 2 onwards. Splitting the move from the edits keeps the diff reviewable: a reviewer can confirm `git diff -M` shows pure renames.

**Files:**
- Move: `docs/index.html` → `site/index.html`
- Move: `docs/privacy.html` → `site/privacy.html`
- Move: `docs/en/index.html` → `site/en/index.html`
- Move: `docs/zh/index.html` → `site/zh/index.html`
- Delete: `docs/.nojekyll`

- [ ] **Step 1: Create `site/` and move HTML files via `git mv`**

Run from repo root:
```bash
mkdir -p site/en site/zh
git mv docs/index.html       site/index.html
git mv docs/privacy.html     site/privacy.html
git mv docs/en/index.html    site/en/index.html
git mv docs/zh/index.html    site/zh/index.html
```

- [ ] **Step 2: Remove the empty `docs/{en,zh}` directories**

After `git mv` the parent dirs may be left empty. Git itself does not track empty dirs; remove them from the working tree so they don't confuse readers:
```bash
rmdir docs/en docs/zh 2>/dev/null || true
```

- [ ] **Step 3: Delete `docs/.nojekyll`**

```bash
git rm docs/.nojekyll
```

- [ ] **Step 4: Verify the move was registered as a rename**

```bash
git status
git diff --cached -M --stat
```

Expected `git status` (paths flagged as renames):
```
renamed:    docs/index.html       -> site/index.html
renamed:    docs/privacy.html     -> site/privacy.html
renamed:    docs/en/index.html    -> site/en/index.html
renamed:    docs/zh/index.html    -> site/zh/index.html
deleted:    docs/.nojekyll
```

If any HTML appears as `deleted: docs/X.html` + `new file: site/X.html` instead of `renamed:`, the rename detection failed (likely because of unstaged edits) — abort and re-stage cleanly.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(site): relocate landing pages to site/ for CF Pages deploy

CF Pages Git Integration will serve dapp-inspector.chain.moe from
site/. Drop docs/.nojekyll which was only needed for GitHub Pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Make `<head>` URLs relative

Replace the four hardcoded `beilunyang.github.io/dapp-inspector-extension/` URLs in each HTML head with same-origin relative paths. The page-side `syncCanonical()` JS in `site/index.html` (around line 1378) is preserved as-is — it now runs on top of a relative fallback.

**Files:**
- Modify: `site/index.html` (lines 9–12)
- Modify: `site/en/index.html` (lines 9–12)
- Modify: `site/zh/index.html` (lines 9–12)
- Modify: `site/privacy.html` (line 9)

- [ ] **Step 1: Edit `site/index.html` head URLs**

Replace this block:
```html
  <link rel="canonical" href="https://beilunyang.github.io/dapp-inspector-extension/" />
  <link rel="alternate" hreflang="en"        href="https://beilunyang.github.io/dapp-inspector-extension/en/" />
  <link rel="alternate" hreflang="zh-Hans"   href="https://beilunyang.github.io/dapp-inspector-extension/zh/" />
  <link rel="alternate" hreflang="x-default" href="https://beilunyang.github.io/dapp-inspector-extension/" />
```
with:
```html
  <link rel="canonical" href="/" />
  <link rel="alternate" hreflang="en"        href="/en/" />
  <link rel="alternate" hreflang="zh-Hans"   href="/zh/" />
  <link rel="alternate" hreflang="x-default" href="/" />
```

- [ ] **Step 2: Apply the same edit to `site/en/index.html`**

The file has identical lines 9–12 to `index.html`. Make the same replacement.

- [ ] **Step 3: Apply the same edit to `site/zh/index.html`**

Same replacement again.

- [ ] **Step 4: Edit `site/privacy.html` canonical**

Replace:
```html
  <link rel="canonical" href="https://beilunyang.github.io/dapp-inspector-extension/privacy.html" />
```
with:
```html
  <link rel="canonical" href="/privacy.html" />
```

- [ ] **Step 5: Verify all old URLs are gone**

```bash
grep -rn "beilunyang.github.io" site/
```
Expected: no output (zero matches).

- [ ] **Step 6: Verify the relative URLs landed correctly**

```bash
grep -rn 'rel="canonical"\|rel="alternate"' site/
```
Expected: 13 lines (4 + 4 + 4 + 1 across the four files) — all hrefs starting with `/`, none containing `://`.

- [ ] **Step 7: Commit**

```bash
git add site/
git commit -m "$(cat <<'EOF'
refactor(site): use relative URLs for canonical and hreflang

Domain-portable: same files now serve correctly from any host
(dapp-inspector.chain.moe, *.pages.dev, future moves). Google has
supported relative canonical since 2015. The syncCanonical() runtime
helper that rewrites canonical to match location is preserved.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Update privacy hosting note in `docs/store/privacy.md`

The CWS submission docs reference where the policy is hosted. Point readers at the real production URL.

**Files:**
- Modify: `docs/store/privacy.md` (line 3)

- [ ] **Step 1: Replace the hosting note**

Replace:
```markdown
> **Note:** Chrome Web Store requires a publicly-hosted URL pointing to this policy. The simplest setup is to push this repo to GitHub and enable GitHub Pages — the file then resolves at `https://beilunyang.github.io/dapp-inspector-extension/privacy.html` (or wherever you host it). Alternatively render this Markdown to a Gist and use the Gist's raw URL.
```
with:
```markdown
> **Note:** Chrome Web Store requires a publicly-hosted URL pointing to this policy. The published copy is at `https://dapp-inspector.chain.moe/privacy.html`, served from `site/privacy.html` via Cloudflare Pages.
```

- [ ] **Step 2: Verify**

```bash
grep -n "beilunyang.github.io\|dapp-inspector.chain.moe" docs/store/privacy.md
```
Expected: one line, matching the new `dapp-inspector.chain.moe` URL only.

- [ ] **Step 3: Commit**

```bash
git add docs/store/privacy.md
git commit -m "$(cat <<'EOF'
docs(store): point privacy hosting note at production URL

The privacy policy now ships at dapp-inspector.chain.moe via CF Pages,
not GitHub Pages.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Surface the live site in both READMEs

Add one line under each badge block linking to the live site and privacy page. No new sections, no rewording of existing copy.

**Files:**
- Modify: `README.md` (insert after line 11, before line 12)
- Modify: `README.zh-CN.md` (insert after line 11, before line 12)

- [ ] **Step 1: Insert Site/Privacy line into `README.md`**

Find this block (lines 5–13 currently):
```html
  <p>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/releases/latest"><img alt="latest release" src="https://img.shields.io/github/v/release/beilunyang/dapp-inspector-extension?label=release&color=8957e5"></a>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml"><img alt="build" src="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml/badge.svg"></a>
    <img alt="manifest v3" src="https://img.shields.io/badge/manifest-v3-8957e5">
    <img alt="chains" src="https://img.shields.io/badge/chain-EVM-627eea">
    <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-1f883d"></a>
  </p>
  <p>English · <a href="README.zh-CN.md">中文</a></p>
</div>
```

Insert one new `<p>` between the badge `</p>` and the language switcher `<p>`, so it becomes:
```html
  <p>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/releases/latest"><img alt="latest release" src="https://img.shields.io/github/v/release/beilunyang/dapp-inspector-extension?label=release&color=8957e5"></a>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml"><img alt="build" src="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml/badge.svg"></a>
    <img alt="manifest v3" src="https://img.shields.io/badge/manifest-v3-8957e5">
    <img alt="chains" src="https://img.shields.io/badge/chain-EVM-627eea">
    <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-1f883d"></a>
  </p>
  <p><strong>Site:</strong> <a href="https://dapp-inspector.chain.moe">dapp-inspector.chain.moe</a> · <strong>Privacy:</strong> <a href="https://dapp-inspector.chain.moe/privacy.html">dapp-inspector.chain.moe/privacy.html</a></p>
  <p>English · <a href="README.zh-CN.md">中文</a></p>
</div>
```

- [ ] **Step 2: Insert Site/Privacy line into `README.zh-CN.md`**

Same structural edit. Inserted line:
```html
  <p><strong>官网:</strong> <a href="https://dapp-inspector.chain.moe">dapp-inspector.chain.moe</a> · <strong>隐私政策:</strong> <a href="https://dapp-inspector.chain.moe/privacy.html">dapp-inspector.chain.moe/privacy.html</a></p>
```
Place it between the badge `</p>` and the `<p><a href="README.md">English</a> · 中文</p>` language switcher line.

- [ ] **Step 3: Verify both READMEs render the new line**

```bash
grep -n "dapp-inspector.chain.moe" README.md README.zh-CN.md
```
Expected: 4 hits total (each README has one line containing two `dapp-inspector.chain.moe` strings).

- [ ] **Step 4: Commit**

```bash
git add README.md README.zh-CN.md
git commit -m "$(cat <<'EOF'
docs(readme): link to live site and privacy policy

Adds a one-line pointer under the badge block in both READMEs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Acceptance verification

Cross-check every acceptance criterion in spec §9. No commit — just run the checks. If anything fails, return to the relevant task.

**Files:** none modified.

- [ ] **Step 1: All four HTMLs exist at the new path**

```bash
ls -1 site/index.html site/privacy.html site/en/index.html site/zh/index.html
```
Expected: four lines, no errors.

- [ ] **Step 2: Old paths are gone**

```bash
ls docs/index.html docs/privacy.html docs/en docs/zh docs/.nojekyll 2>&1 | grep -v "^$" || echo OK_NONE_EXIST
```
Expected: `OK_NONE_EXIST` (every path errors with "No such file"), or all `ls` lines show "No such file".

- [ ] **Step 3: No old URL anywhere in tracked content**

```bash
grep -rn "beilunyang.github.io" -- src tests site docs README.md README.zh-CN.md
```
Expected: empty output.

(Note: the spec file `docs/superpowers/specs/2026-05-05-cf-pages-deploy-design.md` itself contains `beilunyang.github.io` strings inside diff blocks documenting the migration — that's by design. The grep above scopes to the dirs/files where stray references would actually matter and excludes spec history.)

- [ ] **Step 4: Sanity-check the rest of the codebase still passes**

This change should not touch any TS code path. Run the standard checks to be sure:
```bash
pnpm typecheck
pnpm lint
pnpm test:run
```
Expected: all three exit 0. If `lint` flags markdown or HTML, double-check whether those files are in the lint glob (they should not be — `eslint` here is configured for `src + tests` only per CLAUDE.md).

- [ ] **Step 5: Local browser smoke check (optional but recommended)**

Open `site/index.html` in a browser via `file://` or any static server. Confirm:
- Page renders the brutalist landing without console errors
- Right-click → View Page Source → `<link rel="canonical" href="/">` is present
- Click the **privacy** link in the footer — navigates to `site/privacy.html`
- Repeat for `site/en/index.html` and `site/zh/index.html` — locale-appropriate copy is shown

This is a manual eyeball check; no automation needed.

- [ ] **Step 6: Hand off the dashboard tasks to the repo owner**

Plan-side work is complete. Surface the manual one-time steps from spec §5 + §7 to the repo owner so they can finish the deploy:

1. CF Dashboard: connect repo, set build output `site`, project name `dapp-inspector`.
2. CF Dashboard: bind custom domain `dapp-inspector.chain.moe`.
3. GitHub repo Settings → Pages → Source → None.

These are not commits and not in scope for this plan to execute.

---

## Self-Review (pre-execution)

**Spec coverage check:**
- §1 goals/non-goals → all addressed; CI/`build.yml`/`docs/images/` untouched as required.
- §2 approach → no workflow code committed; `wrangler-action` escape hatch documented in spec §6, not added here.
- §3 directory restructure → Task 1 covers all four moves + `.nojekyll` deletion.
- §4 HTML edits → Task 2 (HTMLs) + Task 3 (`docs/store/privacy.md`).
- §5 dashboard config → out of plan scope; surfaced in Task 5 Step 6 as handoff.
- §6 trade-off → no codebase impact; documented in spec only.
- §7 GH Pages decommission → `.nojekyll` deletion in Task 1; repo-side Pages disable surfaced in Task 5 Step 6.
- §8 README updates → Task 4.
- §9 acceptance criteria → Task 5 Steps 1–5 cover every bullet.
- §10 out of scope → no tasks added for og:url, sitemap, etc.

**Placeholder scan:** none — every step has concrete commands, file paths, and exact diffs.

**Type/name consistency:** Pages project name `dapp-inspector` (spec §5 step 3) is referenced once in Task 5 Step 6 and matches.
