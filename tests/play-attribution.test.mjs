import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const calculator = readFileSync(new URL('../budget-calculator.js', import.meta.url), 'utf8');
const defaultPlayUrl = 'https://play.google.com/store/apps/details?id=com.pocklune.app&utm_source=pocklune_site&utm_medium=seo_tool&utm_campaign=calcul_reste_a_depenser';
const landing = 'https://contactsnormal-sys.github.io/pocklune-site/calcul-reste-a-depenser.html';

function playLinks(query, hrefs = [defaultPlayUrl, defaultPlayUrl]) {
  const links = hrefs.map((href) => ({ href }));
  const document = {
    querySelectorAll(selector) {
      assert.equal(selector, 'a[data-analytics-event="play_store_click"]');
      return links;
    },
    querySelector() {
      return null; // The calculator form is irrelevant to attribution.
    },
  };
  runInNewContext(calculator, { document, window: { location: { href: landing + query } }, URL, Set });
  return links.map(({ href }) => new URL(href));
}

test('known Facebook and YouTube campaigns reach both Play CTAs with their source', () => {
  for (const [source, campaign] of [
    ['facebook', 'cinq_donnees_20260928'],
    ['facebook', 'carrousel_six_images_20260929'],
    ['youtube', 'cinq_donnees_20260928'],
    ['youtube', 'balance_reveal_20260922'],
    ['youtube', 'carrousel_dynamique_v4_20260929'],
    ['youtube', 'carrousel_dynamique_v5_20260929'],
  ]) {
    const links = playLinks(`?utm_source=${source}&utm_medium=profile&utm_campaign=${campaign}`);
    assert.equal(links.length, 2);
    for (const link of links) {
      assert.equal(link.hostname, 'play.google.com');
      assert.equal(link.searchParams.get('id'), 'com.pocklune.app');
      assert.equal(link.searchParams.get('utm_source'), source);
      assert.equal(link.searchParams.get('utm_medium'), 'calculator');
      assert.equal(link.searchParams.get('utm_campaign'), campaign);
    }
  }
});

test('direct traffic and unrecognized labels retain the generic campaign', () => {
  for (const query of ['', '?utm_source=facebook&utm_campaign=unknown', '?utm_source=unknown&utm_campaign=cinq_donnees_20260928']) {
    for (const link of playLinks(query)) {
      assert.equal(link.href, defaultPlayUrl);
    }
  }
});

test('campaign labels are never copied to a non-Play destination', () => {
  const foreign = 'https://example.com/?id=com.pocklune.app';
  const [link] = playLinks('?utm_source=facebook&utm_campaign=cinq_donnees_20260928', [foreign]);
  assert.equal(link.href, foreign);
});

test('studio FR assets retain their distinct labels only on their YouTube route', () => {
  for (const campaign of ['studio_cinq_chiffres_05', 'studio_par_jour_06']) {
    for (const link of playLinks(`?utm_source=youtube&utm_medium=profile&utm_campaign=${campaign}&qa=codex_internal`)) {
      assert.equal(link.searchParams.get('utm_campaign'), campaign);
      assert.equal(link.searchParams.get('utm_source'), 'youtube');
      assert.equal(link.searchParams.get('utm_medium'), 'calculator');
      assert.equal(link.searchParams.has('qa'), false);
    }
    for (const link of playLinks(`?utm_source=facebook&utm_campaign=${campaign}`)) {
      assert.equal(link.href, defaultPlayUrl);
    }
  }
});

test('calculator handoff explains re-entry and the destination instead of implying a transfer', () => {
  const html = readFileSync(new URL('../calcul-reste-a-depenser.html', import.meta.url), 'utf8');
  const handoff = html.split('id="calculator-next-step"')[1].split('</div>')[0];
  assert.match(handoff, /montants ne sont pas transférés/);
  assert.match(handoff, /saisissez vos montants/);
  assert.match(handoff, /compte Pocklune confirmé/i);
  assert.match(handoff, />Découvrir Pocklune sur Google Play<\/a>/);
  assert.doesNotMatch(handoff, /retrouver ce calcul/);
});

test('financial inputs and QA labels never become Play URL parameters', () => {
  const query = '?utm_source=facebook&utm_campaign=carrousel_six_images_20260929&monthly-income=700&charges=400&remaining=150&qa=codex_internal';
  for (const link of playLinks(query)) {
    assert.deepEqual([...link.searchParams.keys()].sort(), ['id', 'utm_campaign', 'utm_medium', 'utm_source']);
    assert.equal(link.searchParams.get('utm_campaign'), 'carrousel_six_images_20260929');
  }
});
