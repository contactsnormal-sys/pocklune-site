import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(resolve(root, name), 'utf8');

test('every HTML entry applies restrictive CSP and referrer policy before loading resources', async () => {
  const pages = (await readdir(root)).filter((name) => name.endsWith('.html'));
  assert.equal(pages.length, 14);
  for (const page of pages) {
    const html = await read(page);
    const meta = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    assert.ok(meta, page);
    assert.match(meta[1], /default-src 'none'/);
    assert.match(meta[1], /object-src 'none'/);
    assert.match(meta[1], /base-uri 'none'/);
    assert.doesNotMatch(meta[1], /unsafe-inline|unsafe-eval|frame-ancestors|\*/);
    assert.match(html, /<meta name="referrer" content="strict-origin-when-cross-origin">/);
    assert.ok(html.indexOf(meta[0]) < html.indexOf('<link'), page);
    assert.doesNotMatch(html, /<style|\sstyle=|\son\w+=/i, page);
    for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      assert.match(script[1], /src="\.\//, page);
      assert.equal(script[2].trim(), '', page);
    }
    for (const link of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)"/g)) {
      await readFile(resolve(root, link[1]));
    }
  }
});

test('legal publisher data and RGPD email are present without requiring authentication', async () => {
  const legal = await read('legal-notice.html');
  for (const value of ['2J LAMBRE', 'SASU', '5 000 EUR', 'RCS Paris', '837 878 925', 'FR30837878925', '10 rue de Penthièvre, 75008 Paris', 'Jocelyn LAMBRE', '07 81 12 21 53', 'mailto:contact@2jagency.com', 'GitHub, Inc.']) assert.ok(legal.includes(value), value);
  const privacy = await read('privacy.html');
  assert.match(privacy, /Exercice de vos droits RGPD[\s\S]*mailto:contact@2jagency\.com/);
  assert.match(privacy, /accessible sans connexion/);
});

test('HTTP-only protection requirements are explicit and are never claimed as active meta headers', async () => {
  const spec = JSON.parse(await read('security/required-response-headers.json'));
  assert.match(spec.status, /^NOT_APPLIED_/);
  assert.match(spec.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(spec.headers['X-Frame-Options'], 'DENY');
  assert.equal(spec.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(spec.headers['Strict-Transport-Security'], 'max-age=31536000');
  assert.equal(spec.headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.match(await read('security/HOSTING.md'), /pas une preuve de protection active/);
});

test('consent script uses external CSS and retains consent-gated tracker loading', async () => {
  const script = await read('analytics-consent.js');
  assert.doesNotMatch(script, /createElement\('style'\)|eval\(|new Function/);
  assert.match(script, /if \(choice === 'accept'\) loadGtm\(\)/);
  assert.match(script, /analytics_storage: 'denied'/);
  assert.match(script, /if \(previousChoice === 'accept'\) location\.reload\(\)/);
});
