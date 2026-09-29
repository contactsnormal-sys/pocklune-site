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
