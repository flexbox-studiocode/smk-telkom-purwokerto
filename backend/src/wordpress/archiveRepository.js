// Repositori database untuk arsip WordPress.
// Menyediakan operasi CRUD terstruktur, pencatatan revisi, dan alur import
// ke tabel konten publik yang sudah ada (Berita, Pengumuman, Prestasi).
import { prisma } from '../db.js';
import { badRequest, conflict, notFound } from '../utils/http.js';
import { beritaSchema, pengumumanSchema, prestasiSchema } from '../validators/content.js';

export async function getArchiveItems({ where = {}, orderBy = { createdAt: 'desc' }, skip = 0, take = 20, include } = {}) {
  const [items, total] = await prisma.$transaction([
    prisma.wordPressArchiveItem.findMany({ where, orderBy, skip, take, ...(include ? { include } : {}) }),
    prisma.wordPressArchiveItem.count({ where }),
  ]);
  return { items, total };
}

export async function getArchiveItem(id) {
  const item = await prisma.wordPressArchiveItem.findUnique({
    where: { id },
    include: { revisions: { orderBy: { createdAt: 'desc' }, take: 20 } },
  });
  if (!item) throw notFound();
  return item;
}

export async function updateArchiveItem(id, patch, actorId) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound();

  const changes = {};
  for (const key of ['title', 'slug', 'summary', 'content', 'imageUrl', 'targetType', 'reviewStatus', 'reviewNotes']) {
    if (patch[key] !== undefined && patch[key] !== existing[key]) changes[key] = { from: existing[key], to: patch[key] };
  }

  const sanitized = {};
  if ('content' in patch && patch.content !== undefined) {
    const { sanitizeHtml } = await import('../../wordpress-archive/src/lib/sanitize.js');
    sanitized.content = patch.content ? sanitizeHtml(patch.content) : null;
  }

  const updated = await prisma.wordPressArchiveItem.update({
    where: { id },
    data: { ...patch, ...sanitized, updatedAt: new Date() },
  });

  if (Object.keys(changes).length > 0) {
    await recordRevision(prisma, { itemId: id, actorId, action: 'item_updated', changes });
  }
  return updated;
}

export async function reviewArchiveItem(id, { reviewStatus, reviewNotes, targetType, targetSlug, actorId }) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound();
  if (!['pending_review', 'ready', 'skipped', 'failed'].includes(reviewStatus)) {
    throw badRequest('reviewStatus tidak valid.');
  }

  const data = {
    reviewStatus,
    reviewedBy: actorId ?? null,
    reviewedAt: new Date(),
  };
  if (reviewNotes !== undefined) data.reviewNotes = reviewNotes;
  if (targetType !== undefined && existing.targetType !== targetType) data.targetType = targetType;

  const updated = await prisma.wordPressArchiveItem.update({ where: { id }, data });
  await recordRevision(prisma, {
    itemId: id,
    actorId,
    action: 'item_reviewed',
    changes: { reviewStatus, reviewNotes, targetType, previousTargetType: existing.targetType },
  });
  return updated;
}

export async function skipArchiveItem(id, { actorId, reviewNotes }) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound();
  const updated = await prisma.wordPressArchiveItem.update({
    where: { id },
    data: {
      reviewStatus: 'skipped',
      reviewNotes: reviewNotes ?? existing.reviewNotes,
      reviewedBy: actorId ?? null,
      reviewedAt: new Date(),
    },
  });
  await recordRevision(prisma, { itemId: id, actorId, action: 'item_skipped', changes: { reviewNotes } });
  return updated;
}

// Import satu archive item ke tabel konten publik.
// Semua hasil import berstatus DRAFT. Idempoten: bila item sudah diimport
// sebelumnya (importedToId terisi), konflik dilaporkan.
export async function importToPublicContent(id, actorId) {
  return prisma.$transaction(async (tx) => {
    const item = await tx.wordPressArchiveItem.findUnique({ where: { id } });
    if (!item) throw notFound();
    if (item.importedAt && item.importedToId) {
      throw conflict('Item sudah pernah diimport.', 'already_imported');
    }
    if (item.targetType === 'needs_review') {
      throw badRequest('Item belum memiliki target. Pilih target Berita, Pengumuman, atau Prestasi terlebih dahulu.');
    }

    // Kondisi WHERE menjadikan claim atomik. Request paralel kedua mendapat 0
    // row lalu berhenti sebelum menulis konten publik.
    const claimed = await tx.wordPressArchiveItem.updateMany({
      where: {
        id,
        importedAt: null,
        OR: [{ importStatus: null }, { importStatus: { not: 'importing' } }],
      },
      data: { importStatus: 'importing' },
    });
    if (claimed.count === 0) {
      throw conflict('Item sedang atau sudah diimport.', 'already_imported');
    }

    let created;
    const base = {
      judul: item.title,
      slug: item.slug,
      ringkasan: item.summary,
      konten: item.content ?? item.title,
      gambarUrl: item.imageUrl ?? null,
      status: 'draft',
    };

    if (item.targetType === 'berita') {
      const data = beritaSchema.parse({ ...base, penulis: null });
      created = await tx.berita.create({ data });
    } else if (item.targetType === 'pengumuman') {
      const data = pengumumanSchema.parse({ ...base, tanggal: item.sourceDate });
      created = await tx.pengumuman.create({ data });
    } else if (item.targetType === 'prestasi') {
      const data = prestasiSchema.parse({
        judul: item.title,
        slug: item.slug,
        deskripsi: item.content ?? item.title,
        kategori: null,
        tingkat: null,
        gambarUrl: item.imageUrl ?? null,
        instagramUrl: null,
        tanggal: item.sourceDate,
        status: 'draft',
      });
      created = await tx.prestasi.create({ data });
    } else {
      throw badRequest('Tipe target tidak dikenal.');
    }

    await tx.wordPressArchiveItem.update({
      where: { id },
      data: {
        reviewStatus: 'imported',
        importStatus: 'imported',
        importedToId: created.id,
        importedAt: new Date(),
        reviewedBy: actorId ?? null,
        reviewedAt: new Date(),
      },
    });
    await recordRevision(tx, {
      itemId: id,
      actorId,
      action: 'item_imported',
      changes: { targetType: item.targetType, publicId: created.id, slug: item.slug },
    });
    return created;
  });
}

export async function recordRevision(prismaInstance, { itemId, actorId, action, changes }) {
  try {
    await prismaInstance.wordPressArchiveRevision.create({
      data: {
        itemId,
        actorId: actorId ?? null,
        action,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      },
    });
  } catch {
    // Revisi bukan blokir; kegagalan pencatatan tidak boleh menggagalkan operasi utama.
  }
}