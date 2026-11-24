import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { resolveTrustProxy } from '../src/config/proxy.js';

// Minimal app: only the `trust proxy` behaviour under test, no database.
async function clientIp(setting, forwardedFor) {
  const app = express();
  app.set('trust proxy', setting);
  app.get('/ip', (req, res) => res.json({ ip: req.ip, protocol: req.protocol }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const headers = forwardedFor ? { 'x-forwarded-for': forwardedFor, 'x-forwarded-proto': 'https' } : {};
    const res = await fetch(`http://127.0.0.1:${server.address().port}/ip`, { headers });
    return await res.json();
  } finally {
    server.close();
  }
}

const isLoopback = (ip) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);

test('default: visitor IP behind Cloudflare -> LiteSpeed (LiteSpeed appends edge IP)', async () => {
  const { ip, protocol } = await clientIp(resolveTrustProxy(undefined), '203.0.113.9, 162.158.10.20');
  assert.equal(ip, '203.0.113.9');
  assert.equal(protocol, 'https');
});

test('default: visitor IP when only Cloudflare wrote X-Forwarded-For', async () => {
  const { ip } = await clientIp(resolveTrustProxy(undefined), '203.0.113.9');
  assert.equal(ip, '203.0.113.9');
});

test('default: a spoofed X-Forwarded-For entry cannot replace the real visitor IP', async () => {
  const { ip } = await clientIp(resolveTrustProxy(undefined), '1.2.3.4, 203.0.113.9, 172.70.1.1');
  assert.equal(ip, '203.0.113.9');
});

test('default: bypassing Cloudflare yields the caller IP, not a forged one', async () => {
  // Direct hit on the origin: LiteSpeed appends the real caller (not a Cloudflare IP).
  const { ip } = await clientIp(resolveTrustProxy(undefined), '1.2.3.4, 198.51.100.7');
  assert.equal(ip, '198.51.100.7');
});

test('default: local requests without proxy headers keep the socket address', async () => {
  const { ip } = await clientIp(resolveTrustProxy(undefined));
  assert.ok(isLoopback(ip), ip);
});

test('TRUST_PROXY=false disables proxy trust', async () => {
  assert.equal(resolveTrustProxy('false'), false);
  const { ip } = await clientIp(resolveTrustProxy('false'), '203.0.113.9');
  assert.ok(isLoopback(ip), ip);
});

test('TRUST_PROXY accepts a custom comma-separated list', () => {
  assert.deepEqual(resolveTrustProxy(' loopback, 10.0.0.0/8 '), ['loopback', '10.0.0.0/8']);
});

test('TRUST_PROXY=true is rejected (spoofable, and express-rate-limit refuses it)', () => {
  assert.throws(() => resolveTrustProxy('true'), /TRUST_PROXY/);
});
