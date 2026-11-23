// Penghapusan satu batch import SQL beserta arsip yang masih terikat padanya.
//
// Aturan penting:
//   - Konten CMS (Berita/Pengumuman/Prestasi) adalah data mandiri. Arsip hanya
//     menyimpan `importedToId` sebagai string tanpa foreign key, jadi menghapus
//     arsip tidak pernah menghapus konten CMS.
//   - Job yang masih diproses tidak boleh dihapus (file sedang dibaca).
//   - File SQL sumber di penyimpanan privat ikut dihapus setelah transaksi DB
//     berhasil; kegagalan hapus file tidak membatalkan operasi data.
//   - Media gambar yang sudah diunduh TIDAK dihapus karena URL-nya mungkin sudah
//     dipakai konten CMS yang tetap hidup.
import { prisma } from '../db.js';
import { conflict, notFound } from '../utils/http.js';
import { isJobActive } from './importService.js';
import { removeJobFile } from './tempStorage.js';

const ACTIVE_STATUSES = new Set(['uploaded', 'processing']);

export async function deleteImportJob(jobId, actorId) {
  const job = await prisma.wordPressImportJob.findUnique({ where: { id: jobId } });
  if (!job) throw notFound('Job import tidak ditemukan.');

  if (ACTIVE_STATUSES.has(job.status) || isJobActive(jobId)) {
    throw conflict('Job masih diproses. Batalkan atau tunggu hingga selesai sebelum menghapus.', 'job_active');
  }

  const items = await prisma.wordPressArchiveItem.findMany({
    where: { jobId },
    select: {
      id: true, wordpressId: true, title: true, targetType: true,
      reviewStatus: true, importedToId: true, importedAt: true,
    },
  });

  const imported = items.filter((item) => item.importedToId || item.reviewStatus === 'imported');
  const detail = items.map((item) => ({
    wordpressId: item.wordpressId.toString(),
    targetType: item.targetType,
    reviewStatus: item.reviewStatus,
    importedToId: item.importedToId ?? null,
    title: (item.title ?? '').slice(0, 200),
  }));

  const result = await prisma.$transaction(async (tx) => {
    await tx.wordPressArchiveDeletion.create({
      data: {
        jobId: job.id,
        originalFileName: job.originalFileName,
        sourceChecksum: job.sourceChecksum,
        jobStatus: job.status,
        deletedItemCount: items.length,
        importedItemCount: imported.length,
        detail,
        deletedBy: actorId ?? null,
      },
    });

    // Revisi ikut terhapus (relasi onDelete: Cascade). Dihapus eksplisit agar
    // hasilnya deterministik di database yang FK-nya belum aktif.
    if (items.length > 0) {
      await tx.wordPressArchiveRevision.deleteMany({ where: { itemId: { in: items.map((item) => item.id) } } });
      await tx.wordPressArchiveItem.deleteMany({ where: { jobId } });
    }
    await tx.wordPressImportJob.delete({ where: { id: jobId } });

    return {
      id: job.id,
      originalFileName: job.originalFileName,
      deletedItemCount: items.length,
      preservedImportedCount: imported.length,
    };
  });

  // Best-effort: file SQL sementara tidak boleh menggagalkan operasi yang sudah
  // commit di database.
  let fileRemoved = true;
  try {
    await removeJobFile(jobId);
  } catch {
    fileRemoved = false;
  }

  return { ...result, fileRemoved };
}