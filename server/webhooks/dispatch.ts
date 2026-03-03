import { ConvexHttpClient } from "convex/browser";

let convexClient: ConvexHttpClient | null = null;
if (process.env.CONVEX_URL) {
  convexClient = new ConvexHttpClient(process.env.CONVEX_URL);
}

/**
 * Dispatches a webhook event to all subscribed active webhooks.
 * @param eventType - The type of event (e.g. 'intelligence', 'conflict').
 * @param payload - The JSON payload to dispatch.
 */
export async function dispatchWebhooks(eventType: string, payload: any): Promise<void> {
  if (!convexClient) return;

  try {
    const activeWebhooks = await convexClient.query("webhooks:getActive");
    const matchingWebhooks = activeWebhooks.filter((w: any) => w.events.includes(eventType));

    if (matchingWebhooks.length === 0) return;

    const payloadString = JSON.stringify(payload);
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadString);

    const dispatchPromises = matchingWebhooks.map(async (webhook: any) => {
      try {
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(webhook.secret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );
        const signatureBuffer = await crypto.subtle.sign("HMAC", keyMaterial, data);
        const signatureArray = Array.from(new Uint8Array(signatureBuffer));
        const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

        await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-WorldMonitor-Signature": signatureHex,
            "X-WorldMonitor-Event": eventType
          },
          body: payloadString,
          signal: AbortSignal.timeout(5000)
        });
      } catch (err) {
        console.error(`Failed to dispatch webhook to ${webhook.url}:`, err);
      }
    });

    await Promise.allSettled(dispatchPromises);
  } catch (error) {
    console.error("Failed to query active webhooks:", error);
  }
}
