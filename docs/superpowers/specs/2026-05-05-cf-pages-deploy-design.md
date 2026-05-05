# Cloudflare Pages Deployment for Landing Site

**Date:** 2026-05-05
**Scope:** Migrate the public landing site (`docs/index.html`, `docs/privacy.html`, `docs/{en,zh}/index.html`) off GitHub Pages onto Cloudflare Pages, served at `dapp-inspector.chain.moe` via CF Pages' built-in Git integration. No GitHub Action involved.

---

## 1. Goals & non-goals

**Goals**
- Serve the landing site and privacy page from `https://dapp-inspector.chain.moe`.
- Deploy automatically on every push to `main`, with no project-side workflow code.
- Keep public-facing assets cleanly separated from internal docs (`store/`, `superpowers/`).
- Make the HTML domain-portable so future moves do not require source edits.

**Non-goals**
- Any GitHub Action for deploys. CF Pages Git Integration handles it.
- Path-scoped triggers (CF Pages does not support them natively; see §6 trade-off).
- Any change to extension build, tests, or CI (`ci.yml`, `build.yml` stay as-is).
- Moving `docs/images/` (README screenshots, not referenced by site HTML — verified by grep).

---

## 2. Approach

**Cloudflare Pages + Git Integration.** The CF dashboard is connected once to the GitHub repo; CF watches `main` and re-uploads `site/` on every push. No build command — files are static.

Alternatives considered and rejected:
- **GitHub Action + `wrangler-action`** — gives path filtering but adds a workflow file, secrets, and an extra moving part. User chose Git Integration.
- **Workers Static Assets** — overkill for a static site; less mature tooling.

**Custom domain binding.** Done once via the CF dashboard, not automated. `chain.moe` is already on Cloudflare DNS, so DNS validation is one click; cert provisioning takes 1–2 minutes. There is no clean `wrangler` CLI surface for this, and it is one-shot config — automating it would be net negative.

---

## 3. Directory restructure

```
site/                              ← NEW: CF Pages root
  index.html                       ← from docs/index.html
  privacy.html                     ← from docs/privacy.html
  en/index.html                    ← from docs/en/index.html
  zh/index.html                    ← from docs/zh/index.html

docs/                              ← stays, internal-only after this change
  images/                          ← unchanged (README screenshots)
  store/                           ← unchanged (CWS submission docs)
  superpowers/                     ← unchanged (specs/plans)
  .nojekyll                        ← DELETED (was only needed for GH Pages)
```

Verified `site/` HTML is fully self-contained: `grep -i "images\|\.png" docs/{index,privacy,en/index,zh/index}.html` returns empty. The brutalist landing page inlines all CSS and SVG; no external image references.

Use `git mv` for the moves so history is preserved.

---

## 4. HTML edits

### 4.1 `site/index.html`, `site/en/index.html`, `site/zh/index.html`

Replace the four hardcoded URL lines in `<head>`:

```diff
- <link rel="canonical" href="https://beilunyang.github.io/dapp-inspector-extension/" />
- <link rel="alternate" hreflang="en"        href="https://beilunyang.github.io/dapp-inspector-extension/en/" />
- <link rel="alternate" hreflang="zh-Hans"   href="https://beilunyang.github.io/dapp-inspector-extension/zh/" />
- <link rel="alternate" hreflang="x-default" href="https://beilunyang.github.io/dapp-inspector-extension/" />
+ <link rel="canonical" href="/" />
+ <link rel="alternate" hreflang="en"        href="/en/" />
+ <link rel="alternate" hreflang="zh-Hans"   href="/zh/" />
+ <link rel="alternate" hreflang="x-default" href="/" />
```

Google has supported relative `rel="canonical"` since 2015; relative `hreflang` is also accepted. Both resolve against the page's own URL, so the same files work on `dapp-inspector.chain.moe`, `*.pages.dev`, or any future host.

The existing `syncCanonical()` JS in `index.html` (around line 1378) already rewrites the canonical to match `location` when the page is served from `/en/` or `/zh/`. It is preserved as-is — it now runs on top of a relative fallback rather than a hardcoded fallback, which is strictly an improvement.

### 4.2 `site/privacy.html`

```diff
- <link rel="canonical" href="https://beilunyang.github.io/dapp-inspector-extension/privacy.html" />
+ <link rel="canonical" href="/privacy.html" />
```

### 4.3 `docs/store/privacy.md`

The third line documents where the policy is hosted (used by CWS submission). Update to the real URL:

```diff
- > **Note:** Chrome Web Store requires a publicly-hosted URL pointing to this policy. The simplest setup is to push this repo to GitHub and enable GitHub Pages — the file then resolves at `https://beilunyang.github.io/dapp-inspector-extension/privacy.html` (or wherever you host it). Alternatively render this Markdown to a Gist and use the Gist's raw URL.
+ > **Note:** Chrome Web Store requires a publicly-hosted URL pointing to this policy. The published copy is at `https://dapp-inspector.chain.moe/privacy.html`, served from `site/privacy.html` via Cloudflare Pages.
```

---

## 5. Cloudflare Pages dashboard configuration (one-time, manual)

Performed by the repo owner in the Cloudflare dashboard:

1. **Workers & Pages → Create → Pages → Connect to Git.**
2. Select repo `beilunyang/dapp-inspector-extension`.
3. **Project name:** `dapp-inspector` (drives the staging subdomain `dapp-inspector.pages.dev`; choose a different name only if it's already taken).
4. **Build settings:**
   - Production branch: `main`
   - Framework preset: **None**
   - Build command: *(empty)*
   - Build output directory: `site`
   - Root directory: `/`
   - Environment variables: *(none)*
5. **Save and Deploy.** First run produces `dapp-inspector.pages.dev`.
6. **Custom domains → Set up a custom domain → `dapp-inspector.chain.moe`.** DNS is auto-validated (zone is on CF). Cert issues in 1–2 min.
7. *(Optional)* **Settings → Builds & deployments → Preview deployments.** Disable "Pull requests" if PR previews are not wanted; default-on is harmless.

---

## 6. Trade-off accepted: no path filter

CF Pages Git Integration deploys on every push to `main`, regardless of which paths changed. There is no native path filter. This is the explicit trade-off for choosing Git Integration over a GitHub Action with `paths: ['site/**']`.

Cost: a no-op static upload (~10–20 s) on every `main` push, even when only `src/` or `tests/` changed. Acceptable because there is no build step and CF Pages free tier covers this at order-of-magnitude headroom.

If this becomes a problem later, the escape hatch is to switch to `cloudflare/wrangler-action@v3` triggered by `paths: ['site/**']`. The codebase changes here (move to `site/`, relative URLs) make that switch trivial — only the deploy mechanism is replaced.

---

## 7. Decommission GitHub Pages

- **Repo Settings → Pages → Source → None** (manual, by repo owner).
- Delete `docs/.nojekyll` from the repo (was only needed by Jekyll-aware GH Pages serving).
- No need to remove redirects: the old `beilunyang.github.io/dapp-inspector-extension/` URL becomes a 404 once Pages is disabled, which is fine — no inbound traffic depends on it (project pre-launch, no external links).

---

## 8. README updates

`README.md` and `README.zh-CN.md` currently link only to `github.com/...` (repo, releases, build badge). Add one line under the badge block linking to the live site and privacy policy:

- EN: `**Site:** https://dapp-inspector.chain.moe · **Privacy:** https://dapp-inspector.chain.moe/privacy.html`
- ZH: `**官网:** https://dapp-inspector.chain.moe · **隐私政策:** https://dapp-inspector.chain.moe/privacy.html`

No new sections, no chrome — one line each, badge-area adjacent.

---

## 9. Acceptance criteria

- `site/{index,privacy,en/index,zh/index}.html` exist; identical bytes to the originals except the canonical/alternate edits in §4.
- `docs/{index,privacy,en/index,zh/index}.html` no longer exist (moved, not copied).
- `docs/.nojekyll` does not exist.
- `grep -rn "beilunyang.github.io" -- src tests docs README.md README.zh-CN.md` returns zero matches.
- `pnpm typecheck && pnpm lint && pnpm test:run` still pass (this change should not touch any of those code paths, sanity check only).
- After CF dashboard setup, `https://dapp-inspector.chain.moe/` serves the brutalist landing, `/privacy.html` serves the policy, `/en/` and `/zh/` serve their localized copies, and all four pages have a same-origin canonical link.

---

## 10. Out of scope

- Any redesign of the landing or privacy pages.
- og:url / og:image tags (currently absent; not adding).
- Sitemap or robots.txt (single-page site, low SEO surface, defer until needed).
- Analytics (project is local-first by ethos; do not add).
- Internationalizing privacy.html (currently EN-only; out of scope here).
