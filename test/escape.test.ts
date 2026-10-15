import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
    symlinkSync(join(root, 'node_modules'), join(sandbox, 'node_modules'));
    const content = join(sandbox, 'src/content/site.ts');
    const src = readFileSync(content, 'utf8')
      .replace(/tagline:\s*'[^']*'/, "tagline: 'Hostile <b>tag</b> & ampersand'")
      // Also the first bio paragraph, rendered by a different component.
      .replace(/bio:\s*\[\s*'[^']*'/, "bio: [\n    'Bio <i>para</i> & more'");
    if (!src.includes('Hostile <b>tag</b>') || !src.includes('Bio <i>para</i>')) {
      throw new Error('fixture substitution did not match site.ts; update the regexes');
    }
    writeFileSync(content, src);
    // Run from inside the sandbox: Astro keeps its prerender staging dir
    // relative to cwd, and a cwd on another filesystem than the outDir
    // fails the final rename with EXDEV (seen on the CI runners, whose
    // workspace and /tmp are different mounts).
    execFileSync(join(root, 'node_modules/.bin/astro'), ['build'], { cwd: sandbox, stdio: 'pipe' });
    const html = readFileSync(join(sandbox, 'dist/index.html'), 'utf8');
    // Rendered as a text node: entities, never an element.
    expect(html).toContain('>Hostile &lt;b&gt;tag&lt;/b&gt; &amp; ampersand<');
    // A <b> element directly inside element content would be live markup.
    // Inside an attribute value (meta content="...") a bare < is inert and
    // the HTML spec does not require escaping it, so only element content
    // is checked.
    expect(html).not.toMatch(/>[^<]*<b>tag<\/b>/);
    expect(html).toContain('>Bio &lt;i&gt;para&lt;/i&gt; &amp; more<');
    expect(html).not.toMatch(/>[^<]*<i>para<\/i>/);
  }, 120_000);
});
