// Garde anti-numéro (règle permanente : aucun numéro de téléphone public, utiliser contactsnormal@gmail.com).
// Échoue si un fichier suivi par git contient un numéro français mobile (06/07, +33, 0033) ou un lien d'appel.
// Lancer : node security/no-phone-number.test.mjs (ou via la CI .github/workflows/site-checks.yml).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TEXT = /\.(html?|md|mjs|cjs|js|json|css|txt|xml|ya?ml|svg|webmanifest|csv)$|(^|\/)CNAME$/i;
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((f) => f && TEXT.test(f));
// Motif construit par morceaux pour que ce fichier ne se détecte pas lui-même.
const mobile = new RegExp('(?:\\+\\s?33|0033|(?<!\\d)0)[\\s.\\u00a0-]?[67](?:[\\s.\\u00a0-]?\\d{2}){4}(?!\\d)');
const callLink = new RegExp('te' + 'l:', 'i');
const isTest = (f) => /\.test\.mjs$/.test(f);

test('aucun numéro de téléphone dans les fichiers suivis', () => {
  assert.ok(files.length > 10, 'liste des fichiers vide');
  const bad = files.filter((f) => mobile.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, [], 'numéro détecté (valeur non affichée) dans : ' + bad.join(', '));
});

test("aucun lien d'appel (hors fichiers de test qui contiennent le motif)", () => {
  const bad = files.filter((f) => !isTest(f) && callLink.test(readFileSync(f, 'utf8')));
  assert.deepEqual(bad, [], "lien d'appel détecté dans : " + bad.join(', '));
});
