import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (name) => readFile(resolve(root, name), 'utf8');
const htmlPages = async (directory = '') => {
  const pages = [];
  for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
    if (['.git', 'node_modules'].includes(entry.name)) continue;
    const name = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) pages.push(...await htmlPages(name));
    else if (entry.name.endsWith('.html') && !/^google[0-9a-f]+\.html$/.test(entry.name)) pages.push(name); // Search Console verification token file must stay byte-exact
  }
  return pages.sort();
};

test('every HTML entry applies restrictive CSP and referrer policy before loading resources', async () => {
  const pages = await htmlPages();
  assert.ok(pages.length >= 14, 'all existing and future HTML pages are checked');
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
    if (html.includes('<script')) assert.ok(html.indexOf(meta[0]) < html.indexOf('<script'), page);
    assert.doesNotMatch(html, /<style|\sstyle=|\son\w+=/i, page);
    for (const script of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (script[1].trim() === 'type="application/ld+json"') {
        const data = JSON.parse(script[2]);
        assert.equal(data['@context'], 'https://schema.org', page);
        continue; // Données structurées non exécutables ; la CSP reste inchangée.
      }
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
  assert.match(privacy, /Exercice de vos droits RGPD/);
  assert.match(privacy, /mailto:contact@2jagency\.com/);
  assert.match(privacy, /accessible sans connexion/);
});

test('privacy covers purposes, legal bases, retention, rights and sourced transfer safeguards', async () => {
  const privacy = await read('privacy.html');
  for (const value of ['2J LAMBRE', 'Finalités et bases légales', '6.1.a', '6.1.b', '6.1.c', '6.1.f', 'Durées de conservation', 'accès', 'rectification', 'effacement', 'opposition', 'limitation', 'portabilité', 'retrait du consentement', '3 place de Fontenoy TSA 80715 75334 Paris Cedex 07', 'Supabase', 'RevenueCat', 'OpenAI', 'États-Unis', 'clauses contractuelles types', 'Data Privacy Framework']) assert.ok(privacy.includes(value), value);
  for (const url of ['https://www.cnil.fr/', 'https://supabase.com/legal/customer-resources/data-processing-addendum', 'https://www.revenuecat.com/privacy', 'https://www.revenuecat.com/dpa', 'https://openai.com/policies/data-processing-addendum/', 'https://developers.openai.com/api/docs/guides/your-data', 'https://policies.google.com/privacy/frameworks?hl=fr']) assert.ok(privacy.includes(`href="${url}"`), url);
  assert.match(privacy, /Aucun SDK Firebase ou Google Analytics n’est intégré à l’application/);
  assert.match(privacy, /région effectivement choisie[\s\S]*n’est pas attestée/);
  assert.match(privacy, /store: false/);
  assert.match(privacy, /journaux de prévention des abus/);
  assert.match(privacy, /ne constitue pas[\s\S]*preuve de purge automatique/);
});

test('support and legal phone are callable, GitHub address is sourced, public pages omit beta distribution', async () => {
  for (const name of ['support.html', 'legal-notice.html']) {
    const html = await read(name);
    assert.match(html, /href="tel:\+33781122153">07 81 12 21 53<\/a>/, name);
  }
  const legal = await read('legal-notice.html');
  assert.match(legal, /88 Colin P\. Kelly Jr\. St\., San Francisco, CA 94107/);
  assert.match(legal, /href="https:\/\/docs\.github\.com\/en\/site-policy\/privacy-policies\/github-general-privacy-statement#contact-us"/);
  for (const page of await htmlPages()) assert.doesNotMatch(await read(page), /testflight/i, page);
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
