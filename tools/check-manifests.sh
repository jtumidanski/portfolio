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
img=$(grep -E '^[[:space:]]+(- )?image: ' "$out" | head -1 | awk '{print $NF}' || true)
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
grep -qE '^[[:space:]]*- host: tumidanski.com$' "$out" && note "host tumidanski.com" || bad "ingress host is not tumidanski.com"
grep -qE '^[[:space:]]*tls:' "$out" && bad "ingress carries a tls block (nginx-proxy-manager terminates TLS)" || note "no tls block"

if command -v kubeconform >/dev/null; then
  echo "==> kubeconform"
  kubeconform -strict -summary "$out" || bad "kubeconform"
fi

[ "$fail" -eq 0 ] && echo "OK" || { echo "FAILED"; exit 1; }
