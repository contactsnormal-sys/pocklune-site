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
  // Date de mise à jour : vraie date, ou marqueur {{DATE_PUBLICATION}} à remplacer
  // le jour de la publication (voir PUBLICATION.md).
  ['privacy.html', 'Services API YouTube', /mise à jour : (?:\d{1,2} [a-zéû]+ \d{4}|\{\{DATE_PUBLICATION\}\})/],
  ['privacy-en.html', 'YouTube API Services', /updated (?:\d{1,2} [A-Z][a-z]+ \d{4}|\{\{DATE_PUBLICATION\}\})/],
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
    assert.match(html, date);
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
    assert.ok(links.some((link) => link[2].endsWith('@PocklunePresupuesto') && link[3] === 'YouTube en español'));
    assert.equal([...footer.matchAll(/<a\s[^>]*href="([^"]+)"/g)].filter((link) => link[1] === privacy).length, 1);
    assert.doesNotMatch(html, /<iframe\b/i);
  });
}

// Contrôle de publication : POCKLUNE_PUBLICATION=1 node --test tests/*.mjs
// doit échouer tant qu'un marqueur {{DATE_PUBLICATION}} ou un commentaire
// « À REMPLACER » / « REPLACE on publication day » reste dans le code source.
const PUBLICATION_MARKERS = ['{{DATE_PUBLICATION}}', 'À REMPLACER', 'REPLACE on publication day'];
test('publication : aucune date de mise à jour laissée en marqueur', { skip: process.env.POCKLUNE_PUBLICATION !== '1' }, () => {
  for (const file of ['privacy.html', 'privacy-en.html', 'account-deletion.html']) {
    const html = read(file);
    for (const marker of PUBLICATION_MARKERS) {
      assert.ok(!html.includes(marker), `${file} : retirer « ${marker} » et mettre la vraie date`);
    }
  }
});
