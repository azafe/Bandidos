import { apiRequest, getDeviceId } from "./apiClient.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function getVapidPublicKey() {
  const data = await apiRequest("/push/vapid-public-key");
  return data.publicKey;
}

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications no soportadas en este navegador.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones denegado.");
  }

  const registration = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const { endpoint, keys } = subscription.toJSON();
  await apiRequest("/push/subscribe", {
    method: "POST",
    body: {
      device_id: getDeviceId(),
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  });

  return subscription;
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }

  await apiRequest("/push/subscribe", {
    method: "DELETE",
    body: { device_id: getDeviceId() },
  });
}

export async function getSubscriptionStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return Boolean(subscription);
}
