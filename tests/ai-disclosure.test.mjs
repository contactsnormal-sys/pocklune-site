import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Information obligatoire (RGPD art. 13, App Store 5.1.2(i)) : ne pas retirer.
test('politique FR : mention du service tiers d’intelligence artificielle', async () => {
  const s = await readFile(new URL('../privacy.html', import.meta.url), 'utf8');
  assert.ok(s.includes('La réponse est rédigée automatiquement par OpenAI, un service tiers d’intelligence artificielle, à partir des seules catégories décrites ci-dessous.'));
  assert.ok(s.includes('<strong>OpenAI (service tiers d’intelligence artificielle) :</strong>'));
});

test('privacy EN: third-party AI service disclosure', async () => {
  const s = await readFile(new URL('../privacy-en.html', import.meta.url), 'utf8');
  assert.ok(s.includes('The answer is generated automatically by OpenAI, a third-party AI service, using only the category signals described below.'));
  assert.ok(s.includes('<strong>OpenAI (third-party AI service)</strong>'));
});
