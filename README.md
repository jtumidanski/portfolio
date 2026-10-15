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
