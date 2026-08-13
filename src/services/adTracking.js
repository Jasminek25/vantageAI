const REDDIT_PIXEL_ID = import.meta.env.VITE_REDDIT_PIXEL_ID || 'a2_jhw5133br6mq';
const CONSENT_KEY = 'heirline-pilot-tracking-consent';

export function trackingConsent() {
  return window.localStorage.getItem(CONSENT_KEY);
}

export function setTrackingConsent(value) {
  window.localStorage.setItem(CONSENT_KEY, value);
  if (value === 'granted') initializeAdTracking();
}

export function initializeAdTracking() {
  if (trackingConsent() !== 'granted' || window.rdt || !REDDIT_PIXEL_ID) return;

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

export function trackRedditLead() {
  if (trackingConsent() === 'granted' && window.rdt) window.rdt('track', 'Lead');
}
