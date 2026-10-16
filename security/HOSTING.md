# Hébergement et limites des protections HTTP — 2026-10-16

Hébergement déduit localement : GitHub Pages. Indices : dépôt origin contactsnormal-sys/pocklune-site, fichier .nojekyll, URL canonique du calculateur et sitemap sous contactsnormal-sys.github.io/pocklune-site/. Aucune configuration Vercel, Netlify, CNAME, Wrangler ou workflow de déploiement trouvée. L'état de l'hébergement courant n'a pas été interrogé.

GitHub Pages sert des fichiers statiques ; aucun format de configuration d'en-têtes HTTP personnalisés par dépôt n'est disponible ici. Un fichier _headers, vercel.json, netlify.toml ou .htaccess ajouté à ce dépôt ne réglerait pas les réponses GitHub Pages.

Protections livrées dans chaque page : CSP par meta placée avant toute ressource, sans unsafe-inline/unsafe-eval, et Referrer-Policy par meta. Les styles sont des fichiers locaux. Les destinations Google autorisées restent soumises au consentement du script existant. Les balises GTM nécessitant des domaines ou scripts supplémentaires seront bloquées ; aucune balise distante n'a été exécutée pour cet audit.

Limite : frame-ancestors est ignoré dans une meta CSP. HSTS, X-Frame-Options et X-Content-Type-Options nécessitent des en-têtes HTTP ; ils ne sont pas simulés par des meta. Le JSON required-response-headers.json est une spécification de revue, pas une configuration consommée par GitHub Pages et pas une preuve de protection active. Les en-têtes fournis par défaut par l'hébergeur restent inconnus, conformément à l'interdiction d'appeler la production.

Action externe restante : choisir et autoriser séparément un proxy ou hébergement permettant ces cinq en-têtes, y installer la spécification, puis vérifier ses réponses HTTPS. Aucun changement d'hébergeur, DNS, workflow, publication ou déploiement n'a été effectué.

Sources officielles consultées :
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security

Vérification locale : node --test security/site-security.test.mjs ; node --check analytics-consent.js ; node --check budget-calculator.js.
