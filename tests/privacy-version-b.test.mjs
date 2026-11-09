import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const baseline = name => execFileSync('git', ['show', `438eb18b67036e9f24eb2b3d3bf4437be55ec021:${name}`], { encoding: 'utf8' });
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
    assert.equal((html.match(/\{\{DATE_PUBLICATION\}\}/g) || []).length, 0);
    assert.match(html, language === 'fr' ? /mise à jour : 3 novembre 2026/ : /updated 3 November 2026/);
    assert.doesNotMatch(html, /<!-- (?:À REMPLACER|REPLACE)/);
    assert.ok(before.length > 0);
    const heading = language === 'fr' ? "Mesure d'audience et publicité du site public" : 'Website analytics';
    assert.equal(section(html, heading), section(before, heading));
  });
  test(`${page} : photo Google limitée au service d'authentification et inutilisée par Pocklune`, () => {
    const html = read(page);
    const precise = language === 'fr'
      ? "et, s'ils sont fournis, le nom d'affichage et, pour Google, le lien vers la photo de profil, conservé par le service d'authentification et non utilisé par Pocklune"
      : 'and, if provided, the display name and, for Google, the profile picture link, kept by the authentication service and not used by Pocklune';
    assert.equal(html.split(precise).length, 2);
    assert.doesNotMatch(html.replace(precise, ''), /photo de profil|profile picture/i);
  });
  test(`${page} : demande d'effacement des achats avant suppression, sans promesse automatique`, () => {
    const html = read(page).replace(/<[^>]+>/g, '');
    assert.ok(html.includes(language === 'fr'
      ? "Les achats et abonnements sont gérés par l'App Store ou Google Play et par notre prestataire de paiement RevenueCat ; pour en demander l'effacement, écrivez à contactsnormal@gmail.com depuis l'adresse du compte avant de supprimer le compte."
      : 'Purchases and subscriptions are managed by the App Store or Google Play and by our payment provider RevenueCat; to request their deletion, email contactsnormal@gmail.com from the account address before deleting the account.'));
  });
  test(`${page} : reconnaissance système, repli réseau et indices d'enveloppes explicites`, () => {
    const voice = section(read(page), language === 'fr' ? 'Saisie vocale facultative' : 'Voice input');
    assert.ok(voice);
    for (const pattern of (language === 'fr' ? [
      /service de reconnaissance vocale du système/, /langue.*installée/, /Apple ou de Google/,
      /noms de vos enveloppes.*indices/, /ne reçoit ni ne conserve aucun audio/,
    ] : [
      /system speech recognition service/, /language.*installed/, /Apple or Google/,
      /envelope names.*hints/, /neither receives nor retains any audio/,
    ])) assert.equal(pattern.test(voice), true, `Information vocale manquante : ${pattern}`);
  });
}

test('suppression : parcours exact, version, marqueur et commentaire de publication', () => {
  const html = read('account-deletion.html');
  const text = html.replace(/<[^>]+>/g, '');
  assert.match(text, /Version 1\.0\.190/);
  assert.ok(text.includes("ouvrez l'onglet Profil › Sécurité et données › Supprimer le compte, saisissez SUPPRIMER, puis touchez Demander la suppression"));
  assert.ok(text.includes('Profile tab › Security and data › Delete account'));
  assert.match(text, /mise à jour : 3 novembre 2026/);
  assert.doesNotMatch(html, /<!-- À REMPLACER/);
  assert.match(read('tests/youtube-privacy.test.mjs'), /\['privacy\.html', 'privacy-en\.html', 'account-deletion\.html'\]/);
});

test('suppression : données annoncées et budget conservé uniquement sur l’appareil', () => {
  const text = read('account-deletion.html').replace(/<[^>]+>/g, '');
  for (const value of ['identifiants de connexion', 'prénom', 'nom', 'pays', 'taille du foyer', 'préférences', 'acceptations légales', "demandes d'assistance", "compteurs d'analyse approfondie", 'budget reste sur votre appareil', 'désinstallant']) assert.ok(text.includes(value), value);
  assert.doesNotMatch(text, /snapshot|sauvegarde(?:s)? serveur/i);
});

test('suppression : RevenueCat, contact avant suppression et prévention des abus explicités', () => {
  const text = read('account-deletion.html').replace(/<[^>]+>/g, '');
  assert.ok(text.includes("Les achats et abonnements sont gérés par l'App Store ou Google Play et par notre prestataire de paiement RevenueCat ; pour en demander l'effacement, écrivez à contactsnormal@gmail.com depuis l'adresse du compte avant de supprimer le compte."));
  assert.ok(text.includes("OpenAI peut conserver une demande d'analyse approfondie jusqu'à 30 jours pour prévenir les abus."));
  assert.match(text, /depuis l'adresse du compte/);
  assert.doesNotMatch(text, /délai raisonnable|automatically delete|effacement automatique/i);
});

test('suppression : structure de sécurité et ressources conservées', () => {
  const html = read('account-deletion.html');
  const before = baseline('account-deletion.html');
  for (const pattern of [/<meta http-equiv="Content-Security-Policy"[^>]*>/, /<meta name="referrer"[^>]*>/, /<script defer[^>]*><\/script>/]) assert.equal(html.match(pattern)?.[0], before.match(pattern)?.[0]);
  for (const link of before.matchAll(/href="([^"]+)"/g)) assert.ok(html.includes(`href="${link[1]}"`), link[1]);
  assert.doesNotMatch(html, /[�]|derniere|Donnees|Delai|supprimees|associee|donnees financieres/);
});
