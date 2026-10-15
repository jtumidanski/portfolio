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
