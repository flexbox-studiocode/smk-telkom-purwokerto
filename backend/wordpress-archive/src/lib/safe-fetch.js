// SSRF-safe HTTP helper untuk media WordPress (input tidak tepercaya).
//
// Perlindungan:
//   - hanya http/https, tanpa kredensial di URL, port 80/443 saja;
//   - hostname localhost / .local / metadata internal ditolak;
//   - seluruh alamat hasil DNS harus publik (private/loopback/link-local/
//     unique-local/CGNAT/reserved ditolak);
//   - redirect ditangani manual dan SETIAP lompatan divalidasi ulang;
//   - ukuran body dibatasi saat streaming (bukan setelah buffering penuh);
//   - content-type harus image/* dan file signature harus cocok.
import dns from 'node:dns/promises';
import net from 'node:net';

const BLOCKED_HOSTNAMES = new Set([
  'localhost', 'localhost.localdomain', 'metadata', 'metadata.google.internal', 'instance-data',
]);

const IPV4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
];

function ipv4ToInt(ip) {
  return ip.split('.').reduce((acc, part) => ((acc << 8) + Number(part)) >>> 0, 0);
}

export function isBlockedIp(ip) {
  const value = String(ip ?? '').trim();
  if (!value) return true;
  if (net.isIPv4(value)) {
    const numeric = ipv4ToInt(value);
    return IPV4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
      return (numeric & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (!net.isIPv6(value)) return true;
  const lower = value.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    if (net.isIPv4(mapped)) return isBlockedIp(mapped);
    // Hex-mapped form ::ffff:7f00:1
    const hex = mapped.split(':');
    if (hex.length === 2) {
      const hi = Number.parseInt(hex[0], 16);
      const lo = Number.parseInt(hex[1], 16);
      if (Number.isFinite(hi) && Number.isFinite(lo)) {
        return isBlockedIp(`${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`);
      }
    }
    return true;
  }
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link local
  if (lower.startsWith('ff')) return true; // multicast
  if (lower.startsWith('2001:db8')) return true; // documentation
  if (lower.startsWith('64:ff9b')) return true; // NAT64
  return false;
}

// Memvalidasi satu URL absolut. lookupFn dapat diganti saat pengujian.
export async function assertSafeRemoteUrl(rawUrl, { lookupFn = dns.lookup } = {}) {
  let parsed;
  try { parsed = new URL(String(rawUrl)); } catch { throw new Error('URL media tidak valid.'); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Hanya URL HTTP/HTTPS yang diizinkan.');
  if (parsed.username || parsed.password) throw new Error('URL media tidak boleh memuat kredensial.');
  const port = parsed.port ? Number(parsed.port) : (parsed.protocol === 'https:' ? 443 : 80);
  if (port !== 80 && port !== 443) throw new Error('Port media tidak diizinkan.');
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!hostname) throw new Error('Hostname media kosong.');
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Alamat media internal tidak diizinkan.');
  }
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) throw new Error('Alamat IP media tidak diizinkan.');
    return parsed;
  }
  let addresses;
  try { addresses = await lookupFn(hostname, { all: true, verbatim: true }); } catch { throw new Error('Hostname media tidak dapat di-resolve.'); }
  const list = Array.isArray(addresses) ? addresses : [{ address: addresses?.address }];
  if (list.length === 0) throw new Error('Hostname media tidak dapat di-resolve.');
  for (const entry of list) {
    if (isBlockedIp(entry?.address)) throw new Error('Alamat media mengarah ke jaringan internal.');
  }
  return parsed;
}

const MAGIC = [
  { type: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: 'image/gif', bytes: [0x47, 0x49, 0x46] },
  { type: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { type: 'image/bmp', bytes: [0x42, 0x4d] },
  { type: 'image/avif', bytes: [0x00, 0x00, 0x00] },
];

export function detectImageType(buffer) {
  for (const entry of MAGIC) {
    if (entry.bytes.every((byte, index) => buffer[index] === byte)) {
      if (entry.type === 'image/avif') {
        return buffer.slice(4, 12).toString('ascii').includes('ftyp') ? entry.type : null;
      }
      return entry.type;
    }
  }
  return null;
}

// Mengunduh gambar dengan batas ukuran/waktu dan validasi setiap redirect.
export async function fetchImageSafely(rawUrl, options = {}) {
  const {
    maxBytes = 8 * 1024 * 1024,
    timeoutMs = 15000,
    maxRedirects = 3,
    fetchImpl = globalThis.fetch,
    lookupFn = dns.lookup,
    userAgent = 'smk-telkom-wp-media/1.0',
  } = options;
  let current = String(rawUrl);
  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const parsed = await assertSafeRemoteUrl(current, { lookupFn });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(parsed.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'user-agent': userAgent, accept: 'image/*' },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      throw new Error(error?.name === 'AbortError' ? 'Unduhan media melewati batas waktu.' : 'Gagal mengunduh media.');
    }
    try {
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('Redirect media tanpa tujuan.');
        if (hop === maxRedirects) throw new Error('Terlalu banyak redirect media.');
        current = new URL(location, parsed).toString();
        continue;
      }
      if (!response.ok) throw new Error(`Sumber media mengembalikan HTTP ${response.status}.`);
      const contentType = String(response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.startsWith('image/')) throw new Error('Respons media bukan gambar.');
      const declared = Number(response.headers.get('content-length') || 0);
      if (declared && declared > maxBytes) throw new Error('Ukuran media melebihi batas.');
      const chunks = [];
      let total = 0;
      for await (const chunk of response.body) {
        const buffer = Buffer.from(chunk);
        total += buffer.length;
        if (total > maxBytes) throw new Error('Ukuran media melebihi batas.');
        chunks.push(buffer);
      }
      const buffer = Buffer.concat(chunks, total);
      const detected = detectImageType(buffer);
      if (!detected) throw new Error('Isi berkas media bukan gambar yang didukung.');
      return { buffer, contentType: detected, finalUrl: parsed.toString(), bytes: total };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Terlalu banyak redirect media.');
}