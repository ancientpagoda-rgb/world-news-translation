(() => {
  const STORAGE_KEY = 'world-news-privacy-consent-v1';
  const adsEnabled = Boolean(window.WORLD_NEWS_ADSENSE_CLIENT);

  function readChoice() {
    try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }

  function saveChoice(choice) {
    try { window.localStorage.setItem(STORAGE_KEY, choice); } catch {}
    window.dispatchEvent(new CustomEvent('world-news-consent', {
      detail: { choice, ads: choice === 'advertising', adsEnabled }
    }));
  }

  function closeBanner() {
    document.querySelector('.privacy-consent-banner')?.remove();
  }

  function showConsent(force = false) {
    if (!force && !adsEnabled) return;
    closeBanner();
    const banner = document.createElement('section');
    banner.className = 'privacy-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-labelledby', 'privacy-consent-title');
    banner.innerHTML = '<div><h2 id="privacy-consent-title">Privacy choices</h2>'
      + '<p>We use essential browser storage to remember this choice. Optional advertising technology is loaded only after you allow it where consent is required. <a href="privacy.html">Read the privacy policy</a>.</p></div>'
      + '<div class="privacy-consent-actions">'
      + '<button type="button" class="consent-secondary" data-consent="necessary">Only necessary</button>'
      + '<button type="button" class="consent-primary" data-consent="advertising">Allow advertising</button>'
      + '</div>';
    banner.addEventListener('click', event => {
      const button = event.target.closest('[data-consent]');
      if (!button) return;
      saveChoice(button.dataset.consent);
      closeBanner();
    });
    document.body.appendChild(banner);
  }

  document.addEventListener('click', event => {
    if (event.target.closest('[data-open-consent]')) showConsent(true);
  });

  window.worldNewsPrivacy = {
    adsEnabled,
    getChoice: readChoice,
    showConsent,
    saveChoice,
  };

  const choice = readChoice();
  if (choice) {
    window.dispatchEvent(new CustomEvent('world-news-consent', {
      detail: { choice, ads: choice === 'advertising', adsEnabled }
    }));
  } else if (adsEnabled) {
    showConsent();
  }
})();
