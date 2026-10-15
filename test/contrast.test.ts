import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// WCAG 2.x relative luminance and contrast ratio.
const lum = (hex: string) => {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a: string, b: string) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const css = readFileSync(join(process.cwd(), 'src/styles/global.css'), 'utf8');
const block = (name: 'dark' | 'light') => {
  const src = name === 'light' ? css.slice(css.indexOf('prefers-color-scheme: light')) : css.slice(0, css.indexOf('@media'));
  const tokens: Record<string, string> = {};
  for (const m of src.matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens[m[1]] = m[2];
  return tokens;
};

describe.each(['dark', 'light'] as const)('%s scheme contrast (WCAG AA)', (scheme) => {
  const t = block(scheme);
  it('text on the page background is at least 4.5:1', () => {
    for (const k of ['fg', 'body', 'muted', 'dim', 'accent']) {
      expect(ratio(t[k], t.bg), `${k} ${t[k]} on bg ${t.bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('text on cards is at least 4.5:1', () => {
    for (const k of ['fg', 'body', 'muted']) {
      expect(ratio(t[k], t.card), `${k} ${t[k]} on card ${t.card}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('accent button text is at least 4.5:1', () => {
    expect(ratio(t['accent-fg'], t.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
