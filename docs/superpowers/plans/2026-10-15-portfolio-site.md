# tumidanski.com Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-page Astro portfolio at `https://tumidanski.com`, built and deployed to the bee k3s cluster from the forge on every push to `main`, and move home-hub to `homehub.tumidanski.com`.

**Architecture:** A static Astro site (no client JS) whose copy lives in one typed content file. CI builds an nginx image tagged with the commit SHA, pushes it to the zot registry, and pins that SHA into a kustomize overlay that Argo CD syncs. Three repos change: `portfolio` (new, everything), `home-hub` (one ingress host), `k3s` (Argo Application, uptime monitor, mirror line).

**Tech Stack:** Astro 7, Tailwind CSS 4 (`@tailwindcss/vite`), Geist Variable, Vitest 5, ESLint 9 + `eslint-plugin-astro`, Node 24, nginx:alpine, kustomize, Forgejo Actions, Argo CD.

**Spec:** `docs/superpowers/specs/2026-10-15-portfolio-site-design.md`

## Global Constraints

- Node 24, npm, `package-lock.json` committed. `node_modules/`, `dist/`, `.astro/`, `.superpowers/` gitignored.
- Zero client-side JavaScript in `dist/`: no `<script>` tags in `dist/index.html`.
- All human-readable copy comes from `src/content/site.ts`. Components contain no literal copy except static labels ("About", "Stack", "What I run", "Open", "Source", "Self-hosted on k3s", "©").
- Nord palette only, with exact hex values from spec §5. Dark is the default; `@media (prefers-color-scheme: light)` overrides.
- App cards: flex column, button row pinned with `margin-top: auto`, rows stretch to equal height.
- External links: `target="_blank" rel="noopener noreferrer"`.
- Image name `registry.tumidanski/jtumidanski/portfolio`; tags are the full commit SHA only. Deployment namespace `portfolio`. Ingress host `tumidanski.com`, no TLS block.
- Action pins (copy verbatim):
  - `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1`
  - `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0`
  - `actions/cache@27d5ce7f107fe9357f9df03efb73ab90386fccae # v5.0.5`
  - `https://git.tumidanski/ci/actions/select-amd64-builder@v1`
  - `https://git.tumidanski/ci/actions/buildx-build@v1`
- Forge secrets reused from MyFleet: `ZOT_CI_PASSWORD`, `FORGE_PUSH_TOKEN`.
- Commits end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- The k3s repo's default branch is `master`; home-hub's and portfolio's are `main`.

## Review Focus

1. **A card description three times longer than its neighbors** must not push its Open/Source row below the other cards' rows. Pinned by the CSS in Task 4 and checked by eye in Task 10 step 3 (the seed content gives MyFleet the longest description on purpose).
2. **A `mailto:` social link** must pass content validation and render as a plain anchor, not get rewritten. Pinned by `site.test.ts` accepting `mailto:` and `build.test.ts` asserting the `mailto:` href appears verbatim (Task 3, Task 4).
3. **The photo path in content pointing at a file that does not exist in `public/`** must fail the build test, not ship a broken image. Pinned by `build.test.ts` asserting `dist/<photo>` exists (Task 4).
4. **An ampersand or angle bracket in a bio paragraph** must render escaped, not as markup. Pinned by a content fixture test in Task 4 that builds with a `<b>` in the tagline and asserts `&lt;b&gt;` in `dist/index.html`. (Astro escapes by default; the test guards against someone switching to `set:html`.)
5. **The kustomize overlay with a stale or missing `newTag`** must be caught before Argo sees it. Pinned by `tools/check-manifests.sh` asserting exactly one `newTag:` and that the rendered image reference is not `:latest` (Task 6).

---

### Task 1: Project scaffold that builds

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/pages/index.astro`, `README.md`, `renovate.json`
- Modify: `.gitignore` (already has the four entries; verify)

**Interfaces:**
- Produces: `Base.astro` with props `{ title: string; description: string; ogImage: string }` and a default `<slot />`. CSS custom properties listed in step 4, exposed to Tailwind as `bg-bg`, `bg-card`, `border-cardb`, `border-rule`, `text-fg`, `text-body`, `text-muted`, `text-dim`, `text-accent`, `bg-accent`, `text-accent-fg`.

- [ ] **Step 1: Create a working branch**

```bash
cd /home/tumidanski/source/portfolio
git checkout -b feat/initial-site
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "portfolio",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "eslint .",
    "test": "astro build && vitest run",
    "test:unit": "vitest run src"
  },
  "dependencies": {
    "@fontsource-variable/geist": "^5.3.0",
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^7.3.8",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.10",
    "@eslint/js": "^9.39.0",
    "eslint": "^9.39.0",
    "eslint-plugin-astro": "^3.2.1",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.50.0",
    "vitest": "^5.0.4"
  }
}
```

- [ ] **Step 3: Write `astro.config.mjs` and `tsconfig.json`**

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://tumidanski.com',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
});
```

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"]
}
```

- [ ] **Step 4: Write `src/styles/global.css` with the Nord tokens**

```css
@import "tailwindcss";
@import "@fontsource-variable/geist";

/* Nord. Dark is the default; light only when the visitor asks for it. */
:root {
  --bg: #2E3440;        /* nord0 */
  --card: #3B4252;      /* nord1 */
  --cardb: #434C5E;     /* nord2 */
  --rule: #3B4252;      /* nord1 */
  --fg: #ECEFF4;        /* nord6 */
  --body: #D8DEE9;      /* nord4 */
  --muted: #D8DEE9;     /* nord4 */
  --dim: #9aa5b8;
  --accent: #88C0D0;    /* nord8 */
  --accent-fg: #2E3440; /* nord0 */
  --avatar-from: #5E81AC; /* nord10 */
  --avatar-to: #88C0D0;   /* nord8 */
  color-scheme: dark;
}

@media (prefers-color-scheme: light) {
  :root {
    --bg: #ECEFF4;        /* nord6 */
    --card: #E5E9F0;      /* nord5 */
    --cardb: #D8DEE9;     /* nord4 */
    --rule: #D8DEE9;      /* nord4 */
    --fg: #2E3440;        /* nord0 */
    --body: #3B4252;      /* nord1 */
    --muted: #4C566A;     /* nord3 */
    --dim: #6b7589;
    --accent: #5E81AC;    /* nord10 */
    --accent-fg: #ECEFF4; /* nord6 */
    --avatar-from: #5E81AC; /* nord10 */
    --avatar-to: #81A1C1;   /* nord9 */
    color-scheme: light;
  }
}

@theme inline {
  --font-sans: "Geist Variable", ui-sans-serif, system-ui, sans-serif;
  --color-bg: var(--bg);
  --color-card: var(--card);
  --color-cardb: var(--cardb);
  --color-rule: var(--rule);
  --color-fg: var(--fg);
  --color-body: var(--body);
  --color-muted: var(--muted);
  --color-dim: var(--dim);
  --color-accent: var(--accent);
  --color-accent-fg: var(--accent-fg);
}

html { background: var(--bg); color: var(--fg); font-family: var(--font-sans); }
```

- [ ] **Step 5: Write `src/layouts/Base.astro`**

```astro
---
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
  ogImage: string;
}
const { title, description, ogImage } = Astro.props;
const ogImageUrl = new URL(ogImage, Astro.site).toString();
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={ogImageUrl} />
    <meta property="og:type" content="website" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  </head>
  <body class="min-h-screen bg-bg text-fg antialiased">
    <main class="mx-auto max-w-[860px] px-5 py-10 sm:px-9">
      <slot />
    </main>
  </body>
</html>
```

- [ ] **Step 6: Write a minimal `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
---
<Base title="Portfolio" description="Placeholder" ogImage="/me.jpg">
  <h1 class="text-3xl font-semibold tracking-tight">Hello</h1>
</Base>
```

- [ ] **Step 7: Write `renovate.json`**

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["local>renovate/presets"],
  "enabledManagers": ["npm", "github-actions", "dockerfile"],
  "automerge": false,
  "labels": ["dependencies"],
  "minimumReleaseAge": "7 days",
  "packageRules": [
    { "matchManagers": ["npm"], "matchUpdateTypes": ["minor", "patch"], "groupName": "npm dependencies (non-major)" },
    { "matchManagers": ["github-actions"], "matchUpdateTypes": ["minor", "patch"], "groupName": "GitHub Actions (non-major)" },
    { "matchManagers": ["dockerfile"], "matchUpdateTypes": ["patch"], "groupName": "Dockerfile base images (patch)" },
    { "matchUpdateTypes": ["major"], "automerge": false, "labels": ["dependencies", "major"] }
  ],
  "osvVulnerabilityAlerts": true
}
```

- [ ] **Step 8: Write `README.md`**

```markdown
# portfolio

The landing page at https://tumidanski.com. Astro, Tailwind, no client JS.

## Edit the content

Everything a visitor reads is in `src/content/site.ts`. The photo is
`public/me.jpg`. Change either, push to `main`, and CI deploys it.

## Develop

    npm ci
    npm run dev        # http://localhost:4321
    npm run lint
    npm run check      # astro check
    npm test           # builds, then runs content + build tests

## Deploy

Push to `main`. `.forgejo/workflows/main.yml` builds
`registry.tumidanski/jtumidanski/portfolio:<sha>` and pins the SHA into
`deploy/k8s/overlays/main/kustomization.yaml`; Argo CD (`portfolio-main` in
the k3s repo) syncs it into the `portfolio` namespace.

Design spec: `docs/superpowers/specs/2026-10-15-portfolio-site-design.md`.
```

- [ ] **Step 9: Install and build**

Run:
```bash
cd /home/tumidanski/source/portfolio
npm install
npm run build
grep -c "<script" dist/index.html || true
ls dist
```
Expected: build succeeds, `dist/index.html` exists, the grep count is `0`. If `npm install` reports a peer or engine conflict on a version above, pick the newest version that satisfies it and update `package.json` to match; do not downgrade Astro below 7 or Tailwind below 4.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json src renovate.json README.md .gitignore
git commit -m "feat: scaffold Astro site with Nord theme tokens

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Lint and type-check tooling

**Files:**
- Create: `eslint.config.js`, `vitest.config.ts`

**Interfaces:**
- Produces: `npm run lint`, `npm run check`, `npm run test:unit` all exit 0 on the scaffold.

- [ ] **Step 1: Write `eslint.config.js`**

```js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', '.astro', 'node_modules']),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
]);
```

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Run the three commands**

Run:
```bash
npm run lint && npm run check && npm run test:unit
```
Expected: lint exits 0 with no findings; `astro check` reports 0 errors; vitest reports "No test files found" and exits 0 (if vitest exits non-zero on no files, add `passWithNoTests: true` under `test` in `vitest.config.ts`).

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js vitest.config.ts package.json package-lock.json
git commit -m "chore: add eslint, astro check, vitest config

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Content model with validation tests

**Files:**
- Create: `src/content/site.ts`, `src/content/site.test.ts`, `public/me.jpg`, `public/favicon.svg`

**Interfaces:**
- Produces: `export const site: Site` and the `Site`, `Social`, `App` types from spec §4, consumed verbatim by every component in Task 4.

- [ ] **Step 1: Write the failing test `src/content/site.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { site } from './site';

const isAbsolute = (href: string) => {
  const u = new URL(href); // throws on relative
  return u.protocol === 'https:' || u.protocol === 'mailto:';
};

describe('site content', () => {
  it('has the required identity fields', () => {
    expect(site.name.trim()).not.toBe('');
    expect(site.title.trim()).not.toBe('');
    expect(site.tagline.trim()).not.toBe('');
    expect(site.bio.length).toBeGreaterThan(0);
    for (const p of site.bio) expect(p.trim()).not.toBe('');
    expect(site.photo).toMatch(/^\/[^/]/);
    expect(site.photoAlt.trim()).not.toBe('');
  });

  it('has only absolute https or mailto social links', () => {
    expect(site.socials.length).toBeGreaterThan(0);
    for (const s of site.socials) {
      expect(s.label.trim()).not.toBe('');
      expect(isAbsolute(s.href), s.href).toBe(true);
    }
  });

  it('includes a mailto social', () => {
    expect(site.socials.some((s) => s.href.startsWith('mailto:'))).toBe(true);
  });

  it('has a stack with no duplicates', () => {
    expect(site.stack.length).toBeGreaterThan(0);
    expect(new Set(site.stack).size).toBe(site.stack.length);
  });

  it('has complete app cards with unique names', () => {
    expect(site.apps.length).toBeGreaterThan(0);
    for (const a of site.apps) {
      expect(a.name.trim()).not.toBe('');
      expect(a.description.trim()).not.toBe('');
      expect(isAbsolute(a.liveUrl), a.liveUrl).toBe(true);
      expect(isAbsolute(a.sourceUrl), a.sourceUrl).toBe(true);
      expect(a.liveUrl.startsWith('https:')).toBe(true);
      expect(a.sourceUrl.startsWith('https:')).toBe(true);
    }
    expect(new Set(site.apps.map((a) => a.name)).size).toBe(site.apps.length);
  });

  it('links the k3s repo in the footer', () => {
    expect(site.footer.k3sRepoUrl.startsWith('https:')).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/content/site.test.ts`
Expected: FAIL, "Failed to resolve import './site'".

- [ ] **Step 3: Write `src/content/site.ts`**

```ts
export interface Social {
  label: string;
  href: string;
  icon: 'linkedin' | 'github' | 'email';
}

export interface App {
  name: string;
  description: string;
  liveUrl: string;
  sourceUrl: string;
}

export interface Site {
  name: string;
  title: string;
  tagline: string;
  bio: string[];
  photo: string;
  photoAlt: string;
  socials: Social[];
  stack: string[];
  apps: App[];
  footer: { k3sRepoUrl: string };
}

// Everything a visitor reads lives here. Placeholders are marked TODO(owner).
export const site: Site = {
  name: 'J. Tumidanski', // TODO(owner): real display name
  title: 'Software Engineer', // TODO(owner)
  tagline: 'I build backend systems in Go and run a small homelab on k3s. This is my corner of the internet.', // TODO(owner)
  bio: [
    'TODO(owner): Paragraph one. Who you are, what you work on day to day, and what you care about in software.',
    'TODO(owner): Paragraph two. The homelab, the side projects, and why you self-host.',
  ],
  photo: '/me.jpg',
  photoAlt: 'Portrait of J. Tumidanski',
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jtumidanski', icon: 'linkedin' }, // TODO(owner): confirm URL
    { label: 'GitHub', href: 'https://github.com/jtumidanski', icon: 'github' },
    { label: 'Email', href: 'mailto:jtumidanski@gmail.com', icon: 'email' },
  ],
  stack: ['Go', 'TypeScript', 'React', 'Kubernetes', 'PostgreSQL', 'Kafka', 'Traefik', 'Argo CD'],
  apps: [
    {
      name: 'home-hub',
      description: 'Household dashboard: calendar, recipes, shopping, packages, workouts.',
      liveUrl: 'https://homehub.tumidanski.com',
      sourceUrl: 'https://github.com/jtumidanski/home-hub',
    },
    {
      name: 'MyFleet',
      description:
        'Vehicle fleet tracking with maintenance logs, service reminders, document storage, and photo media for every vehicle in the household.',
      liveUrl: 'https://myfleet.tumidanski.com',
      sourceUrl: 'https://github.com/jtumidanski/MyFleet',
    },
    {
      name: 'Harbormaster',
      description: 'Admin console for S3-compatible object stores.',
      liveUrl: 'https://harbormaster.tumidanski.com', // TODO(owner): confirm public URL
      sourceUrl: 'https://github.com/jtumidanski/Harbormaster',
    },
  ],
  footer: { k3sRepoUrl: 'https://github.com/jtumidanski/k3s' },
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/site.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Generate the placeholder photo and favicon**

Run (Pillow 12 is installed on this machine):
```bash
mkdir -p public
python3 -I - <<'EOF'
from PIL import Image, ImageDraw
img = Image.new("RGB", (480, 480), "#3B4252")
d = ImageDraw.Draw(img)
d.ellipse((40, 40, 440, 440), fill="#5E81AC")
img.save("public/me.jpg", quality=85)
EOF
```

Write `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#2E3440"/>
  <text x="32" y="42" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif" font-size="28" font-weight="700" fill="#88C0D0">JT</text>
</svg>
```

Verify: `file public/me.jpg` reports a JPEG, 480x480.

- [ ] **Step 6: Commit**

```bash
git add src/content public/me.jpg public/favicon.svg
git commit -m "feat: typed site content with validation tests

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Page components and build test

**Files:**
- Create: `src/components/Hero.astro`, `src/components/SocialIcon.astro`, `src/components/About.astro`, `src/components/Stack.astro`, `src/components/AppCard.astro`, `src/components/Apps.astro`, `src/components/Footer.astro`, `src/components/SectionLabel.astro`, `test/build.test.ts`, `test/escape.test.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `site` from `src/content/site.ts`; `Base.astro` from Task 1.
- Produces: `dist/index.html` with the structure the build test asserts.

- [ ] **Step 1: Write the failing build test `test/build.test.ts`**

```ts
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { site } from '../src/content/site';

const dist = join(process.cwd(), 'dist');
const html = readFileSync(join(dist, 'index.html'), 'utf8');

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;');

describe('built index.html', () => {
  it('contains the identity', () => {
    expect(html).toContain(site.name);
    expect(html).toContain(site.title);
    expect(html).toContain(`<title>${site.name} — ${site.title}</title>`);
  });

  it('ships no client JavaScript', () => {
    expect(html).not.toMatch(/<script\b/);
  });

  it('links every social verbatim', () => {
    for (const s of site.socials) {
      expect(html).toContain(`href="${escapeAttr(s.href)}"`);
    }
  });

  it('renders every app with Open and Source links that open safely', () => {
    for (const a of site.apps) {
      expect(html).toContain(a.name);
      const open = new RegExp(
        `<a[^>]*href="${escapeAttr(a.liveUrl)}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>`,
      );
      const source = new RegExp(
        `<a[^>]*href="${escapeAttr(a.sourceUrl)}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>`,
      );
      expect(html, `Open link for ${a.name}`).toMatch(open);
      expect(html, `Source link for ${a.name}`).toMatch(source);
    }
  });

  it('renders every stack chip', () => {
    for (const s of site.stack) expect(html).toContain(`>${s}<`);
  });

  it('ships the photo and favicon it references', () => {
    expect(html).toContain(`src="${site.photo}"`);
    expect(existsSync(join(dist, site.photo))).toBe(true);
    expect(existsSync(join(dist, 'favicon.svg'))).toBe(true);
  });

  it('sets Open Graph tags', () => {
    expect(html).toContain('property="og:image" content="https://tumidanski.com' + site.photo + '"');
  });
});
```

- [ ] **Step 2: Build and run it to verify it fails**

Run: `npm run build && npx vitest run test/build.test.ts`
Expected: FAIL on "contains the identity" (the scaffold page says "Hello").

- [ ] **Step 3: Write `src/components/SectionLabel.astro`**

```astro
---
interface Props { text: string }
const { text } = Astro.props;
---
<h2 class="mt-9 mb-3 text-xs font-medium uppercase tracking-[0.12em] text-dim">{text}</h2>
```

- [ ] **Step 4: Write `src/components/SocialIcon.astro`**

```astro
---
import type { Social } from '../content/site';
interface Props { social: Social }
const { social } = Astro.props;
const isMail = social.href.startsWith('mailto:');
---
<a
  href={social.href}
  aria-label={social.label}
  title={social.label}
  target={isMail ? undefined : '_blank'}
  rel={isMail ? undefined : 'noopener noreferrer'}
  class="inline-flex size-[34px] items-center justify-center rounded-lg border border-cardb bg-card text-muted transition-colors hover:text-accent"
>
  {social.icon === 'linkedin' && (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/></svg>
  )}
  {social.icon === 'github' && (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z"/></svg>
  )}
  {social.icon === 'email' && (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  )}
</a>
```

- [ ] **Step 5: Write `src/components/Hero.astro`**

```astro
---
import { site } from '../content/site';
import SocialIcon from './SocialIcon.astro';
---
<header class="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
  <img
    src={site.photo}
    alt={site.photoAlt}
    width="120"
    height="120"
    class="size-[120px] shrink-0 rounded-full object-cover"
  />
  <div>
    <h1 class="text-3xl font-semibold tracking-tight text-fg">{site.name}</h1>
    <p class="mt-1 font-medium text-accent">{site.title}</p>
    <p class="mt-3 max-w-prose leading-relaxed text-body">{site.tagline}</p>
    <div class="mt-4 flex justify-center gap-2.5 sm:justify-start">
      {site.socials.map((s) => <SocialIcon social={s} />)}
    </div>
  </div>
</header>
```

- [ ] **Step 6: Write `About.astro`, `Stack.astro`**

```astro
---
// src/components/About.astro
import { site } from '../content/site';
import SectionLabel from './SectionLabel.astro';
---
<section>
  <SectionLabel text="About" />
  {site.bio.map((p) => <p class="mb-2.5 text-sm leading-[1.65] text-body">{p}</p>)}
</section>
```

```astro
---
// src/components/Stack.astro
import { site } from '../content/site';
import SectionLabel from './SectionLabel.astro';
---
<section>
  <SectionLabel text="Stack" />
  <ul class="flex flex-wrap gap-2">
    {site.stack.map((s) => (
      <li class="rounded-full border border-cardb bg-card px-2.5 py-1 text-xs text-body">{s}</li>
    ))}
  </ul>
</section>
```

- [ ] **Step 7: Write `AppCard.astro` and `Apps.astro`**

The card is a flex column; the description takes the slack; the button row gets `mt-auto`. The grid uses `items-stretch` (the default for CSS grid, stated explicitly) so cards in a row are equal height.

```astro
---
// src/components/AppCard.astro
import type { App } from '../content/site';
interface Props { app: App }
const { app } = Astro.props;
---
<li class="flex h-full flex-col rounded-xl border border-cardb bg-card p-4">
  <h3 class="text-[15px] font-semibold text-fg">{app.name}</h3>
  <p class="mt-1.5 mb-3.5 flex-1 text-[13px] leading-relaxed text-muted">{app.description}</p>
  <div class="mt-auto flex gap-2">
    <a
      href={app.liveUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-accent-fg transition-opacity hover:opacity-90"
    >Open ↗</a>
    <a
      href={app.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      class="rounded-lg border border-cardb px-2.5 py-1.5 text-xs text-body transition-colors hover:text-accent"
    >Source</a>
  </div>
</li>
```

```astro
---
// src/components/Apps.astro
import { site } from '../content/site';
import AppCard from './AppCard.astro';
import SectionLabel from './SectionLabel.astro';
---
<section>
  <SectionLabel text="What I run" />
  <ul class="grid grid-cols-1 items-stretch gap-3.5 min-[480px]:grid-cols-2 md:grid-cols-3">
    {site.apps.map((app) => <AppCard app={app} />)}
  </ul>
</section>
```

- [ ] **Step 8: Write `Footer.astro`**

```astro
---
import { site } from '../content/site';
const year = new Date().getFullYear();
---
<footer class="mt-9 flex justify-between border-t border-rule pt-4 text-xs text-dim">
  <span>© {year} {site.name}</span>
  <a href={site.footer.k3sRepoUrl} target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Self-hosted on k3s ↗</a>
</footer>
```

- [ ] **Step 9: Replace `src/pages/index.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import Hero from '../components/Hero.astro';
import About from '../components/About.astro';
import Stack from '../components/Stack.astro';
import Apps from '../components/Apps.astro';
import Footer from '../components/Footer.astro';
import { site } from '../content/site';
---
<Base title={`${site.name} — ${site.title}`} description={site.tagline} ogImage={site.photo}>
  <Hero />
  <div class="grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr]">
    <About />
    <Stack />
  </div>
  <Apps />
  <Footer />
</Base>
```

- [ ] **Step 10: Build, run the build test, lint, check**

Run: `npm run lint && npm run check && npm test`
Expected: all pass; the build test reports 7 passing. If the `<title>` assertion fails because Astro collapses whitespace differently, adjust only the test's expected string to the exact rendered form and keep the em dash.

- [ ] **Step 11: Write the escaping test `test/escape.test.ts`**

This builds a second time with a hostile tagline into a temp outDir and checks the markup is escaped.

```ts
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const sandbox = mkdtempSync(join(tmpdir(), 'portfolio-escape-'));

afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

describe('copy is HTML-escaped', () => {
  it('renders a <b> in the tagline as text, not markup', () => {
    for (const f of ['package.json', 'astro.config.mjs', 'tsconfig.json', 'src', 'public']) {
      cpSync(join(root, f), join(sandbox, f), { recursive: true });
    }
    const content = join(sandbox, 'src/content/site.ts');
    const src = readFileSync(content, 'utf8').replace(
      /tagline: '[^']*'/,
      "tagline: 'Hostile <b>tag</b> & ampersand'",
    );
    writeFileSync(content, src);
    execFileSync('npx', ['astro', 'build', '--root', sandbox], {
      cwd: root,
      stdio: 'pipe',
      env: { ...process.env, NODE_PATH: join(root, 'node_modules') },
    });
    const html = readFileSync(join(sandbox, 'dist/index.html'), 'utf8');
    expect(html).toContain('Hostile &lt;b&gt;tag&lt;/b&gt; &amp; ampersand');
    expect(html).not.toContain('<b>tag</b>');
  }, 120_000);
});
```

- [ ] **Step 12: Run it**

Run: `npx vitest run test/escape.test.ts`
Expected: PASS. If `astro build --root` cannot resolve `node_modules` from the sandbox, symlink instead: add `symlinkSync(join(root, 'node_modules'), join(sandbox, 'node_modules'))` after the copy loop and drop the `NODE_PATH` env.

- [ ] **Step 13: Commit**

```bash
git add src test
git commit -m "feat: hero, about, stack, app cards, footer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Container image

**Files:**
- Create: `Dockerfile`, `nginx.conf`, `.dockerignore`

**Interfaces:**
- Produces: an image that serves `dist/` on port 80 and answers `GET /` with 200.

- [ ] **Step 1: Write `.dockerignore`**

```
node_modules
dist
.astro
.superpowers
.git
docs
deploy
test
```

- [ ] **Step 2: Write `nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_types text/html text/css application/javascript image/svg+xml text/plain;

    location /_astro/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "public, max-age=300";
        try_files $uri $uri/ =404;
    }
}
```

- [ ] **Step 3: Write `Dockerfile`**

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /build

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /build/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 4: Build and smoke-test locally**

Run:
```bash
docker build -t portfolio:local .
docker run -d --rm --name portfolio-smoke -p 18080:80 portfolio:local
sleep 1
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18080/
curl -s -D - -o /dev/null http://localhost:18080/ | grep -i cache-control
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:18080/does-not-exist
docker stop portfolio-smoke
```
Expected: `200`, `Cache-Control: public, max-age=300`, `404`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile nginx.conf .dockerignore
git commit -m "build: nginx container image

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Kubernetes manifests with a check script

**Files:**
- Create: `deploy/k8s/base/kustomization.yaml`, `deploy/k8s/base/namespace.yaml`, `deploy/k8s/base/deployment.yaml`, `deploy/k8s/base/service.yaml`, `deploy/k8s/base/ingress.yaml`, `deploy/k8s/overlays/main/kustomization.yaml`, `tools/check-manifests.sh`

**Interfaces:**
- Produces: `kustomize build deploy/k8s/overlays/main` renders Namespace, Deployment, Service, Ingress. `tools/check-manifests.sh` exits 0. The overlay's single `newTag:` line is what `main.yml` rewrites in Task 7 (the sed pattern there is `^(    newTag: ).*$`, four-space indent, so keep that indentation).

- [ ] **Step 1: Write the check script first (it is the test)**

`tools/check-manifests.sh`:
```bash
#!/usr/bin/env bash
# Render the main overlay and assert the invariants Argo CD relies on.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v kustomize >/dev/null || { echo "FAIL: kustomize not on PATH"; exit 1; }

fail=0
note() { echo "  $1"; }
bad() { echo "  FAIL: $1"; fail=1; }

out=/tmp/portfolio-main.yaml
echo "==> rendering deploy/k8s/overlays/main"
if ! kustomize build deploy/k8s/overlays/main > "$out" 2>/tmp/portfolio-main.err; then
  bad "overlay does not render"; sed 's/^/    /' /tmp/portfolio-main.err; exit 1
fi
note "renders"

echo "==> expected resource set"
for kind in Namespace Deployment Service Ingress; do
  n=$(grep -c "^kind: $kind$" "$out" || true)
  [ "$n" -eq 1 ] && note "1 $kind" || bad "expected 1 $kind, got $n"
done
for kind in Secret PersistentVolumeClaim; do
  n=$(grep -c "^kind: $kind$" "$out" || true)
  [ "$n" -eq 0 ] && note "no $kind" || bad "renders $n $kind (expected 0)"
done

echo "==> image is SHA-pinned"
img=$(grep -E '^\s+image: ' "$out" | head -1 | awk '{print $2}')
case "$img" in
  registry.tumidanski/jtumidanski/portfolio:*) note "image $img" ;;
  *) bad "unexpected image $img" ;;
esac
case "$img" in
  *:latest|*:main) bad "image is tagged $img; must be a commit SHA" ;;
esac
n=$(grep -c '^    newTag: ' deploy/k8s/overlays/main/kustomization.yaml || true)
[ "$n" -eq 1 ] && note "overlay has exactly one newTag" || bad "overlay has $n newTag lines (expected 1)"

echo "==> ingress host"
grep -q '^\s*- host: tumidanski.com$' "$out" && note "host tumidanski.com" || bad "ingress host is not tumidanski.com"
grep -q '^\s*tls:' "$out" && bad "ingress carries a tls block (nginx-proxy-manager terminates TLS)" || note "no tls block"

if command -v kubeconform >/dev/null; then
  echo "==> kubeconform"
  kubeconform -strict -summary "$out" || bad "kubeconform"
fi

[ "$fail" -eq 0 ] && echo "OK" || { echo "FAILED"; exit 1; }
```

Run: `chmod +x tools/check-manifests.sh && tools/check-manifests.sh`
Expected: FAIL, "overlay does not render".

- [ ] **Step 2: Write the base**

`deploy/k8s/base/kustomization.yaml`:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

`deploy/k8s/base/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: portfolio
```

`deploy/k8s/base/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: portfolio
  labels:
    app: portfolio
spec:
  replicas: 1
  selector:
    matchLabels:
      app: portfolio
  template:
    metadata:
      labels:
        app: portfolio
    spec:
      containers:
        - name: portfolio
          # The overlay pins the tag to a commit SHA; this value is the seed
          # for a fresh clone and is never what the cluster runs.
          image: registry.tumidanski/jtumidanski/portfolio:latest
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 80
          livenessProbe:
            httpGet: { path: /, port: http }
            initialDelaySeconds: 3
            periodSeconds: 10
          readinessProbe:
            httpGet: { path: /, port: http }
            initialDelaySeconds: 2
            periodSeconds: 5
          resources:
            requests: { cpu: 10m, memory: 32Mi }
            limits: { memory: 64Mi }
```

`deploy/k8s/base/service.yaml`:
```yaml
apiVersion: v1
kind: Service
metadata:
  name: portfolio
spec:
  selector:
    app: portfolio
  ports:
    - name: http
      port: 80
      targetPort: http
```

`deploy/k8s/base/ingress.yaml`:
```yaml
# No tls block on purpose: nginx-proxy-manager holds the Let's Encrypt
# certificate for tumidanski.com and forwards plain HTTP to the cluster's
# Traefik, which routes by Host. Same arrangement home-hub used for the root
# domain before it moved to homehub.tumidanski.com.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: portfolio
spec:
  rules:
    - host: tumidanski.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: portfolio
                port:
                  number: 80
```

- [ ] **Step 3: Write the overlay**

`deploy/k8s/overlays/main/kustomization.yaml`:
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Synced by Argo CD Application portfolio-main (k3s repo,
# bee/argocd-apps/portfolio.yml). The bump-overlay job in
# .forgejo/workflows/main.yml rewrites newTag to each merged commit's SHA.
namespace: portfolio

resources:
  - ../../base

images:
  - name: registry.tumidanski/jtumidanski/portfolio
    newTag: 0000000000000000000000000000000000000000
```

The placeholder SHA is replaced by the first `main` run; it is forty zeros so the check script's "not latest" guard passes while making the unpinned state obvious.

- [ ] **Step 4: Run the check**

Run: `tools/check-manifests.sh`
Expected: `OK`, with each invariant listed as a `note`. If kubeconform reports the Ingress schema as missing, pass `-ignore-missing-schemas`; the networking/v1 Ingress schema is in the default catalog so this should not be needed.

- [ ] **Step 5: Commit**

```bash
git add deploy tools
git commit -m "deploy: k8s base, main overlay, manifest check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Forgejo workflows

**Files:**
- Create: `.forgejo/workflows/pr.yml`, `.forgejo/workflows/main.yml`

**Interfaces:**
- Consumes: `tools/check-manifests.sh`, the single `newTag:` line in the overlay, the forge secrets `ZOT_CI_PASSWORD` and `FORGE_PUSH_TOKEN`.
- Produces: image `registry.tumidanski/jtumidanski/portfolio:<sha>`; a bot commit `chore(deploy): pin main overlay to <sha> [skip ci]`.

- [ ] **Step 1: Write `.forgejo/workflows/pr.yml`**

```yaml
name: PR - Validate

on:
  pull_request:

jobs:
  site:
    runs-on: ubuntu-latest
    env:
      npm_config_cache: /work/ci-cache/npm
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Reset toolchain caches
        run: rm -rf /work/ci-cache

      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: '24'

      - name: Cache npm cache
        uses: actions/cache@27d5ce7f107fe9357f9df03efb73ab90386fccae # v5.0.5
        with:
          path: /work/ci-cache/npm
          key: npm-linux-x64-24-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci
      - run: npm run lint
      - run: npm run check
      - run: npm test

  manifests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
      - name: Report the toolchain
        run: kustomize version
      - name: Check manifests
        run: tools/check-manifests.sh

  image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Select an amd64 BuildKit replica
        id: amd64
        uses: https://git.tumidanski/ci/actions/select-amd64-builder@v1
        with:
          index: 0

      - name: Build image (no push)
        uses: https://git.tumidanski/ci/actions/buildx-build@v1
        with:
          context: .
          dockerfile: Dockerfile
          image: registry.tumidanski/jtumidanski/portfolio
          tags: pr-${{ github.event.pull_request.number }}
          platform: linux/amd64
          buildkit-endpoint: ${{ steps.amd64.outputs.endpoint }}
          push: 'false'
          cache-scope: portfolio-amd64
```

- [ ] **Step 2: Write `.forgejo/workflows/main.yml`**

```yaml
name: Main - Build, Publish, Deploy

# On every push to main: verify, build the image tagged with the commit SHA,
# push it to zot, then pin that SHA into the kustomize overlay so Argo CD
# rolls the Deployment. Modelled on MyFleet's main.yml; see that file for the
# reasoning behind each guard.

on:
  push:
    branches: [main]
    # Guard 1 of 2 against a self-retrigger loop: bump-overlay pushes a commit
    # that touches only this path. Guard 2 is [skip ci] in its message. The
    # convergence check inside bump-overlay is what actually terminates it.
    paths-ignore:
      - 'deploy/k8s/overlays/main/**'

env:
  REGISTRY: registry.tumidanski
  IMAGE: registry.tumidanski/jtumidanski/portfolio

jobs:
  verify:
    runs-on: ubuntu-latest
    env:
      npm_config_cache: /work/ci-cache/npm
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Reset toolchain caches
        run: rm -rf /work/ci-cache

      - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0
        with:
          node-version: '24'

      - name: Cache npm cache
        uses: actions/cache@27d5ce7f107fe9357f9df03efb73ab90386fccae # v5.0.5
        with:
          path: /work/ci-cache/npm
          key: npm-linux-x64-24-${{ hashFiles('**/package-lock.json') }}

      - run: npm ci
      - run: npm run lint
      - run: npm run check
      - run: npm test
      - name: Check manifests
        run: tools/check-manifests.sh

  # Runs concurrently with verify. A SHA-tagged image is inert until
  # bump-overlay writes the SHA into the overlay, and bump-overlay needs verify.
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Select an amd64 BuildKit replica
        id: amd64
        uses: https://git.tumidanski/ci/actions/select-amd64-builder@v1
        with:
          index: 0

      - name: Build and push
        uses: https://git.tumidanski/ci/actions/buildx-build@v1
        with:
          context: .
          dockerfile: Dockerfile
          image: ${{ env.IMAGE }}
          tags: ${{ github.sha }}
          platform: linux/amd64
          buildkit-endpoint: ${{ steps.amd64.outputs.endpoint }}
          push: 'true'
          registry: ${{ env.REGISTRY }}
          registry-username: ci
          registry-password: ${{ secrets.ZOT_CI_PASSWORD }}
          cache-scope: portfolio-amd64

  bump-overlay:
    needs: [verify, publish]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          # MUST be `ref: main`: a push-event checkout is a detached HEAD and
          # `git push` from one fails outright.
          ref: main
          token: ${{ secrets.FORGE_PUSH_TOKEN }}

      - name: Pin overlay image to this commit
        run: |
          set -euo pipefail
          f=deploy/k8s/overlays/main/kustomization.yaml

          # Convergence guard: a bot push re-triggers this workflow on
          # Forgejo, so if the overlay already pins this SHA there is nothing
          # to do.
          if grep -q "    newTag: ${{ github.sha }}" "$f"; then
            echo "overlay already pinned to ${{ github.sha }} — converged"
            exit 0
          fi

          # Stale-run guard: if main moved past this commit while this run
          # was in flight, pinning would roll the overlay backwards.
          tip="$(git rev-parse HEAD)"
          if [ "$tip" != "${{ github.sha }}" ]; then
            echo "main's tip is now $tip, not ${{ github.sha }} — skipping to avoid pinning a stale SHA"
            exit 0
          fi

          sed -i -E "s/^(    newTag: ).*$/\1${{ github.sha }}/" "$f"
          if git diff --quiet "$f"; then
            echo "nothing to bump"
            exit 0
          fi
          test "$(grep -c "    newTag: ${{ github.sha }}" "$f")" -eq 1

          git config user.name  "forge-bot"
          git config user.email "forge-bot@git.tumidanski"
          git add "$f"
          git commit -m "chore(deploy): pin main overlay to ${{ github.sha }} [skip ci]"
          git push origin main
```

- [ ] **Step 3: Lint the YAML locally**

Run: `python3 -I -c "import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]; print('ok')" .forgejo/workflows/pr.yml .forgejo/workflows/main.yml`
Expected: `ok`.

- [ ] **Step 4: Commit and push the branch**

```bash
git add .forgejo
git commit -m "ci: PR validation and main build/publish/deploy workflows

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feat/initial-site
```

- [ ] **Step 5: Open the PR on the forge and watch CI**

```bash
cat > /tmp/portfolio-pr.md <<'EOF'
Initial site: Astro + Tailwind, Nord theme, typed content file, nginx image, k8s manifests, Forgejo workflows.

Spec: docs/superpowers/specs/2026-10-15-portfolio-site-design.md
Plan: docs/superpowers/plans/2026-10-15-portfolio-site.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
tea pr create --base main --head feat/initial-site --title "Initial portfolio site" --description-file /tmp/portfolio-pr.md
```

Then check the run: `tea pr <number>` and the Actions tab at `https://git.tumidanski/jtumidanski/portfolio/actions`. All three PR jobs must be green. If the `image` job fails because the repo is private and the runner cannot clone it, the owner must first make the repo public (Task 9, manual step 1); that is also a prerequisite for Argo CD.

- [ ] **Step 6: Merge**

`tea pr merge <number>` once green. Then confirm the `main` run: `verify` and `publish` green, `bump-overlay` pushes a commit, and `git pull` on `main` shows `newTag:` equal to the merge commit SHA.

---

### Task 8: Move home-hub to homehub.tumidanski.com

**Files:**
- Modify: `/home/tumidanski/source/home-hub/deploy/k8s/ingress.yaml:207`

**Interfaces:**
- Produces: home-hub reachable at `https://homehub.tumidanski.com`; `tumidanski.com` free for Task 9.

- [ ] **Step 1: Owner prerequisites, done by hand before merging**

These cannot be done from this machine. Ask the owner to confirm each:

1. DNS: `homehub.tumidanski.com` A or CNAME record pointing at the same public endpoint as `tumidanski.com`.
2. nginx-proxy-manager: a proxy host for `homehub.tumidanski.com` forwarding to the same upstream as the existing `tumidanski.com` host, with a Let's Encrypt certificate requested and "Force SSL" matching the existing entry.
3. Optional sanity check before merging: with the DNS record live, `curl -sk -H 'Host: homehub.tumidanski.com' https://<public-ip>/` should reach Traefik and return a 404 (no ingress yet), proving the proxy path works.

- [ ] **Step 2: Branch and edit the ingress**

```bash
cd /home/tumidanski/source/home-hub
git checkout main && git pull
git checkout -b chore/move-to-homehub-subdomain
```

Edit `deploy/k8s/ingress.yaml` line 207: change `        - host: tumidanski.com` to `        - host: homehub.tumidanski.com`. Nothing else changes; the TLS block only lists the `.me` host and stays as is.

- [ ] **Step 3: Verify the diff and render**

Run:
```bash
git diff --stat
git diff | grep '^[-+]  *- host'
kubectl apply --dry-run=client -f deploy/k8s/ingress.yaml
```
Expected: one file, one changed line, `ingress.networking.k8s.io/home-hub configured (dry run)`.

- [ ] **Step 4: Commit, push, PR, merge**

```bash
git commit -am "chore(deploy): serve home-hub at homehub.tumidanski.com, freeing the root domain

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin chore/move-to-homehub-subdomain
printf 'Moves the public host from tumidanski.com to homehub.tumidanski.com so the root can serve the portfolio site. Requires the DNS record and nginx-proxy-manager proxy host for homehub.tumidanski.com to exist first.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n' > /tmp/hh-pr.md
tea pr create --base main --head chore/move-to-homehub-subdomain --title "Move public host to homehub.tumidanski.com" --description-file /tmp/hh-pr.md
```
Merge once the owner confirms step 1. Argo CD (`home-hub` Application) syncs it.

- [ ] **Step 5: Verify**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://homehub.tumidanski.com/
curl -s -o /dev/null -w "%{http_code}\n" https://tumidanski.com/
```
Expected: `200` for homehub; `404` for the root (Traefik has no route yet). Log in to home-hub at the new host and confirm it works.

---

### Task 9: Wire the portfolio into the k3s repo

**Files:**
- Create: `/home/tumidanski/source/k3s/bee/argocd-apps/portfolio.yml`
- Modify: `/home/tumidanski/source/k3s/bee/uptime-kuma/monitors.yaml` (Web group), `/home/tumidanski/source/k3s/ci/push-mirrors.txt`

**Interfaces:**
- Consumes: the portfolio repo on the forge, public, with a pinned overlay on `main` (Task 7 step 6).
- Produces: Argo Application `portfolio-main`; monitor `portfolio`; GitHub mirror.

- [ ] **Step 1: Owner prerequisites, by hand**

1. Make `jtumidanski/portfolio` public on the forge (Settings → Visibility). Push-to-create made it private, and the `tea` token lacks the scope to change it. Argo CD needs it public (no repo-creds Secret is planned) and so does the GitHub mirror.
2. Create an empty repository `jtumidanski/portfolio` on GitHub with no README, no branch protection, and Actions disabled. The mirror script creates the push mirror but not the GitHub repo.

- [ ] **Step 2: Branch**

```bash
cd /home/tumidanski/source/k3s
git checkout master && git pull
git checkout -b feat/portfolio-app
```

- [ ] **Step 3: Write `bee/argocd-apps/portfolio.yml`**

```yaml
# Portfolio site (https://tumidanski.com) Argo CD wiring.
#
# One resource: Application(portfolio-main) auto-syncs deploy/k8s/overlays/main
# from jtumidanski/portfolio main into the portfolio namespace. The overlay's
# image tag is rewritten to each merged commit's SHA by that repo's
# bump-overlay CI job, so a sync here always means a new build.
#
# The repository is public, so no repo-creds Secret is needed. The namespace
# has no Secrets and no PVCs, so prune: true is safe from the start.
#
# Apply order: requires argocd.yml to be applied first.
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: portfolio-main
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://git.tumidanski/jtumidanski/portfolio.git
    targetRevision: main
    path: deploy/k8s/overlays/main
  destination:
    server: https://kubernetes.default.svc
    namespace: portfolio
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - ServerSideApply=true
      - CreateNamespace=true
```

- [ ] **Step 4: Register it the way the other per-repo Applications are**

Run: `grep -n "myfleet" bee/argocd-apps/root.yml bee/argocd-apps/*.yml | grep -v "^bee/argocd-apps/myfleet.yml"`
If `root.yml` (or another file) lists `myfleet.yml` explicitly, add `portfolio.yml` alongside it in the same form. If per-repo Applications are picked up by directory, no edit is needed. Record which case applied in the PR description.

- [ ] **Step 5: Add the uptime-kuma monitors**

In `bee/uptime-kuma/monitors.yaml`, in the `Web` group after the `home-hub` line, add:
```yaml
      - { name: portfolio,    type: http, url: "https://tumidanski.com" }
      - { name: home-hub-com, type: http, url: "https://homehub.tumidanski.com" }
```
These go through the public path (nginx-proxy-manager, real certificate) so no `ignoreTls`.

- [ ] **Step 6: Add the mirror line**

Append to `ci/push-mirrors.txt`:
```
jtumidanski/portfolio        jtumidanski/portfolio        jtumidanski
```

- [ ] **Step 7: Run the repo's CI checks locally**

Run: `ls scripts/ && python3 -I scripts/check_repo_invariants.py 2>&1 | tail -5`
Also run whatever `ci/workflows` or `tests/` invoke for monitor drift (`grep -rn monitor tests/ ci/workflows | head`), and run that check. Expected: all pass. The monitor-drift check cannot see the portfolio Ingress (it lives in another repo), which is why the monitor is added by hand.

- [ ] **Step 8: Commit, push, PR**

```bash
git add bee/argocd-apps/portfolio.yml bee/uptime-kuma/monitors.yaml ci/push-mirrors.txt
git commit -m "feat(apps): portfolio-main Argo app, monitors, GitHub mirror

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push -u origin feat/portfolio-app
printf 'Adds the portfolio-main Argo CD Application (syncs jtumidanski/portfolio main into the portfolio namespace), uptime-kuma monitors for tumidanski.com and homehub.tumidanski.com, and the GitHub push-mirror line.\n\nPrerequisites: home-hub PR moving off the root domain is merged; the portfolio repo is public on the forge; empty jtumidanski/portfolio exists on GitHub.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)\n' > /tmp/k3s-pr.md
tea pr create --base master --head feat/portfolio-app --title "Add portfolio site to the cluster" --description-file /tmp/k3s-pr.md
```
Merge after Task 8 step 5 is verified.

- [ ] **Step 9: Push the monitors and the mirror**

```bash
cd /home/tumidanski/source/k3s && git checkout master && git pull
UK_USER=admin UK_PASS=... venv/bin/python bee/uptime-kuma/reconcile.py --monitors bee/uptime-kuma/monitors.yaml
FORGEJO_TOKEN=... MIRROR_PAT_JTUMIDANSKI="$(cat ~/.forge-mirror-jtumidanski)" scripts/push_mirrors.sh
```
The owner supplies `UK_PASS` and `FORGEJO_TOKEN` (see `bee/uptime-kuma/README.md` and the "Mirror to GitHub" section of the k3s README for where they live). Expected: reconcile reports the two monitors created; the mirror script reports one mirror created and the GitHub `main` head equals the forge's.

---

### Task 10: End-to-end verification

**Files:** none.

- [ ] **Step 1: Argo CD synced**

Run: `kubectl -n argocd get application portfolio-main -o jsonpath='{.status.sync.status} {.status.health.status}{"\n"}'`
Expected: `Synced Healthy`. If `OutOfSync` persists, see the k3s README gotcha about ApplicationSet directory generators not requeueing; a manual refresh of the root Application fixes it.

- [ ] **Step 2: The pod and the route**

Run:
```bash
kubectl -n portfolio get deploy,pod,svc,ingress
kubectl -n portfolio get deploy portfolio -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
curl -s -o /dev/null -w "%{http_code}\n" https://tumidanski.com/
curl -s https://tumidanski.com/ | grep -c "<script" || true
```
Expected: 1/1 ready; the image tag equals the latest `main` SHA in the portfolio repo; `200`; script count `0`.

- [ ] **Step 3: Visual check in a browser (owner or screenshot)**

Open `https://tumidanski.com` and confirm, in both OS color schemes and at a phone width:

1. Nord colors, Geist font, photo renders.
2. The three app cards sit in one row on desktop, and all three Open/Source rows are on the same baseline even though MyFleet's description is longest.
3. On a narrow phone the hero stacks and centers, About comes before Stack, cards are one column.
4. Every link opens: three socials, six app buttons, the k3s footer link.

- [ ] **Step 4: Monitors green**

Check uptime-kuma shows `portfolio` and `home-hub-com` up.

- [ ] **Step 5: Hand the owner the content checklist**

Tell the owner the five `TODO(owner)` items in `src/content/site.ts` and `public/me.jpg`, and that each is a one-line edit plus push to `main`.
