// Express `trust proxy` for the cPanel deployment: visitor -> Cloudflare -> LiteSpeed -> Node.
//
// Without it every request looks like it comes from the local proxy, so all
// per-IP rate limits (global, login, AI) become one bucket shared by the whole site.
//
// Express walks X-Forwarded-For from the right and skips trusted addresses; the
// first untrusted one becomes `req.ip`. Trusting only local addresses plus
// Cloudflare's published ranges means a visitor cannot forge their IP with their
// own X-Forwarded-For entry, and a request that bypasses Cloudflare resolves to
// the real caller. `true` is deliberately refused: it trusts the left-most
// (client-controlled) entry, and express-rate-limit rejects it.

// Source: https://www.cloudflare.com/ips-v4 and https://www.cloudflare.com/ips-v6 (checked 2026-11-25).
export const CLOUDFLARE_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32',
  '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

export const DEFAULT_TRUST_PROXY = ['loopback', 'linklocal', 'uniquelocal', ...CLOUDFLARE_RANGES];

// TRUST_PROXY: unset/empty -> default above; "false" -> no proxy trust;
// otherwise a comma-separated list of addresses/subnets/presets for Express.
export function resolveTrustProxy(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return DEFAULT_TRUST_PROXY;
  const lower = raw.toLowerCase();
  if (lower === 'false' || lower === '0') return false;
  if (lower === 'true') {
    throw new Error('TRUST_PROXY=true is not allowed: it lets visitors forge their IP. Use a list of proxy addresses instead.');
  }
  return raw.split(',').map((item) => item.trim()).filter(Boolean);
}
