import type { Environment } from "../core/ports";

export const browserEnvironment: Environment = {
  now: () => new Date(),
  isOnline: () => navigator.onLine,
  onOnlineChange(listener) {
    const online = () => listener(true);
    const offline = () => listener(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  },
  // Missing over plain HTTP and in older browsers: storage can't be kept then.
  requestPersistentStorage: async () => (await navigator.storage?.persist?.()) ?? false,
  isStoragePersisted: async () => (await navigator.storage?.persisted?.()) ?? false,
};
