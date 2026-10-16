(() => {
  'use strict';

  const STORAGE_KEY = 'pocklune-site-google-consent-v2';
  const gtmId = document.documentElement.dataset.gtmId || '';
  const gaMeasurementId = 'G-QXS4SG2VNL';
  const canLoadGoogleTags = /^GTM-[A-Z0-9]+$/.test(gtmId) && gtmId !== 'GTM-XXXXXXX';
  let previousFocus = null;

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

  const closeDialog = ({ restoreFocus = true } = {}) => {
    document.querySelector('.pocklune-consent')?.remove();
    if (restoreFocus && previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    previousFocus = null;
  };

  const showDialog = () => {
    closeDialog({ restoreFocus: false });
    previousFocus = document.activeElement;
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
    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.key === 'Tab') {
        const controls = [...dialog.querySelectorAll('button:not([disabled])')];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
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

  const addConsentedConversionTracking = () => {
    window.pockluneTrackEvent = (analyticsEvent, placement = 'unknown') => {
      if (readChoice() !== 'accept') return;
      if (!/^[a-z][a-z0-9_]{1,39}$/.test(analyticsEvent)) return;
      window.dataLayer.push({ event: analyticsEvent, placement });
      window.gtag('event', analyticsEvent, { send_to: gaMeasurementId, placement });
    };

    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-analytics-event]');
      if (!link) return;
      const analyticsEvent = link.dataset.analyticsEvent;
      const placement = link.dataset.analyticsPlacement || 'unknown';
      window.pockluneTrackEvent(analyticsEvent, placement);
    });
  };

  addSettingsButton();
  addConsentedConversionTracking();
  const choice = readChoice();
  if (choice === 'accept') loadGtm();
  if (!choice) showDialog();
})();
