(() => {
  const config = window.WORLD_NEWS_ADSENSE_CONFIG || {};
  let loaded = false;

  function loadAdSense() {
    if (loaded || !config.enabled || !config.certifiedCmpConfigured || !config.clientId) return;
    if (window.worldNewsPrivacy?.getChoice() !== 'advertising') return;
    loaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(config.clientId);
    document.head.appendChild(script);
  }

  window.addEventListener('world-news-consent', event => {
    if (event.detail?.choice === 'advertising' && event.detail?.adsEnabled) loadAdSense();
  });
  loadAdSense();
})();
