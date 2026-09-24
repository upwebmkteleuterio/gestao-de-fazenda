/// <reference types="vite/client" />

export const registerServiceWorker = (): void => {
  if (
    import.meta.env.DEV
    || !('serviceWorker' in navigator)
    || !window.isSecureContext
  ) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Service worker support is optional and must not prevent the app from loading.
    });
  }, { once: true });
};
