# World Monitor Public API & Webhooks

World Monitor provides a full suite of API endpoints and a Webhook dispatcher to integrate global intelligence into your own systems.

## Authentication

All API endpoints expect an `X-WorldMonitor-Key` header.
Keys can be generated from the **Settings -> API & Webhooks** panel within the application.

```bash
curl -H "X-WorldMonitor-Key: your-api-key" https://worldmonitor.app/api/data/intelligence
```

## Available Endpoints

Below are some of the key endpoints available via the Public API. They return JSON data conforming to the WorldMonitor Protocol Buffer schemas.

### Intelligence & Security
- `GET /api/data/intelligence` - Returns latest geopolitical & military intelligence signals.
- `GET /api/data/cyber` - Returns cyber threats, APT activity, and ransomware IOCs.
- `GET /api/data/conflict` - Returns active conflicts, border clashes, and UCDP event data.

### Global Infrastructure
- `GET /api/data/infrastructure` - Returns status of undersea cables, datacenters, and pipelines.
- `GET /api/data/aviation` - Returns global flight disruption metrics via OpenSky.
- `GET /api/data/maritime` - Returns maritime disruptions, chokepoint delays, and piracy incidents.

### Economics & Markets
- `GET /api/data/market` - Returns latest market signals, including ETF flows and stablecoins.
- `GET /api/data/economic` - Returns macro-economic indicators, supply chain metrics, and WTO policy changes.

### Natural Disasters
- `GET /api/data/seismology` - Returns recent significant earthquakes (USGS).
- `GET /api/data/wildfire` - Returns global fire hotspots (NASA FIRMS).
- `GET /api/data/climate` - Returns severe weather alerts, droughts, and temperature anomalies.

### Social Dynamics
- `GET /api/data/unrest` - Returns political protests, riots, and suppression events.
- `GET /api/data/displacement` - Returns refugee flows and displacement alerts (UNHCR).

## Rate Limits

API Rate Limits are enforced strictly by IP and API Key.
By default, each API Key has a limit of **100 requests per minute**.

## Webhooks

Webhooks allow you to subscribe to real-time events. Whenever World Monitor's ingestors identify a critical event, it will dispatch a POST request to your configured webhook URL.

### Webhook Signatures

Each webhook request includes an `X-WorldMonitor-Signature` header. This signature is an HMAC-SHA256 hash of the request body, using your Webhook Secret.

To verify a webhook in Node.js:
```javascript
const crypto = require('crypto');

function verifySignature(body, signature, secret) {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return hash === signature;
}
```

### Event Types

When configuring a Webhook, you can subscribe to specific events:
- `intelligence`
- `cyber`
- `conflict`
- `infrastructure`
- `market`
- `natural_disaster`
- `unrest`
