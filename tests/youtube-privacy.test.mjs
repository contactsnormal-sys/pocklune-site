import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const requiredLinks = [
  'https://www.youtube.com/t/terms',
  'https://policies.google.com/privacy',
  'https://security.google.com/settings/security/permissions',
  'mailto:contact@2jagency.com',
];

// Régressions visées : ancre introuvable, information non cliquable,
// lien de chaîne erroné ou lecteur intégré à la place des liens simples.
for (const [file, heading, date] of [
  ['privacy.html', 'Services API YouTube', 'mise à jour : 26 octobre 2026'],
  ['privacy-en.html', 'YouTube API Services', 'updated 26 October 2026'],
]) {
  test(`${file} : section YouTube accessible et liens obligatoires cliquables`, () => {
    const html = read(file);
    const section = html.match(/<section id="youtube-api">([\s\S]*?)<\/section>/);
    assert.ok(section, 'Section accessible par #youtube-api');
    assert.equal([...html.matchAll(/id="youtube-api"/g)].length, 1);
    assert.ok(section[1].includes(`<h2>${heading}</h2>`));
    const links = [...section[1].matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    assert.deepEqual(links.map((link) => link[1]).sort(), [...requiredLinks].sort());
    assert.ok(links.every((link) => link[2].trim().length > 0));
    assert.ok(html.includes(date));
    assert.doesNotMatch(section[1], /\b(?:I\u0041|A\u0049)\b|intelligence artificielle|[\u20ac\u0024]|\bE\u0055R\b|\d+[.,]\d{2}/i);
  });
}

for (const [file, primary, privacy, label, navLabel] of [
  ['index.html', 'https://www.youtube.com/@PockluneBudgetsimple', './privacy.html', 'Nos vidéos sur YouTube', 'Chaînes YouTube'],
  ['en.html', 'https://www.youtube.com/@PockluneBudget', './privacy-en.html', 'Our videos on YouTube', 'YouTube channels'],
]) {
  test(`${file} : chaînes YouTube et confidentialité accessibles dans le pied de page`, () => {
    const html = read(file);
    const footer = html.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)[1];
    const nav = footer.match(new RegExp(`<nav aria-label="${navLabel}">([\\s\\S]*?)<\\/nav>`));
    assert.ok(nav, 'Groupe de liens vers les chaînes YouTube');
    const links = [...nav[1].matchAll(/<a\s([^>]*href="([^"]+)"[^>]*)>([^<]+)<\/a>/g)];
    assert.equal(links[0][2], primary);
    assert.equal(links[0][3], label);
    assert.deepEqual(links.map((link) => link[2]).sort(), [
      'https://www.youtube.com/@PockluneBudgetsimple',
      'https://www.youtube.com/@PockluneBudget',
      'https://www.youtube.com/@PocklunePresupuesto',
    ].sort());
    assert.ok(links.every((link) => /rel="noopener"/.test(link[1])));
    assert.ok(links.some((link) => link[2].endsWith('@PocklunePresupuesto') && link[3] === 'Español'));
    assert.equal([...footer.matchAll(/<a\s[^>]*href="([^"]+)"/g)].filter((link) => link[1] === privacy).length, 1);
    assert.doesNotMatch(html, /<iframe\b/i);
  });
}
