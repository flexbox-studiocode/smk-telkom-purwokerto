// Resolusi media arsip WordPress sebagai proses terpisah & terkontrol admin.
//
// Tidak ada unduhan massal otomatis saat SQL diunggah. Setiap permintaan
// memvalidasi URL (SSRF), mengikuti redirect secara aman, membatasi ukuran dan
// waktu, memverifikasi signature gambar, lalu menyimpan ke storage privat yang
// disajikan lewat rute statis terkontrol.
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { storage } from '../utils/storage.js';
import { badRequest, notFound } from '../utils/http.js';
import { fetchImageSafely } from '../../wordpress-archive/src/lib/safe-fetch.js';
import { recordRevision } from './archiveRepository.js';

const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
};

export async function resolveItemMedia(itemId, actorId) {
  const item = await prisma.wordPressArchiveItem.findUnique({ where: { id: itemId } });
  if (!item) throw notFound('Item arsip tidak ditemukan.');
  const candidate = item.metadata && typeof item.metadata === 'object' ? item.metadata.imageCandidateUrl : null;
  if (!candidate) throw badRequest('Item ini tidak memiliki kandidat gambar dari WordPress.');

  let result;
  try {
    result = await fetchImageSafely(candidate, { maxBytes: env.WORDPRESS_MEDIA_MAX_BYTES });
  } catch (error) {
    await prisma.wordPressArchiveItem.update({
      where: { id: item.id },
      data: {
        metadata: { ...(item.metadata || {}), media: { status: 'failed', reason: error.message, sourceUrl: candidate, resolvedAt: new Date().toISOString() } },
      },
    });
    throw badRequest(`Gambar tidak dapat diambil: ${error.message}`);
  }

  const extension = EXTENSION[result.contentType] || 'bin';
  const key = `wordpress/${crypto.createHash('sha1').update(candidate).digest('hex').slice(0, 2)}/${crypto.randomUUID()}.${extension}`;
  const publicUrl = await storage.put('content-images', key, result.buffer);

  const updated = await prisma.wordPressArchiveItem.update({
    where: { id: item.id },
    data: {
      imageUrl: publicUrl,
      metadata: {
        ...(item.metadata || {}),
        media: {
          status: 'ok',
          sourceUrl: candidate,
          contentType: result.contentType,
          bytes: result.bytes,
          resolvedAt: new Date().toISOString(),
        },
      },
    },
  });
  await recordRevision(prisma, {
    itemId: item.id,
    actorId,
    action: 'media_resolved',
    changes: { sourceUrl: candidate, imageUrl: publicUrl, bytes: result.bytes },
  });
  return updated;
}

export async function resolveBatch(itemIds, actorId, { limit = 5 } = {}) {
  const unique = [...new Set(itemIds)].slice(0, limit);
  const results = [];
  for (const id of unique) {
    try {
      const item = await resolveItemMedia(id, actorId);
      results.push({ id, status: 'ok', imageUrl: item.imageUrl });
    } catch (error) {
      results.push({ id, status: 'failed', error: error.message });
    }
  }
  return results;
}