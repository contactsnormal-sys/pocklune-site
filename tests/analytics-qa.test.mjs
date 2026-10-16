import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('../analytics-consent.js', import.meta.url), 'utf8');

function loadSiteAnalytics(query, choice = 'accept') {
  const appendedToHead = [];
  const document = {
    documentElement: { dataset: { gtmId: 'GTM-TEST123' } },
    head: { append: (element) => appendedToHead.push(element) },
    body: { append() {} },
    createElement: (tagName) => ({ tagName, dataset: {}, addEventListener() {} }),
    querySelector: () => null,
    addEventListener() {},
  };
  const window = { location: { search: query }, dataLayer: [] };
  const localStorage = { getItem: () => JSON.stringify({ choice }) };
  runInNewContext(script, { document, window, localStorage, URLSearchParams, Date });
  return { appendedToHead, dataLayer: window.dataLayer, track: window.pockluneTrackEvent };
}

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
