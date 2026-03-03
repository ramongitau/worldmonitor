const express = require('express');
const crypto = require('crypto');
const http = require('http');

// Simple test config
const WEBHOOK_PORT = 4444;
const WEBHOOK_SECRET = process.env.TEST_WEBHOOK_SECRET || 'test_secret_123';
const API_URL = process.env.VITE_CONVEX_URL || 'http://localhost:3210'; 

const app = express();

// Use raw body parser to easily verify signature
app.use(express.raw({ type: 'application/json' }));

console.log('--- Webhook Dispatcher Test ---');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-worldmonitor-signature'];
  const event = req.headers['x-worldmonitor-event'];

  console.log(`\n[Webhook Receiver] Received event: ${event}`);
  
  if (!signature) {
    console.error('❌ Failed: Missing X-WorldMonitor-Signature header');
    return res.status(401).send('Missing signature');
  }

  // Verify HMAC-SHA256 signature
  const expectedHash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(req.body)
    .digest('hex');

  if (expectedHash !== signature) {
    console.error(`❌ Failed: Invalid signature.`);
    console.error(`   Expected: ${expectedHash}`);
    console.error(`   Received: ${signature}`);
    return res.status(401).send('Invalid signature');
  }

  console.log('✅ Success: Webhook signature verified successfully.');
  
  try {
    const payload = JSON.parse(req.body.toString());
    console.log('   Payload:', JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('❌ Failed: Could not parse JSON body', e);
  }

  res.status(200).send('OK');
});

const server = http.createServer(app);

server.listen(WEBHOOK_PORT, async () => {
    console.log(`[Webhook Receiver] Listening on http://localhost:${WEBHOOK_PORT}/webhook`);
    console.log(`   Expected Secret: ${WEBHOOK_SECRET}`);
    console.log('\nPlease ensure a Webhook is configured in the World Monitor Settings:');
    console.log(`URL: http://localhost:${WEBHOOK_PORT}/webhook`);
    console.log(`Secret: ${WEBHOOK_SECRET}`);
    console.log(`Events: intelligence\n`);
    
    console.log('Waiting for events... (Press Ctrl+C to stop)');
});
