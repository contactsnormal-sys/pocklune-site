import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../analytics-consent.js', import.meta.url), 'utf8');
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function heroCalculatorLink() {
  const hero = home.split('<section class="hero shell">')[1].split('</section>')[0];
  const links = [...hero.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
    .filter((match) => match[2].trim() === 'Estimer mon reste à dépenser');
  assert.equal(links.length, 1, 'one calculator CTA in the French hero');
  const attributes = Object.fromEntries([...links[0][1].matchAll(/([\w-]+)="([^"]*)"/g)]
    .map((match) => [match[1], match[2]]));
  return {
    attributes,
    dataset: {
      analyticsEvent: attributes['data-analytics-event'],
      analyticsPlacement: attributes['data-analytics-placement'],
    },
  };
}

function loadSiteAnalytics(query, choice = 'accept') {
  const appendedToHead = [];
  const listeners = {};
  const document = {
    documentElement: { dataset: { gtmId: 'GTM-TEST123' } },
    head: { append: (element) => appendedToHead.push(element) },
    body: { append() {} },
    createElement: (tagName) => ({ tagName, dataset: {}, addEventListener() {} }),
    querySelector: () => null,
    addEventListener(name, listener) { listeners[name] = listener; },
  };
  const window = { location: { search: query }, dataLayer: [] };
  const localStorage = { getItem: () => JSON.stringify({ choice }) };
  runInNewContext(script, { document, window, localStorage, URLSearchParams, Date });
  return {
    appendedToHead, dataLayer: window.dataLayer, track: window.pockluneTrackEvent,
    click(link) {
      listeners.click({ target: { closest: () => link } });
    },
  };
}

test('French hero calculator CTA uses the existing local page without internal attribution parameters', () => {
  const { attributes } = heroCalculatorLink();
  assert.equal(attributes.href, './calcul-reste-a-depenser.html');
  assert.equal(attributes['data-analytics-event'], 'calculator_open');
  assert.equal(attributes['data-analytics-placement'], 'hero_fr');
  assert.ok(readFileSync(new URL('../calcul-reste-a-depenser.html', import.meta.url), 'utf8'));
});

test('consented hero click records only the event and placement through existing delegation', () => {
  const site = loadSiteAnalytics('?monthly-income=1840&remaining=926.70');
  site.click(heroCalculatorLink());
  const events = site.dataLayer.filter((item) => item.event === 'calculator_open');
  assert.equal(events.length, 1);
  assert.equal(JSON.stringify(events[0]), JSON.stringify({ event: 'calculator_open', placement: 'hero_fr' }));
  const calls = site.dataLayer.filter((item) => item[0] === 'event');
  assert.equal(calls.length, 1);
  assert.equal(JSON.stringify([...calls[0]]), JSON.stringify([
    'event', 'calculator_open', { send_to: 'G-QXS4SG2VNL', placement: 'hero_fr' },
  ]));
});

test('hero click records nothing when consent is refused or visitor is internal QA', () => {
  for (const [query, choice] of [['', 'refuse'], ['?qa=codex_internal', 'accept'], ['?qa=codex_internal_hero', 'accept']]) {
    const site = loadSiteAnalytics(query, choice);
    site.click(heroCalculatorLink());
    assert.equal(site.appendedToHead.filter((element) => element.tagName === 'script').length, 0);
    assert.equal(site.dataLayer.filter((item) => item.event === 'calculator_open' || item[0] === 'event').length, 0);
  }
});

test('a consented ordinary visitor still loads GTM and records the Play click', () => {
  const site = loadSiteAnalytics('?utm_source=facebook&utm_campaign=cinq_donnees_20260928');
  assert.equal(site.appendedToHead.filter((element) => element.tagName === 'script').length, 1);
  site.track('play_store_click', 'calculator_header');
  assert.equal(site.dataLayer.filter((item) => item.event === 'play_store_click').length, 1);
});

test('consented internal QA never loads GTM or records a conversion', () => {
  for (const query of ['?qa=codex_internal', '?utm_source=facebook&qa=codex_internal_b']) {
    const site = loadSiteAnalytics(query);
    assert.equal(site.appendedToHead.filter((element) => element.tagName === 'script').length, 0);
    site.track('play_store_click', 'calculator_header');
    assert.equal(site.dataLayer.filter((item) => item.event === 'play_store_click').length, 0);
  }
});

test('declined consent never loads GTM or records a conversion', () => {
  const site = loadSiteAnalytics('?utm_source=facebook', 'refuse');
  assert.equal(site.appendedToHead.filter((element) => element.tagName === 'script').length, 0);
  site.track('play_store_click', 'calculator_header');
  assert.equal(site.dataLayer.filter((item) => item.event === 'play_store_click').length, 0);
});
