export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  if (import.meta.env.DEV) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
