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
    const src = readFileSync(content, 'utf8').replace(
      /tagline: '[^']*'/,
      "tagline: 'Hostile <b>tag</b> & ampersand'",
    );
    writeFileSync(content, src);
    execFileSync('npx', ['astro', 'build', '--root', sandbox], { cwd: root, stdio: 'pipe' });
    const html = readFileSync(join(sandbox, 'dist/index.html'), 'utf8');
    // Rendered as a text node: entities, never an element.
    expect(html).toContain('>Hostile &lt;b&gt;tag&lt;/b&gt; &amp; ampersand<');
    // A <b> element directly inside element content would be live markup.
    // Inside an attribute value (meta content="...") a bare < is inert and
    // the HTML spec does not require escaping it, so only element content
    // is checked.
    expect(html).not.toMatch(/>[^<]*<b>tag<\/b>/);
  }, 120_000);
});
