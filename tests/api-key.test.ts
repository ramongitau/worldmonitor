import { validateApiKey } from '../api/_api-key.js';
import assert from 'assert';

// Mock ConvexHttpClient
jest.mock('convex/browser', () => {
  return {
    ConvexHttpClient: jest.fn().mockImplementation(() => {
      return {
        query: jest.fn().mockImplementation((queryName, args) => {
          if (args?.key === 'valid-convex-key') {
            return Promise.resolve({ isActive: true });
          }
          if (args?.key === 'inactive-convex-key') {
            return Promise.resolve({ isActive: false });
          }
          return Promise.resolve(null);
        })
      };
    })
  };
});

describe('validateApiKey via Convex & Env', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should deny request without API key for external origins', async () => {
    const req = { headers: new Headers() };
    const result = await validateApiKey(req);
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.required, true);
  });

  it('should allow valid environment API key', async () => {
    process.env.WORLDMONITOR_VALID_KEYS = 'valid-env-key';
    const req = { headers: new Headers({ 'x-worldmonitor-key': 'valid-env-key' }) };
    const result = await validateApiKey(req);
    assert.strictEqual(result.valid, true);
  });

  it('should deny invalid environment API key', async () => {
    process.env.WORLDMONITOR_VALID_KEYS = 'valid-env-key';
    const req = { headers: new Headers({ 'x-worldmonitor-key': 'invalid-key' }) };
    const result = await validateApiKey(req);
    assert.strictEqual(result.valid, false);
  });

  it('should allow active Convex API key', async () => {
    const req = { headers: new Headers({ 'x-worldmonitor-key': 'valid-convex-key' }) };
    const result = await validateApiKey(req);
    assert.strictEqual(result.valid, true);
  });

  it('should deny inactive Convex API key', async () => {
    const req = { headers: new Headers({ 'x-worldmonitor-key': 'inactive-convex-key' }) };
    const result = await validateApiKey(req);
    assert.strictEqual(result.valid, false);
  });
});
