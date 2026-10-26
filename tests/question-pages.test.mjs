import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://contactsnormal-sys.github.io/pocklune-site/';
const stores = [
  'https://apps.apple.com/app/id6807771884',
  'https://play.google.com/store/apps/details?id=com.pocklune.app',
];
const pages = [
  { lang: 'fr', file: 'application-budget-sans-connexion-bancaire.html', home: 'index.html' },
  { lang: 'en', file: 'envelope-budget-app-no-bank-link.html', home: 'en.html' },
  { lang: 'es', file: 'app-presupuesto-sin-banco.html' },
];
const read = (file) => {
  assert.ok(existsSync(resolve(root, file)), `Fichier attendu : ${file}`);
  return readFileSync(resolve(root, file), 'utf8');
};
const decode = (value) => value
  .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const text = (html) => decode(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
const jsonNodes = (html) => [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .flatMap((match) => {
    const block = JSON.parse(match[1]);
    return block['@graph'] || [block];
  });

// Régressions visées : langue erronée, FAQ divergente, lien mort,
// données commerciales chiffrées ou script de consentement oublié.
for (const page of pages) {
  test(`${page.lang} : métadonnées locales, langues réciproques et réponse directe`, () => {
    const html = read(page.file);
    assert.match(html, new RegExp(`<html lang="${page.lang}"`));
    assert.ok(html.includes(`<link rel="canonical" href="${base}${page.file}">`));
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]+">/);
    assert.equal([...html.matchAll(/<h1>/g)].length, 1);
    assert.match(html, /<\/h1>\s*<p class="lead">[^<]*Pocklune[^<]*<\/p>/);
    for (const target of pages) {
      assert.ok(html.includes(`<link rel="alternate" hreflang="${target.lang}" href="${base}${target.file}">`));
    }
    assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${base}envelope-budget-app-no-bank-link.html">`));
    assert.ok(html.includes('<script defer src="./analytics-consent.js"></script>'));
    assert.ok(html.includes('<link rel="stylesheet" href="./assets/analytics-consent.css">'));
    for (const store of stores) assert.ok(html.includes(`class="store-button" href="${store}"`));
  });

  test(`${page.lang} : FAQ structurée identique aux questions et réponses affichées`, () => {
    const html = read(page.file);
    const visible = [...html.matchAll(/<details class="card"><summary><h3>([\s\S]*?)<\/h3><\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
      .map((match) => ({ question: text(match[1]), answer: text(match[2]) }));
    assert.ok(visible.length >= 4 && visible.length <= 6, 'Quatre à six réponses consultables');
    const nodes = jsonNodes(html);
    assert.equal(nodes.filter((node) => node['@type'] === 'FAQPage').length, 1);
    const faq = nodes.find((node) => node['@type'] === 'FAQPage');
    assert.deepEqual(faq.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })), visible);
    const app = nodes.find((node) => node['@type'] === 'SoftwareApplication');
    assert.ok(app, 'Description structurée de l’application');
    assert.equal(app.name, 'Pocklune');
    assert.equal(app.applicationCategory, 'FinanceApplication');
    assert.deepEqual(app.operatingSystem, ['iOS', 'Android']);
    assert.equal(app.inLanguage, page.lang);
    assert.equal(app.url, base + page.file);
    assert.deepEqual(app.downloadUrl, stores);
    assert.deepEqual(app.sameAs, stores);
    assert.ok(!JSON.stringify(nodes).match(/"(?:offers|price|priceCurrency)"/));
  });

  test(`${page.lang} : ressources et liens internes résolus, sans contenu exclu`, () => {
    const html = read(page.file);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = new URL(decode(match[1]), base + page.file);
      if (url.origin !== new URL(base).origin || !url.pathname.startsWith('/pocklune-site/')) continue;
      const local = decodeURIComponent(url.pathname.slice('/pocklune-site/'.length)) || 'index.html';
      const localHtml = read(local);
      if (url.hash && local.endsWith('.html')) assert.ok(localHtml.includes(`id="${url.hash.slice(1)}"`), url.href);
    }
    assert.ok(!/\b(?:I\u0041|A\u0049)\b|intelligence artificielle/i.test(html), 'Vocabulaire exclu absent');
    assert.ok(!/[\u20ac\u0024]|\bE\u0055R\b|\d+[,.]\d{2}/i.test(html), 'Aucun tarif ni montant');
  });
}

test('les accueils exposent les nouvelles réponses et la version espagnole sans tarif chiffré', () => {
  for (const page of pages.filter((item) => item.home)) {
    const html = read(page.home);
    assert.ok(html.includes(`href="./${page.file}"`));
    assert.match(html, /href="\.\/app-presupuesto-sin-banco.html"[^>]*>Español<\/a>/);
    assert.ok(!/[\u20ac\u0024]|\bE\u0055R\b/.test(html), 'Renvoi aux stores à la place des tarifs');
    const faq = jsonNodes(html).find((node) => node['@type'] === 'FAQPage');
    const visible = [...html.matchAll(/<details class="card"><summary><h3>(.*?)<\/h3><\/summary><p>(.*?)<\/p><\/details>/g)]
      .map((match) => ({ question: text(match[1]), answer: text(match[2]) }));
    assert.deepEqual(faq.mainEntity.map((item) => ({ question: item.name, answer: item.acceptedAnswer.text })), visible);
  }
});

test('sitemap et llms rendent les trois langues accessibles avec le nom actuel', () => {
  const sitemap = read('sitemap.xml');
  const llms = read('llms.txt');
  assert.ok(llms.includes('Pocklune : Budget enveloppes'));
  assert.ok(llms.includes('Pocklune: Envelope Budget'));
  assert.ok(!llms.includes('Pocklune : Budget privé'));
  for (const page of pages) {
    assert.ok(llms.includes(base + page.file));
    assert.ok(sitemap.includes(`<url><loc>${base}${page.file}</loc><lastmod>2026-10-26</lastmod></url>`));
  }
});
