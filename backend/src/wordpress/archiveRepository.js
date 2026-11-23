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
  if (!item) throw notFound('Item arsip tidak ditemukan atau sudah dihapus.');
  return item;
}

// State machine review arsip. Status `imported` bersifat final karena record CMS
// sudah dibuat; perubahan lanjutan dilakukan di tabel CMS masing-masing.
const REVIEW_TRANSITIONS = {
  pending_review: new Set(['ready', 'in_audit', 'skipped', 'failed']),
  ready: new Set(['pending_review', 'in_audit', 'skipped', 'failed']),
  in_audit: new Set(['ready', 'pending_review', 'skipped', 'failed']),
  skipped: new Set(['pending_review', 'ready', 'failed']),
  failed: new Set(['pending_review', 'ready', 'in_audit']),
  imported: new Set(),
};

export function canTransitionReview(from, to) {
  if (from === to) return true;
  return Boolean(REVIEW_TRANSITIONS[from]?.has(to));
}

// Item yang sudah masuk CMS tidak boleh diubah status reviewnya lagi.
function assertNotImported(item) {
  if (item.reviewStatus === 'imported' || item.importedAt || item.importedToId) {
    throw conflict('Item sudah diimpor ke CMS. Kelola perubahannya dari menu konten tujuan.', 'already_imported');
  }
}

export async function updateArchiveItem(id, patch, actorId) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound('Item arsip tidak ditemukan atau sudah dihapus.');

  const changes = {};
  for (const key of ['title', 'slug', 'summary', 'content', 'imageUrl', 'targetType', 'reviewStatus', 'reviewNotes']) {
    if (patch[key] !== undefined && patch[key] !== existing[key]) changes[key] = { from: existing[key], to: patch[key] };
  }

  if (patch.reviewStatus !== undefined && patch.reviewStatus !== existing.reviewStatus) {
    assertNotImported(existing);
    if (!canTransitionReview(existing.reviewStatus, patch.reviewStatus)) {
      throw badRequest(`Transisi status ${existing.reviewStatus} → ${patch.reviewStatus} tidak diizinkan.`);
    }
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
  if (!existing) throw notFound('Item arsip tidak ditemukan atau sudah dihapus.');
  if (!REVIEW_TRANSITIONS[reviewStatus]) {
    throw badRequest('reviewStatus tidak valid.');
  }
  assertNotImported(existing);
  if (!canTransitionReview(existing.reviewStatus, reviewStatus)) {
    throw badRequest(`Transisi status ${existing.reviewStatus} → ${reviewStatus} tidak diizinkan.`, {
      from: existing.reviewStatus, to: reviewStatus,
    });
  }

  const data = {
    reviewStatus,
    reviewedBy: actorId ?? null,
    reviewedAt: new Date(),
  };
  if (reviewNotes !== undefined) data.reviewNotes = reviewNotes;
  if (targetType !== undefined && existing.targetType !== targetType) data.targetType = targetType;
  if (targetSlug !== undefined && targetSlug) data.slug = targetSlug;

  const updated = await prisma.wordPressArchiveItem.update({ where: { id }, data });
  await recordRevision(prisma, {
    itemId: id,
    actorId,
    action: 'item_reviewed',
    changes: { from: existing.reviewStatus, reviewStatus, reviewNotes, targetType, previousTargetType: existing.targetType },
  });
  return updated;
}

// Memindahkan item ke antrean Audit Konten. Idempoten: menekan tombol dua kali
// tidak membuat antrean ganda maupun revisi ganda.
export async function startArchiveAudit(id, { actorId, targetType, reviewNotes } = {}) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound('Item arsip tidak ditemukan atau sudah dihapus.');
  assertNotImported(existing);

  const nextTarget = targetType ?? existing.targetType;
  if (existing.reviewStatus === 'in_audit' && nextTarget === existing.targetType) {
    return existing;
  }
  if (targetType !== undefined && !['berita', 'pengumuman', 'prestasi', 'needs_review'].includes(targetType)) {
    throw badRequest('Target konten tidak valid.');
  }

  const updated = await prisma.wordPressArchiveItem.update({
    where: { id },
    data: {
      reviewStatus: 'in_audit',
      targetType: nextTarget,
      reviewedBy: actorId ?? null,
      reviewedAt: new Date(),
      ...(reviewNotes !== undefined ? { reviewNotes } : {}),
    },
  });
  await recordRevision(prisma, {
    itemId: id,
    actorId,
    action: 'audit_started',
    changes: { from: existing.reviewStatus, targetType: nextTarget, previousTargetType: existing.targetType },
  });
  return updated;
}

// Aksi massal divalidasi di backend per item agar status yang sudah imported
// tidak pernah berubah karena pilihan massal di frontend.
export async function bulkArchiveAction(ids, action, actorId) {
  if (!Array.isArray(ids) || ids.length === 0) throw badRequest('Pilih minimal satu item.');
  if (ids.length > 100) throw badRequest('Maksimal 100 item per aksi massal.');
  const handlers = {
    audit: (item) => startArchiveAudit(item.id, { actorId }),
    ready: (item) => reviewArchiveItem(item.id, { reviewStatus: 'ready', actorId }),
    skip: (item) => skipArchiveItem(item.id, { actorId }),
  };
  const handler = handlers[action];
  if (!handler) throw badRequest('Aksi massal tidak dikenal.');

  const summary = { action, total: ids.length, ok: 0, failed: 0, skippedImported: 0, errors: [] };
  for (const id of ids) {
    try {
      await handler({ id });
      summary.ok += 1;
    } catch (error) {
      if (error?.code === 'already_imported') {
        summary.skippedImported += 1;
        continue;
      }
      summary.failed += 1;
      if (summary.errors.length < 10) summary.errors.push({ id, message: error?.message ?? 'Gagal' });
    }
  }
  return summary;
}

export async function skipArchiveItem(id, { actorId, reviewNotes }) {
  const existing = await prisma.wordPressArchiveItem.findUnique({ where: { id } });
  if (!existing) throw notFound('Item arsip tidak ditemukan atau sudah dihapus.');
  assertNotImported(existing);
  if (existing.reviewStatus === 'skipped' && reviewNotes === undefined) return existing;
  const updated = await prisma.wordPressArchiveItem.update({
    where: { id },
    data: {
      reviewStatus: 'skipped',
      reviewNotes: reviewNotes ?? existing.reviewNotes,
      reviewedBy: actorId ?? null,
      reviewedAt: new Date(),
    },
  });
  await recordRevision(prisma, { itemId: id, actorId, action: 'item_skipped', changes: { from: existing.reviewStatus, reviewNotes } });
  return updated;
}

// Import satu archive item ke tabel konten publik.
// `status` hanya boleh draft/published dan divalidasi sebelum transaksi.
export async function importToPublicContent(id, actorId, requestedStatus = 'draft') {
  if (!['draft', 'published'].includes(requestedStatus)) {
    throw badRequest('Status publikasi tidak valid. Gunakan draft atau published.');
  }
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
      status: requestedStatus,
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
        status: requestedStatus,
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

// ── Audit Konten ─────────────────────────────────────────────────────────────
// Status CMS dibaca dari tabel tujuan agar status audit tidak dicampur dengan
// status publikasi. Join dilakukan di aplikasi karena `importedToId` bersifat
// polimorfik (tanpa foreign key lintas tabel).
const CMS_TARGETS = ['berita', 'pengumuman', 'prestasi'];

async function cmsStatusMap(items) {
  const map = new Map();
  for (const target of CMS_TARGETS) {
    const ids = items.filter((item) => item.targetType === target && item.importedToId).map((item) => item.importedToId);
    if (ids.length === 0) continue;
    const rows = await prisma[target].findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    for (const row of rows) map.set(row.id, row.status);
  }
  return map;
}

export function auditStateOf(item, cmsStatus) {
  if (item.reviewStatus === 'imported') return cmsStatus === 'published' ? 'published' : 'draft';
  if (item.reviewStatus === 'in_audit') return 'in_audit';
  if (item.reviewStatus === 'ready') return 'ready';
  if (item.reviewStatus === 'pending_review') return 'pending_review';
  return item.reviewStatus;
}

export async function decorateAuditState(items) {
  const statuses = await cmsStatusMap(items);
  return items.map((item) => ({
    ...item,
    cmsStatus: item.importedToId ? statuses.get(item.importedToId) ?? null : null,
    auditState: auditStateOf(item, item.importedToId ? statuses.get(item.importedToId) ?? null : null),
  }));
}

export async function getAuditQueue({ where = {}, orderBy = { updatedAt: 'desc' }, skip = 0, take = 20 } = {}) {
  const [items, total] = await prisma.$transaction([
    prisma.wordPressArchiveItem.findMany({ where, orderBy, skip, take }),
    prisma.wordPressArchiveItem.count({ where }),
  ]);
  return { items: await decorateAuditState(items), total };
}

export async function getAuditOverview() {
  const [ready, inAudit, pending, importedItems] = await Promise.all([
    prisma.wordPressArchiveItem.count({ where: { reviewStatus: 'ready' } }),
    prisma.wordPressArchiveItem.count({ where: { reviewStatus: 'in_audit' } }),
    prisma.wordPressArchiveItem.count({ where: { reviewStatus: 'pending_review' } }),
    prisma.wordPressArchiveItem.findMany({
      where: { reviewStatus: 'imported' },
      select: { id: true, targetType: true, importedToId: true },
    }),
  ]);
  const statuses = await cmsStatusMap(importedItems);
  const importedStatuses = importedItems.map((item) => statuses.get(item.importedToId) ?? null);
  const draft = importedStatuses.filter((status) => status !== 'published').length;
  const published = importedStatuses.filter((status) => status === 'published').length;
  return {
    queueTotal: ready + inAudit,
    pendingReview: pending,
    needCheck: ready,
    inAudit,
    readyToPublish: draft,
    draft,
    published,
    importedTotal: importedItems.length,
  };
}

export async function getAuditItem(id) {
  const item = await getArchiveItem(id);
  const [decorated] = await decorateAuditState([item]);
  return decorated;
}