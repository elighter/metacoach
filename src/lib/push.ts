import webpush from "web-push";

const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:admin@metacoach.app";

let configured = false;
function ensure() {
  if (!configured && PUBLIC && PRIVATE) {
    webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
    configured = true;
  }
}

export function pushConfigured() {
  return Boolean(PUBLIC && PRIVATE);
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send a push; returns false if the subscription is gone (410/404) so the caller can prune it. */
export async function sendPush(
  target: PushTarget,
  payload: { title: string; body: string; url?: string },
): Promise<boolean> {
  ensure();
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return false; // expired subscription
    throw err;
  }
}
