// Orkestrasi impor arsip WordPress: validasi upload, pemrosesan bertahap,
// progres, pembatalan, dan penyimpanan hasil adaptasi ke tabel arsip.
//
// Proses berat (scan dump) berjalan di background setelah respons HTTP 202,
// dibatasi konkurensi 1 dan batas waktu, sehingga request admin tidak timeout.
import crypto from 'node:crypto';
import { prisma } from '../db.js';
import { env } from '../config/env.js';
import { decodeSqlBuffer } from '../../wordpress-archive/src/lib/sql-parser.js';
import { scanDump, validateDumpStructure, iterateDumpRows, looksLikeSqlDump, DumpValidationError, CONTENT_TABLE } from './dumpValidator.js';
import { buildArchiveItem } from './archiveItems.js';
import {
  writeJobFile, readJobFile, removeJobFile, jobFileExists, cleanupExpiredFiles, TEMP_DIR,
} from './tempStorage.js';

const MAX_CONCURRENT_JOBS = 1;
const JOB_TIME_LIMIT_MS = 10 * 60 * 1000;
const BATCH_SIZE = 100;

const activeJobs = new Map();
const queue = [];

function emptySlugRegistry() {
  return { berita: new Set(), pengumuman: new Set(), prestasi: new Set(), needs_review: new Set() };
}

export function activeJobCount() {
  return activeJobs.size;
}

export function isJobActive(jobId) {
  return activeJobs.has(jobId);
}

export function requestCancel(jobId) {
  const entry = activeJobs.get(jobId);
  if (!entry) return false;
  entry.cancelled = true;
  const queuedIndex = queue.indexOf(jobId);
  if (queuedIndex !== -1) queue.splice(queuedIndex, 1);
  return true;
}

function pump() {
  while (activeJobs.size < MAX_CONCURRENT_JOBS && queue.length > 0) {
    const jobId = queue.shift();
    const entry = { cancelled: false, startedAt: Date.now() };
    activeJobs.set(jobId, entry);
    processJob(jobId, entry)
      .catch(async (error) => {
        await prisma.wordPressImportJob.update({
          where: { id: jobId },
          data: {
            status: 'failed',
            errorSummary: String(error?.message ?? 'Pemrosesan gagal.').slice(0, 2000),
            completedAt: new Date(),
          },
        }).catch(() => {});
      })
      .finally(async () => {
        activeJobs.delete(jobId);
        await removeJobFile(jobId).catch(() => {});
        pump();
      });
  }
}

export function enqueueJob(jobId) {
  queue.push(jobId);
  pump();
}

// Membuat job baru dari buffer upload. Mengembalikan { job, duplicate }.
// `duplicate` diisi job lama bila checksum sama sudah pernah diunggah.
export async function createImportJob({ buffer, originalFileName, mimeType, userId }) {
  const fileSize = buffer.length;
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = await prisma.wordPressImportJob.findUnique({ where: { sourceChecksum: checksum } });
  if (existing) return { job: existing, duplicate: true };

  const job = await prisma.wordPressImportJob.create({
    data: {
      originalFileName: String(originalFileName || 'dump.sql').slice(0, 255),
      sourceChecksum: checksum,
      fileSize: BigInt(fileSize),
      status: 'uploaded',
      createdBy: userId ?? null,
    },
  });
  await writeJobFile(job.id, buffer);
  enqueueJob(job.id);
  return { job, duplicate: false, mimeType };
}

function parseDumpOrThrow(buffer) {
  const { text, encoding } = decodeSqlBuffer(buffer);
  if (!looksLikeSqlDump(text.slice(0, 65536))) {
    throw new DumpValidationError('File tidak terlihat seperti dump SQL.');
  }
  return { text, encoding };
}

async function processJob(jobId, state) {
  const started = Date.now();
  const job = await prisma.wordPressImportJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (!(await jobFileExists(jobId))) {
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorSummary: 'File SQL sementara tidak ditemukan. Unggah ulang file.', completedAt: new Date() },
    });
    return;
  }

  await prisma.wordPressImportJob.update({ where: { id: jobId }, data: { status: 'processing', errorSummary: null } });

  let buffer;
  try {
    buffer = await readJobFile(jobId);
  } catch {
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorSummary: 'File SQL sementara tidak dapat dibaca.', completedAt: new Date() },
    });
    return;
  }

  let text;
  try {
    ({ text } = parseDumpOrThrow(buffer));
  } catch (error) {
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorSummary: error.message, completedAt: new Date() },
    });
    return;
  } finally {
    buffer = null;
  }

  // Validasi struktur lebih dulu: tidak ada baris arsip yang ditulis bila dump
  // tidak memuat tabel/kolom wajib atau memuat statement terlarang.
  let structure;
  try {
    structure = validateDumpStructure(text);
  } catch (error) {
    text = null;
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: { status: 'failed', errorSummary: String(error?.message ?? 'Dump tidak valid.').slice(0, 2000), completedAt: new Date() },
    });
    return;
  }

  const usedSlugs = emptySlugRegistry();
  const counts = {
    rows: 0, berita: 0, pengumuman: 0, prestasi: 0, review: 0, skipped: 0, failed: 0,
  };
  const streamStats = { rows: 0, skippedTuples: 0 };
  let batch = [];
  let lastProgress = 0;
  let cancelled = false;
  let timedOut = false;
  let fatalError = null;

  const flush = async () => {
    if (batch.length === 0) return;
    const payload = batch;
    batch = [];
    const inserted = await prisma.wordPressArchiveItem.createMany({ data: payload, skipDuplicates: true });
    if (typeof inserted.count === 'number' && inserted.count < payload.length) {
      counts.skipped += payload.length - inserted.count;
    }
  };

  try {
    for await (const post of iterateDumpRows(text, streamStats, {
      onProgress: (ratio) => {
        const progress = Math.min(99, Math.floor(ratio * 100));
        if (progress >= lastProgress + 10) {
          lastProgress = progress;
          prisma.wordPressImportJob.update({
            where: { id: jobId },
            data: { progress, processedRows: counts.rows },
          }).catch(() => {});
        }
      },
    })) {
      if (state.cancelled) { cancelled = true; break; }
      if (Date.now() - started > JOB_TIME_LIMIT_MS) { timedOut = true; break; }
      counts.rows += 1;
      let built;
      try {
        built = buildArchiveItem(post, { usedSlugs });
      } catch {
        counts.failed += 1;
        continue;
      }
      if (built.skip) {
        if (built.failed) counts.failed += 1; else counts.skipped += 1;
        continue;
      }
      const data = { ...built.item, jobId, sourceChecksum: job.sourceChecksum };
      batch.push(data);
      if (data.targetType === 'needs_review') counts.review += 1;
      else counts[data.targetType] += 1;
      if (batch.length >= BATCH_SIZE) await flush();
    }
  } catch (error) {
    fatalError = error;
  }

  text = null;

  try {
    if (cancelled || state.cancelled) {
      batch = [];
      await prisma.wordPressImportJob.update({
        where: { id: jobId },
        data: {
          status: 'cancelled',
          progress: 100,
          processedRows: counts.rows,
          totalSourceRecords: streamStats.rows,
          skippedCount: counts.skipped,
          failedCount: counts.failed,
          errorSummary: 'Pemrosesan dibatalkan oleh admin.',
          completedAt: new Date(),
        },
      });
      return;
    }
    if (timedOut) {
      batch = [];
      await prisma.wordPressImportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          progress: 100,
          processedRows: counts.rows,
          errorSummary: 'Pemrosesan melewati batas waktu 10 menit. Pecah dump menjadi bagian lebih kecil.',
          completedAt: new Date(),
        },
      });
      return;
    }
    if (fatalError) throw fatalError;

    await flush();
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: {
        status: counts.failed > 0 ? 'partially_completed' : 'completed',
        progress: 100,
        totalSourceRecords: streamStats.rows,
        processedRows: counts.rows,
        candidateCount: counts.berita + counts.pengumuman + counts.prestasi,
        beritaCount: counts.berita,
        pengumumanCount: counts.pengumuman,
        prestasiCount: counts.prestasi,
        reviewCount: counts.review,
        skippedCount: counts.skipped,
        failedCount: counts.failed,
        errorSummary: streamStats.skippedTuples > 0
          ? `${streamStats.skippedTuples} tuple dilewati karena jumlah kolom tidak cocok.`
          : null,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    await prisma.wordPressImportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        progress: 100,
        errorSummary: String(error?.message ?? 'Pemrosesan gagal.').slice(0, 2000),
        completedAt: new Date(),
      },
    }).catch(() => {});
  } finally {
    await cleanupExpiredFiles().catch(() => {});
  }
}

// Job yang tertinggal di status processing/uploaded karena restart server
// ditandai gagal agar admin dapat mengunggah ulang (checksum tetap tercatat).
export async function recoverStaleJobs() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await prisma.wordPressImportJob.findMany({
    where: { status: { in: ['uploaded', 'processing'] }, updatedAt: { lt: cutoff } },
    select: { id: true },
  });
  for (const job of stale) {
    if (activeJobs.has(job.id) || queue.includes(job.id)) continue;
    await prisma.wordPressImportJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorSummary: 'Pemrosesan terhenti (server restart atau batas waktu). Unggah ulang file bila diperlukan.',
        completedAt: new Date(),
      },
    }).catch(() => {});
    await removeJobFile(job.id).catch(() => {});
  }
  return stale.length;
}

// Membersihkan sisa file sementara saat proses start.
cleanupExpiredFiles().catch(() => {});

export { CONTENT_TABLE, TEMP_DIR };