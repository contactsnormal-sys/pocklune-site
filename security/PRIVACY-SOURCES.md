# Confidentialité — vérification locale du 16 octobre 2026

Source app : C:/CodexBuilds/Pocklune-sec-npm, branche security/npm-audit-20261015. Aucun appel aux services du produit.

| Flux retenu | Preuve source |
|---|---|
| Supabase, compte Google/Apple, profil, consentements, assistance | src/backend/supabase-client.ts, supabase-auth.ts, profile.ts, support.ts ; supabase/migrations |
| Achats Google Play / Apple et RevenueCat | src/billing/revenuecat.ts, catalog.ts ; package.json |
| OpenAI pour Premium IA | supabase/functions/pocklune-ai-coach/index.ts : API Responses mondiale, signaux catégoriels bornés, identifiant de sécurité haché, store:false |
| Absence de SDK Firebase/Analytics mobile | Dépendances directes et imports src examinés : aucune intégration trouvée ; la mesure Google est propre au site |
| Mesure du site avec consentement | analytics-consent.js : stockage local du choix, aucune expiration programmée, GTM après acceptation seulement |
| Assistance : plafond prévu 24 mois | Migration pocklune_support_requests : expires_at ; aucune purge automatique démontrée |

Sources publiques officielles consultées le 16/10/2026 :

- GitHub, adresse, transferts/CCT/DPF : https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- GitHub, assistance : https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- Supabase, localisation selon région choisie et CCT : https://supabase.com/legal/customer-resources/data-processing-addendum
- RevenueCat, AWS aux États-Unis : https://www.revenuecat.com/privacy ; CCT : https://www.revenuecat.com/dpa
- OpenAI, CCT/adéquation : https://openai.com/policies/data-processing-addendum/ ; conservation et résidence : https://developers.openai.com/api/docs/guides/your-data
- Google, serveurs mondiaux : https://policies.google.com/privacy?hl=fr ; DPF et CCT : https://policies.google.com/privacy/frameworks?hl=fr
- Apple, responsabilité et transferts : https://www.apple.com/legal/privacy/fr-ww/
- CNIL, droits : https://www.cnil.fr/fr/respecter-les-droits-des-personnes ; adresse : https://www.cnil.fr/fr/nouveaux-locaux-nouveau-logo

Limites : la documentation des fournisseurs prouve leurs règles annoncées, pas la signature des DPA ni leur application au compte Pocklune. Région Supabase effective, réglages de résidence OpenAI, purge serveur et durées Google distantes non attestés localement ; aucune résidence exclusivement européenne ou purge automatique n’est affirmée. Les informations société restent celles déjà fournies par Thomas. Les protections HTTP propres à un serveur restent hors du mandat local.
