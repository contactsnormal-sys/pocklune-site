(() => {
  'use strict';

  const STORAGE_KEY = 'pocklune-site-google-consent-v2';
  const gtmId = document.documentElement.dataset.gtmId || '';
  const canLoadGoogleTags = /^GTM-[A-Z0-9]+$/.test(gtmId) && gtmId !== 'GTM-XXXXXXX';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });

  const addStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
      .pocklune-consent{position:fixed;z-index:9999;inset:auto 16px 16px;max-width:720px;margin:auto;padding:20px;border:1px solid #d8d2c4;border-radius:20px;background:#fffdf8;color:#0d1333;box-shadow:0 18px 60px rgba(13,19,51,.22);font:16px/1.5 system-ui,-apple-system,sans-serif}
      .pocklune-consent h2{margin:0 0 8px;font-size:21px;letter-spacing:0}
      .pocklune-consent p{margin:0 0 16px;color:#4a526b}
      .pocklune-consent-actions{display:flex;flex-wrap:wrap;gap:10px}
      .pocklune-consent button{min-height:44px;padding:0 18px;border:1px solid #0d1333;border-radius:999px;background:#fff;color:#0d1333;font:700 14px system-ui,-apple-system,sans-serif;cursor:pointer}
      .pocklune-consent button[data-choice="accept"]{background:#0d1333;color:#fff}
      .pocklune-consent-settings{position:fixed;z-index:9998;right:14px;bottom:14px;min-height:40px;padding:0 14px;border:1px solid #0d1333;border-radius:999px;background:#fffdf8;color:#0d1333;font:700 12px system-ui,-apple-system,sans-serif;box-shadow:0 6px 24px rgba(13,19,51,.15);cursor:pointer}
      @media(max-width:520px){.pocklune-consent{inset:auto 8px 8px}.pocklune-consent-actions button{flex:1}}
    `;
    document.head.append(style);
  };

  const readChoice = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')?.choice || null;
    } catch {
      return null;
    }
  };

  const writeChoice = (choice) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, savedAt: new Date().toISOString() }));
    window.dispatchEvent(new CustomEvent('pocklune:google-consent', { detail: { choice } }));
  };

  const loadGtm = () => {
    if (!canLoadGoogleTags || document.querySelector('script[data-pocklune-gtm]')) return;
    window.gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    const script = document.createElement('script');
    script.async = true;
    script.dataset.pockluneGtm = 'true';
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.append(script);
  };

  const deleteAnalyticsCookies = () => {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0]?.trim();
      if (name === '_ga' || name === '_gcl_au' || name?.startsWith('_ga_') || name?.startsWith('_gac_')) {
        document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
      }
    }
  };

  const closeDialog = () => document.querySelector('.pocklune-consent')?.remove();

  const showDialog = () => {
    closeDialog();
    const dialog = document.createElement('section');
    dialog.className = 'pocklune-consent';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'pocklune-consent-title');
    dialog.innerHTML = `
      <h2 id="pocklune-consent-title">Mesure et publicité du site</h2>
      <p>Avec votre accord, Pocklune utilise Google Analytics, Google Tag Manager et les balises Google Ads pour mesurer les pages utiles et l’efficacité de ses campagnes. Aucun traceur publicitaire ou analytique n’est chargé avant votre choix. Cela ne concerne pas les données de l’application Pocklune.</p>
      <div class="pocklune-consent-actions">
        <button type="button" data-choice="refuse">Tout refuser</button>
        <button type="button" data-choice="accept">Tout accepter</button>
      </div>`;
    dialog.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-choice]');
      if (!button) return;
      const previousChoice = readChoice();
      const choice = button.dataset.choice;
      writeChoice(choice);
      closeDialog();
      if (choice === 'accept') loadGtm();
      if (choice === 'refuse') {
        deleteAnalyticsCookies();
        if (previousChoice === 'accept') location.reload();
      }
    });
    document.body.append(dialog);
    dialog.querySelector('button')?.focus();
  };

  const addSettingsButton = () => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pocklune-consent-settings';
    button.textContent = 'Confidentialité du site';
    button.addEventListener('click', showDialog);
    document.body.append(button);
  };

  addStyles();
  addSettingsButton();
  const choice = readChoice();
  if (choice === 'accept') loadGtm();
  if (!choice) showDialog();
})();
