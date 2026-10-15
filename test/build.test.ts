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

  it('renders every app with Source, and Open only when there is a live URL', () => {
    const safeLink = (href: string) =>
      new RegExp(`<a[^>]*href="${escapeAttr(href)}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>`);
    for (const a of site.apps) {
      expect(html).toContain(a.name);
      expect(html, `Source link for ${a.name}`).toMatch(safeLink(a.sourceUrl));
      if (a.liveUrl !== undefined) {
        expect(html, `Open link for ${a.name}`).toMatch(safeLink(a.liveUrl));
      }
    }
    const openCount = (html.match(/>Open ↗</g) ?? []).length;
    expect(openCount).toBe(site.apps.filter((a) => a.liveUrl !== undefined).length);
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
