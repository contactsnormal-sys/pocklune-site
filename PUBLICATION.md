# Publication : politique de confidentialité 1.0.190

Branche : `release/privacy-1.0.190`. À publier **seulement le jour de la soumission de Pocklune 1.0.190** à Apple et Google, pas avant.

## Avant de publier : mettre la vraie date
1. Dans `privacy.html`, remplacer `{{DATE_PUBLICATION}}` par la date du jour, au format « 3 novembre 2026 ». Supprimer le commentaire `À REMPLACER…` juste au-dessus.
2. Dans `privacy-en.html`, remplacer `{{DATE_PUBLICATION}}` par la même date, au format « 3 November 2026 ». Supprimer le commentaire `REPLACE…` juste au-dessus.
3. Vérifier qu'aucun marqueur ne reste : `POCKLUNE_PUBLICATION=1 node --test tests/*.mjs` (sous PowerShell : `$env:POCKLUNE_PUBLICATION='1'; node --test tests/youtube-privacy.test.mjs`). Le test « publication » doit passer, et non être ignoré.
4. Lancer tous les tests : `node --test tests/*.mjs` et `node --test security/site-security.test.mjs`.

## Ne pas oublier
- Le texte décrit l'écran de consentement de l'appli 1.0.190 (version du texte `consent-v2-20261026`). Ne pas publier si l'appli soumise n'a pas cet écran.
- Le contrôle B4 de la fonction déployée (Orion) doit être fait avant.
