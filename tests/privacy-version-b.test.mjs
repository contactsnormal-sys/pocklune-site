import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const baseline = name => execFileSync('git', ['show', `514279528cd350edfd465cce4683ea0a46421778:${name}`], { encoding: 'utf8' });
const section = (html, heading) => html.split(`<h2>${heading}</h2>`)[1]?.split('<h2>')[0];

for (const [page, language] of [['privacy.html', 'fr'], ['privacy-en.html', 'en']]) {
  test(`${page} : compte facultatif et budget local`, () => {
    const html = read(page);
    assert.match(html, language === 'fr' ? /Continuer sans compte/ : /without an account/);
    assert.match(html, language === 'fr' ? /compte est facultatif/ : /account is optional/);
    assert.match(html, language === 'fr' ? /budget reste enregistré sur votre appareil/ : /budget stays stored on your device/);
    assert.doesNotMatch(html, /compte confirmé est obligatoire|confirmed account is required/i);
  });
  test(`${page} : aucun outil de mesure dans l'application`, () => {
    const html = read(page);
    assert.doesNotMatch(html, /umami/i);
    assert.match(html, language === 'fr' ? /aucun outil de mesure d'audience ni d'analyse d'usage dans l'application/ : /no audience measurement or usage analytics tool in the app/);
  });
  test(`${page} : aucun conseil, offre ni conservation de marketing par e-mail`, () => {
    const html = read(page);
    assert.doesNotMatch(html, /Conseils et offres par e-mail|Tips and offers by email|Marketing:|Prospection|prospection|Optional tips and offers/i);
    assert.match(html, language === 'fr' ? /e-mails strictement nécessaires/ : /strictly necessary emails/);
  });
  test(`${page} : achats anonymes et connexion ultérieure décrits sans promesse de sauvegarde distante`, () => {
    const html = read(page);
    assert.match(html, /RevenueCat/);
    assert.match(html, language === 'fr' ? /identifiant anonyme d'achat/ : /anonymous purchase identifier/);
    assert.match(html, /logIn/);
    assert.match(html, language === 'fr' ? /si vous créez ou connectez un compte/ : /if you create or connect an account/);
    assert.match(html, language === 'fr' ? /ne sauvegarde pas votre budget sur un serveur/ : /does not back up your budget to a server/);
  });
  test(`${page} : date de publication, commentaire et mesure du site inchangés`, () => {
    const html = read(page);
    const before = baseline(page);
    assert.equal((html.match(/\{\{DATE_PUBLICATION\}\}/g) || []).length, 1);
    assert.equal(html.match(/<!-- (?:À REMPLACER|REPLACE)[\s\S]*?-->/)?.[0], before.match(/<!-- (?:À REMPLACER|REPLACE)[\s\S]*?-->/)?.[0]);
    const heading = language === 'fr' ? "Mesure d'audience et publicité du site public" : 'Website analytics';
    assert.equal(section(html, heading), section(before, heading));
  });
}
