# Chrome Web Store — Submission Checklist

Run top-to-bottom. Each item is either a binary "done" or a thing you have to do outside this repo (e.g. graphics, dashboard).

## 1. Code hygiene

- [x] **Unused permissions removed** — `scripting` was declared but never used; reviewers will reject. Cleaned in `manifest.config.ts`.
- [ ] **Bump `package.json` version** — every store release needs a fresh version. Currently `0.1.0`.
- [ ] **Update CHANGELOG entry** in `src/shared/changelog.ts` matching the new version (the `npm run test:run` suite asserts top entry === pkg.version).
- [ ] **Ensure no `console.log` / `console.debug` left in shipped code paths**:
  ```bash
  grep -rn "console\." src/ | grep -v "console.warn\|test\|//"
  ```

## 2. Build the upload artifact

```bash
# Clean, build, package
rm -rf dist dapp-inspector-*.zip
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:run
pnpm build

VERSION=$(node -p "require('./package.json').version")
( cd dist && zip -rq "../dapp-inspector-${VERSION}.zip" . )
ls -lh "dapp-inspector-${VERSION}.zip"
```

The CI workflow in `.github/workflows/build.yml` does the same thing — for tagged releases it auto-uploads the zip to GitHub Releases. You can grab the zip from there instead of building locally.

- [ ] Final zip is **under 10 MB** (CWS hard limit; ours is well under).
- [ ] Open the zip and visually confirm:
  - `manifest.json` has the bumped version
  - `manifest.json` has `permissions: ["tabs", "storage", "alarms"]` (no `scripting`)
  - `assets/` carries the bundled JS/CSS/fonts
  - `public/icons/{16,32,48,128}.png` are present

## 3. Graphics — must produce manually

CWS requires:

| Asset | Spec | Required? | Notes |
|---|---|---|---|
| Store icon | 128×128 PNG | yes | Already in `public/icons/128.png` — reuse. |
| Small promo tile | 440×280 PNG/JPEG | **yes** | Mascot on accent gradient with name; no screenshot. |
| Large promo tile | 920×680 PNG/JPEG | optional | Same theme, more space for tagline. |
| Marquee promo tile | 1400×560 PNG/JPEG | optional | Skip unless aiming for featured-extension placement. |
| Screenshots | 1280×800 or 640×400 PNG/JPEG, 1–5 of them | yes | At least 1, recommend 3–5. |

### Suggested screenshots

1. **Panel — captured calls list with one selected** showing decoded view + risk badges.
2. **Detail tab — Decoded** for a real `approve(MaxUint256)` so the `UNLIMITED APPROVAL` warning is visible.
3. **Detail tab — Timing breakdown** for a contrasting fast/slow call.
4. **Mock rule editor** in the Options page.
5. **Popup** showing favicon, chain name, recent activity sparkline.

### Capture recipe

```bash
# Use Chrome's built-in capture
# 1. Load the unpacked extension
# 2. Open a DApp on Ethereum mainnet (e.g. app.uniswap.org)
# 3. F12 → DApp Inspector tab
# 4. Cmd+Shift+P → "Capture full size screenshot"
# 5. Crop to 1280×800 in any image editor
```

## 4. Dashboard fields

Open https://chrome.google.com/webstore/devconsole/ → New item → upload the zip.

Then fill (paste from `docs/store/listing.md`):

- [ ] **Item name** — `DApp Inspector`
- [ ] **Short description** (132 chars) — see listing.md, EN copy
- [ ] **Detailed description** — see listing.md, EN copy. Add ZH translation under "Add a new language" → Chinese (Simplified).
- [ ] **Category** — `Developer Tools`
- [ ] **Language** — English (United States) primary, Chinese (Simplified) secondary
- [ ] **Store icon** — upload `public/icons/128.png`
- [ ] **Screenshots** — upload 3–5 from step 3
- [ ] **Small promo tile** — upload your 440×280

## 5. Privacy practices tab

Paste verbatim from `docs/store/permissions.md`:

- [ ] **Single purpose** — single-purpose box
- [ ] **Permission justification** — one box per permission (`tabs`, `storage`, `alarms`, `host_permissions`)
- [ ] **Remote code** — Yes/No: **No**, with the explanation from permissions.md
- [ ] **Data usage** — tick boxes per the table in permissions.md
- [ ] **Privacy policy URL** — public URL where `docs/store/privacy.md` is hosted (GitHub Pages, Gist, or your own site)

## 6. Distribution

- [ ] **Visibility** — `Public` (or `Unlisted` for first soft launch — invite-only via direct URL)
- [ ] **Geographic distribution** — `All regions` (or pick a subset)
- [ ] **Pricing** — Free
- [ ] **Mature content** — No

## 7. Submit

- [ ] Click **Submit for review**
- [ ] First submission usually takes **3–7 business days**. Subsequent updates can be < 24h if no permission changes.
- [ ] Watch the developer dashboard email for any rejection note — the most common one for tools like this is "permission justification insufficient" (which `docs/store/permissions.md` should already cover).

## 8. Post-publish

- [ ] Tag the release: `git tag v0.1.0 && git push origin v0.1.0` — GitHub Actions workflow builds + attaches the zip to a GitHub Release.
- [ ] Update the `chrome_web_store` link in `src/options/sections/About.tsx` (currently `https://chromewebstore.google.com/`) to the actual store URL.
- [ ] Add a `Chrome Web Store` badge to the README.

---

**Reviewer-tripping things to know about this codebase**

- `<all_urls>` host permission is the most-scrutinised flag. The justification copy in permissions.md is specifically worded to address the standard reviewer concern: *"why does a wallet inspector need to run on every page?"* The honest answer (DApps live on arbitrary URLs, the EIP-1193 wrapper must beat the DApp's own initialisation) is in there.
- The extension makes outbound network requests to Sourcify and chainid.network. The privacy policy must enumerate these — already covered in privacy.md.
- The extension does not load remote JavaScript (rule MV3-only). All code ships in the package. State this explicitly when prompted.
