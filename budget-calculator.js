(() => {
  'use strict';

  // Carry only known campaign labels to Google Play; never forward arbitrary URL input.
  const campaignSource = new URL(window.location.href).searchParams;
  const source = campaignSource.get('utm_source');
  const campaign = campaignSource.get('utm_campaign');
  const knownSources = new Set(['facebook', 'youtube']);
  const knownCampaigns = new Set(['balance_reveal_20260922', 'cinq_donnees_20260928', 'carrousel_dynamique_v4_20260929', 'carrousel_dynamique_v5_20260929', 'carrousel_six_images_20260929']);
  const studioYouTubeCampaigns = new Set(['studio_cinq_chiffres_05', 'studio_par_jour_06']);
  if ((knownSources.has(source) && knownCampaigns.has(campaign)) ||
      (source === 'youtube' && studioYouTubeCampaigns.has(campaign))) {
    document.querySelectorAll('a[data-analytics-event="play_store_click"]').forEach((link) => {
      const destination = new URL(link.href);
      if (destination.hostname !== 'play.google.com' || destination.searchParams.get('id') !== 'com.pocklune.app') return;
      destination.searchParams.set('utm_source', source);
      destination.searchParams.set('utm_medium', 'calculator');
      destination.searchParams.set('utm_campaign', campaign);
      link.href = destination.toString();
    });
  }

  const form = document.querySelector('#budget-calculator');
  const output = document.querySelector('#calculator-output');
  const error = document.querySelector('#calculator-error');
  const nextStep = document.querySelector('#calculator-next-step');
  const resultTitle = document.querySelector('#result-title');
  if (!form || !output || !error || !nextStep || !resultTitle) return;

  const initialResult = output.innerHTML;

  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  });

  const parseMoney = (fieldName) => {
    const input = form.elements.namedItem(fieldName);
    const normalized = String(input?.value || '').trim().replace(/\s/g, '').replace(',', '.');
    const value = Number(normalized);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const income = parseMoney('monthly-income');
    const charges = parseMoney('fixed-charges');
    const margin = parseMoney('safety-margin');
    const spent = parseMoney('already-spent');
    const daysInput = form.elements.namedItem('days-left');
    const days = Number(daysInput?.value);

    if ([income, charges, margin, spent].includes(null) || !Number.isInteger(days) || days < 1 || days > 31) {
      error.textContent = 'Vérifiez les montants et indiquez entre 1 et 31 jours.';
      error.hidden = false;
      nextStep.hidden = true;
      resultTitle.textContent = 'Votre repère apparaîtra ici.';
      output.innerHTML = initialResult;
      return;
    }

    error.hidden = true;
    const remaining = income - charges - margin - spent;
    const daily = remaining > 0 ? remaining / days : 0;

    if (remaining >= 0) {
      resultTitle.textContent = 'Votre reste estimé';
      output.innerHTML = `
        <p class="result-label">Reste estimé</p>
        <p class="result-amount">${formatter.format(remaining)}</p>
        <p>Soit environ <strong>${formatter.format(daily)} par jour</strong> pendant ${days} jour${days > 1 ? 's' : ''}, si aucune autre charge n’apparaît.</p>
        <p class="result-formula">${formatter.format(income)} − ${formatter.format(charges)} − ${formatter.format(margin)} − ${formatter.format(spent)}</p>`;
    } else {
      resultTitle.textContent = 'Dépassement à vérifier';
      output.innerHTML = `
        <p class="result-label">Dépassement estimé</p>
        <p class="result-amount negative">${formatter.format(Math.abs(remaining))}</p>
        <p>Vos charges, votre marge et vos dépenses dépassent les revenus indiqués. Vérifiez les saisies avant toute décision.</p>
        <p class="result-formula">${formatter.format(income)} − ${formatter.format(charges)} − ${formatter.format(margin)} − ${formatter.format(spent)}</p>`;
    }

    nextStep.hidden = false;
    if (typeof window.pockluneTrackEvent === 'function') {
      window.pockluneTrackEvent('calculator_completed', 'seo_calculator');
    }
    output.focus?.();
  });
})();
