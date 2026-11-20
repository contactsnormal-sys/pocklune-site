import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../analytics-consent.js', import.meta.url), 'utf8');
const english = readFileSync(new URL('../en.html', import.meta.url), 'utf8');

function simulateFirstVisit(lang) {
  const body = [], scripts = [], storage = new Map();
  class HTMLElement {
    constructor() { this.dataset = {}; this.handlers = {}; this.isConnected = true; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    setAttribute() {}
    querySelector() { return this.button ??= new HTMLElement(); }
    focus() { doc.activeElement = this; }
    remove() { body.splice(body.indexOf(this), 1); }
  }
  const doc = {
    documentElement: { lang, dataset: { gtmId: 'GTM-TEST123' } },
    body: { append: element => body.push(element) },
    head: { append: element => scripts.push(element) },
    cookie: '', activeElement: new HTMLElement(),
    createElement: () => new HTMLElement(),
    querySelector: selector => body.find(e => '.' + e.className === selector),
    addEventListener() {},
  };
  const originalFocus = doc.activeElement;
  const window = { location: { search: '' }, dispatchEvent() {} };
  const localStorage = { getItem: k => storage.get(k), setItem: (k,v) => storage.set(k,v) };
  runInNewContext(source, { document: doc, window, localStorage, URLSearchParams, Date, HTMLElement, CustomEvent: class {} });
  const dialog = doc.querySelector('.pocklune-consent');
  return { dialog, doc, scripts, storage, window, originalFocus,
    reject: () => dialog.handlers.click({ target: { closest: () => ({ dataset: { choice: 'refuse' } }) } }),
  };
}

test('English landing shows English consent controls and refusing closes without trackers', () => {
  assert.match(english, /<html lang="en"(?:\s|>)/);
  const p = simulateFirstVisit('en');
  assert.match(p.dialog.innerHTML, /Website analytics and advertising/);
  assert.match(p.dialog.innerHTML, /data-choice="refuse">Reject all/);
  assert.match(p.dialog.innerHTML, /data-choice="accept">Accept all/);
  assert.equal(p.doc.querySelector('.pocklune-consent-settings').textContent, 'Website privacy');
  assert.equal(p.scripts.length, 0);
  p.reject();
  assert.equal(p.doc.querySelector('.pocklune-consent'), undefined);
  assert.equal(p.doc.activeElement, p.originalFocus);
  assert.equal(JSON.parse(p.storage.get('pocklune-site-google-consent-v2')).choice, 'refuse');
  assert.equal(p.scripts.length, 0);
  assert.equal(p.window.dataLayer.filter(x => x[0] === 'event').length, 0);
});

test('French consent controls keep their existing labels', () => {
  const p = simulateFirstVisit('fr');
  assert.match(p.dialog.innerHTML, /data-choice="refuse">Tout refuser/);
  assert.match(p.dialog.innerHTML, /data-choice="accept">Tout accepter/);
});
