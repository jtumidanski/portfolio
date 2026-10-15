# tumidanski.com portfolio site — design

Date: 2026-10-15
Status: approved in conversation, awaiting spec review

## 1. Goal

A single-page, professional landing site at `https://tumidanski.com` that
introduces the owner, links to their professional profiles, and links to the
applications they self-host. It is for two audiences at once: recruiters and
professional contacts who want a quick read on who the owner is, and
friends/family/the owner themselves who use it as a launchpad to the apps.

Success looks like:

- A visitor on a phone or desktop sees name, title, photo, a short bio, a
  tech stack, and a grid of app cards without scrolling confusion.
- Every push to `main` on the forge ends with the new build live in the
  cluster, with no manual step.
- Content changes (bio text, a new app card, a new social link) touch exactly
  one file.

Out of scope: blog, CMS, analytics, contact form, live status indicators on
the app cards, an Atlas card (the owner has no public source link for it and
is undecided about listing it).

## 2. Repository and hosting

- New repository `jtumidanski/portfolio` on the forge
  (`https://git.tumidanski/jtumidanski/portfolio.git`). Public.
- Mirrored to GitHub (`jtumidanski/portfolio`) by adding a line to
  `k3s/ci/push-mirrors.txt` and running `scripts/push_mirrors.sh` from the
  k3s repo, following that file's "before adding a mirror" checklist. The
  forge is the source of truth; GitHub is a push mirror only.
- Source and manifests live together in this repo, following the MyFleet
  pattern: the k3s repo holds only the Argo CD `Application` that points
  here.

## 3. Site stack

- Astro (latest stable), static output, zero client-side JavaScript. No
  framework integration (no React); components are `.astro` files.
- Tailwind CSS v4 via `@tailwindcss/vite`.
- Geist Variable via `@fontsource-variable/geist`, matching home-hub.
- Icons: inline SVG for the three social icons (LinkedIn, GitHub, email) and
  the external-link arrow. No icon library dependency.
- Node 24, npm, `package-lock.json` committed.

## 4. Content model

All content lives in `src/content/site.ts` and is exported as a single typed
object. Components read from it and contain no literal copy.

```ts
export interface Social { label: string; href: string; icon: 'linkedin' | 'github' | 'email' }
export interface App {
  name: string;
  description: string;   // one or two sentences
  liveUrl?: string;      // the running instance; omitted when there is no public one
  sourceUrl: string;     // the GitHub repo
}
export interface Site {
  name: string;          // "J. Tumidanski" until the owner supplies the real display name
  title: string;         // e.g. "Software Engineer"
  tagline: string;       // one line under the title
  bio: string[];         // paragraphs, rendered in order
  photo: string;         // path under public/, e.g. "/me.jpg"
  photoAlt: string;
  socials: Social[];
  stack: string[];       // chip labels, rendered in order
  apps: App[];
  footer: { k3sRepoUrl: string };
}
```

Seed values:

- `socials`: LinkedIn (URL to be supplied by the owner; placeholder
  `https://www.linkedin.com/in/jtumidanski`), GitHub
  `https://github.com/jtumidanski`, email `mailto:jtumidanski@gmail.com`.
- `stack`: Go, TypeScript, React, Kubernetes, PostgreSQL, Kafka, Traefik,
  Argo CD. Drawn from what the owner's repos actually use.
- `apps`, in this order:
  1. home-hub — `https://home-hub.tumidanski.com` —
     `https://github.com/jtumidanski/home-hub`
  2. MyFleet — `https://myfleet.tumidanski.com` —
     `https://github.com/jtumidanski/MyFleet`
  3. Harbormaster — live URL to be supplied by the owner (placeholder
     `https://harbormaster.tumidanski.com`) —
     `https://github.com/jtumidanski/Harbormaster`
- `bio`: two placeholder paragraphs clearly marked for the owner to rewrite.
- `photo`: `/me.jpg`. The repo ships a neutral placeholder image at
  `public/me.jpg` until the owner replaces it. The build must not depend on
  the real photo.

Placeholders are acceptable for the first merge; the spec requires that
replacing them is a content-file edit only.

## 5. Page layout (approved mockup: "B, split hero, wide grid")

Single route `/`. Max content width 860px, centered, 36px horizontal padding
on desktop, 20px on mobile. Sections top to bottom:

1. **Hero.** Photo (120px circle) on the left, text block on the right:
   name as `h1`, title in the accent color, tagline, then a row of 34px
   square social icon buttons. On viewports under 640px the hero stacks
   vertically and centers.
2. **About and Stack**, side by side in a 1.4fr / 1fr grid. About is the bio
   paragraphs. Stack is a wrapping row of pill chips. Under 768px the two
   stack vertically, About first.
3. **What I run.** Section label, then a grid of app cards: three columns at
   768px and up, two columns from 480px, one column below. Each card is a
   flex column: name (`h3`), description, then a button row pinned to the
   bottom with `margin-top: auto`. Cards in a row stretch to equal height so
   the button rows of all cards in a row align regardless of description
   length. This was an explicit review requirement.
   Buttons: **Open** (filled, accent) opens `liveUrl` and is omitted when the
   app has none (amended 2026-10-15: Harbormaster has no public instance, and
   a dead Open link is worse than no button); **Source** (outlined) opens
   `sourceUrl`. Both open in a new tab with `rel="noopener noreferrer"`.
4. **Footer.** Left: "© {year} {name}". Right: "Self-hosted on k3s" linking to
   the k3s repo on GitHub.

Section labels (About, Stack, What I run) are small uppercase tracked text.

### Theme

Nord palette, applied with CSS custom properties. The visitor's
`prefers-color-scheme` selects the scheme; dark is the default when there is
no preference. No toggle.

| Token | Dark | Light |
|---|---|---|
| page background | `#2E3440` (nord0) | `#ECEFF4` (nord6) |
| card background | `#3B4252` (nord1) | `#E5E9F0` (nord5) |
| card border | `#434C5E` (nord2) | `#D8DEE9` (nord4) |
| section rule | `#3B4252` | `#D8DEE9` |
| heading text | `#ECEFF4` | `#2E3440` |
| body text | `#D8DEE9` | `#3B4252` |
| muted text | `#D8DEE9` at reduced emphasis / `#9aa5b8` for dim | `#4C566A` / `#5A6577` for dim |
| accent | `#88C0D0` (nord8) | `#44679A` (nord10 darkened) |

Amended 2026-10-15 after review: the light accent and dim values are darkened
from nord10 `#5E81AC` and `#6b7589` so every text/background pair meets WCAG
AA 4.5:1 (nord10 on nord6 is 3.5:1). `test/contrast.test.ts` pins this.
| accent foreground | `#2E3440` | `#ECEFF4` |
| avatar fallback gradient | nord10 → nord8 | nord10 → nord9 |

The accent is used for the title line under the name, the filled Open
button, and the footer link. Primary button text is 600 weight.

### Metadata

`<title>` is `{name} — {title}`. Meta description is the tagline. Open Graph
title, description, and image (the photo) are set. A `favicon.svg` with the
owner's initials in Nord colors ships in `public/`. `lang="en"`.

## 6. Build, container, and CI

### Container

`Dockerfile` at the repo root, same shape as home-hub's frontend:

- Stage 1 `node:24-alpine`: `npm ci`, `npm run build` → `dist/`.
- Stage 2 `nginxinc/nginx-unprivileged:alpine` (amended 2026-10-15 after
  review; MyFleet's `web` is the reference): runs as uid 101, copy `dist/` to
  `/usr/share/nginx/html`, copy `nginx.conf` to
  `/etc/nginx/conf.d/default.conf`, expose 8080. The Deployment runs it with
  `runAsNonRoot`, `readOnlyRootFilesystem`, all capabilities dropped, and a
  tmpfs on `/tmp`.

`nginx.conf`: `listen 8080`, `root /usr/share/nginx/html`, `try_files $uri
$uri/ =404` (no SPA fallback; it is a static site), `/_astro/` served with
`Cache-Control: public, max-age=31536000, immutable`, everything else
`Cache-Control: public, max-age=300`. Gzip on for text types.

### Workflows (`.forgejo/workflows/`)

Pinned action SHAs copied from home-hub and MyFleet. Runners are the forge's
host-mode runners; builds use `https://git.tumidanski/ci/actions/buildx-build@v1`
against the in-cluster buildkitd, selected with
`ci/actions/select-amd64-builder`.

**`pr.yml`** on `pull_request`: checkout, setup-node 24 with npm cache under
`/work/ci-cache/npm`, `npm ci`, `npm run lint`, `npm run check` (`astro
check`), `npm test`, `npm run build`. A second job validates manifests with
`kubectl kustomize deploy/k8s/overlays/main` and `kubeconform`.

**`main.yml`** on `push` to `main`, with `paths-ignore:
deploy/k8s/overlays/main/**`:

1. `verify`: the same steps as `pr.yml`.
2. `publish`: build and push
   `registry.tumidanski/jtumidanski/portfolio:<sha>` for `linux/amd64`. Runs
   concurrently with `verify`; a SHA-tagged image is inert until the overlay
   references it.
3. `bump-overlay` (needs `verify`, `publish`): checkout `main` with
   `secrets.FORGE_PUSH_TOKEN`, rewrite the single `newTag:` in
   `deploy/k8s/overlays/main/kustomization.yaml` to `github.sha`, and commit
   with `[skip ci]`. Carries MyFleet's two guards: exit early if already
   converged, and exit early if `main`'s tip is no longer this run's SHA.

Required forge secrets: `ZOT_CI_PASSWORD`, `FORGE_PUSH_TOKEN`. Both already
exist for MyFleet and are reused.

### Tests

Vitest, kept deliberately small:

- `src/content/site.test.ts`: every `href`, `liveUrl`, `sourceUrl`, and
  `k3sRepoUrl` parses as an absolute `https:` or `mailto:` URL; every app has
  a non-empty name, description, and both URLs; `name`, `title`, `tagline`
  are non-empty; `bio` has at least one paragraph; `stack` has no duplicates.
- `test/build.test.ts`: runs after `astro build` (the npm `test` script runs
  the build first), reads `dist/index.html`, and asserts it contains the
  site name, each app name, each social `href`, and both `Open` and `Source`
  links per app.

`npm run lint` is ESLint with the Astro plugin; `npm run check` is
`astro check`.

## 7. Deployment

### Manifests (`deploy/k8s/`)

```
deploy/k8s/
  base/
    kustomization.yaml
    namespace.yaml      # portfolio
    deployment.yaml     # 1 replica, image registry.tumidanski/jtumidanski/portfolio:latest
    service.yaml        # ClusterIP :80
    ingress.yaml        # host tumidanski.com, path / Prefix -> service:80
  overlays/
    main/
      kustomization.yaml   # namespace: portfolio; images: newTag: <sha>
```

- Deployment: `imagePullPolicy: IfNotPresent` (the tag is a SHA, so the
  image never changes under a tag), liveness and readiness `GET /` on port
  80, requests `cpu: 10m, memory: 32Mi`, limits `memory: 64Mi`.
- Ingress: a `networking.k8s.io/v1` Ingress with host `tumidanski.com`,
  exactly as home-hub declares the root domain today. No TLS block:
  nginx-proxy-manager terminates the public Let's Encrypt certificate and
  forwards to the cluster's Traefik, which routes by host. The existing
  nginx-proxy-manager entry for `tumidanski.com` therefore needs no change.
- No Secrets, no PVCs.

### Argo CD

`k3s/bee/argocd-apps/portfolio.yml`: `Application` `portfolio-main`,
`repoURL https://git.tumidanski/jtumidanski/portfolio.git`, `targetRevision
main`, `path deploy/k8s/overlays/main`, destination namespace `portfolio`,
`automated: { selfHeal: true, prune: true }`, `ServerSideApply=true`,
`CreateNamespace=true`. Modelled on `myfleet.yml`. The repo is public so no
repo-creds Secret is needed.

### Monitoring

Add a `tumidanski.com` HTTPS monitor to `k3s/bee/uptime-kuma/monitors.yaml`
and push it with `bee/uptime-kuma/reconcile.py`. The k3s README notes that
monitors for externally-hosted manifests are maintained by hand; this is one
of those.

## 8. Migrating home-hub off the root domain

Order chosen by the owner: move home-hub first, then land the portfolio.

1. **home-hub PR.** In `deploy/k8s/ingress.yaml`, change the second rule's
   host from `tumidanski.com` to `home-hub.tumidanski.com`. Nothing else in
   home-hub references the domain (verified by grep across Go, TypeScript,
   YAML, and Markdown), so auth cookies are host-scoped and existing sessions
   simply require a fresh login at the new host.
2. **Out-of-band, done by the owner before merging step 1:**
   - DNS: an A or CNAME record for `home-hub.tumidanski.com` pointing at the
     same public endpoint as `tumidanski.com`.
   - nginx-proxy-manager: a proxy host for `home-hub.tumidanski.com`
     forwarding to the cluster Traefik, with a Let's Encrypt certificate
     requested. nginx-proxy-manager state lives in its database, not in git,
     so this is a UI step.
   - Add a `home-hub.tumidanski.com` monitor to uptime-kuma.
3. Merge step 1. Verify home-hub at `https://home-hub.tumidanski.com`.
   Between this point and step 4, `https://tumidanski.com` returns a 404
   from Traefik. The owner accepted that gap.
4. **k3s PR.** Add `bee/argocd-apps/portfolio.yml` and the uptime-kuma
   monitor. Merge. Argo CD syncs the portfolio; its Ingress claims
   `tumidanski.com`.
5. Verify `https://tumidanski.com` serves the portfolio in both color schemes
   and on a phone.

## 9. Repository layout

```
portfolio/
  .forgejo/workflows/{pr.yml,main.yml}
  deploy/k8s/{base,overlays/main}/
  docs/superpowers/specs/2026-10-15-portfolio-site-design.md
  public/{me.jpg,favicon.svg}
  src/
    content/site.ts
    content/site.test.ts
    components/{Hero,About,Stack,Apps,AppCard,Footer}.astro
    layouts/Base.astro
    pages/index.astro
    styles/global.css      # Tailwind import + Nord custom properties
  test/build.test.ts
  Dockerfile
  nginx.conf
  astro.config.mjs
  eslint.config.js
  package.json
  tsconfig.json
  vitest.config.ts
  README.md
  .gitignore               # node_modules, dist, .astro, .superpowers
  renovate.json            # same base config as the other repos
```

## 10. Open items the owner supplies later

None block implementation; each is a one-line edit to `src/content/site.ts`
or a file drop into `public/`:

- Real display name and title.
- LinkedIn URL.
- Bio paragraphs.
- Photo (`public/me.jpg`, roughly square, at least 480px).
- Harbormaster live URL.
