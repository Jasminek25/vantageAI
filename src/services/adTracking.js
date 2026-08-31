const REDDIT_PIXEL_ID = import.meta.env.VITE_REDDIT_PIXEL_ID || 'a2_jhw5133br6mq';
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';
const CLARITY_PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID || '';
const CONSENT_KEY = 'heirline-pilot-tracking-consent';

export function trackingConsent() {
  return window.localStorage.getItem(CONSENT_KEY);
}

export function setTrackingConsent(value) {
  window.localStorage.setItem(CONSENT_KEY, value);
  if (value === 'granted') initializeAdTracking();
  else revokeMeasurementConsent();
  window.dispatchEvent(new CustomEvent('heirline:tracking-consent', { detail: value }));
}

export function initializeAdTracking() {
  if (trackingConsent() !== 'granted') return;
  initializeRedditPixel();
  initializeGoogleAnalytics();
  initializeClarity();
}

function initializeRedditPixel() {
  if (window.rdt || !REDDIT_PIXEL_ID) return;

  window.rdt = function redditPixel() {
    if (window.rdt.sendEvent) window.rdt.sendEvent.apply(window.rdt, arguments);
    else window.rdt.callQueue.push(arguments);
  };
  window.rdt.callQueue = [];

  const script = document.createElement('script');
  script.src = `https://www.redditstatic.com/ads/pixel.js?pixel_id=${REDDIT_PIXEL_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.rdt('init', REDDIT_PIXEL_ID);
  window.rdt('track', 'PageVisit');
}

function initializeGoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted'
  });

  if (!document.querySelector(`script[data-heirline-ga="${GA_MEASUREMENT_ID}"]`)) {
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    script.async = true;
    script.dataset.heirlineGa = GA_MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
}

function initializeClarity() {
  if (!CLARITY_PROJECT_ID || window.clarity) return;

  window.clarity = function clarity() {
    window.clarity.q.push(arguments);
  };
  window.clarity.q = [];

  const script = document.createElement('script');
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
  script.async = true;
  script.dataset.heirlineClarity = CLARITY_PROJECT_ID;
  document.head.appendChild(script);

  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: 'granted'
  });
}

function revokeMeasurementConsent() {
  if (window.gtag) {
    window.gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
  }
  if (window.clarity) {
    window.clarity('consentv2', {
      ad_Storage: 'denied',
      analytics_Storage: 'denied'
    });
    window.clarity('consent', false);
  }
}

export function trackMeasurementEvent(name, details = {}) {
  if (trackingConsent() !== 'granted') return;
  if (window.gtag) window.gtag('event', name, details);
  if (window.clarity) window.clarity('event', name);
}

export function trackRedditLead() {
  if (trackingConsent() === 'granted' && window.rdt) window.rdt('track', 'Lead');
}
