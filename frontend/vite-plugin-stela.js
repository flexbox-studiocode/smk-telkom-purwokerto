import { loadEnv } from 'vite';
import {
  BATAS,
  kunciBermasalah,
  periksaPesan,
  pilihPenyedia,
  deteksiBahasa,
  topikDiizinkan,
  buatPesanPenolakan,
  POLA_KUNCI,
  tanyaAI,
} from '../supabase/functions/stela/inti.mjs';
import { buatPenjaga } from '../supabase/functions/stela/penjaga-biaya.mjs';
import { hitungHasilNextTel } from '../supabase/functions/nexttel/scoring.mjs';
import { jelaskanHasilNextTel } from '../supabase/functions/nexttel/inti.mjs';

// Plugin pengembangan lokal (opsional). Frontend produksi memanggil backend
// /api/ai/stela dan /api/ai/nexttel -- lihat src/services/stela.js dan
// src/services/nexttel.js. Endpoint /api/stela dan /api/nexttel di bawah ini
// hanya berguna untuk bereksperimen dengan prompt/model tanpa menjalankan
// backend, dan membaca kunci API dari proses Node dev server (bukan bundel
// browser). Tidak ada koneksi Supabase saat runtime.
//
// Kuncinya: berkas ini hanya berjalan di proses Node milik dev server, tidak
// pernah ikut ke bundel browser. Kunci API dibaca di sini dan tidak pernah
// menyeberang ke sisi klien. Karena itu kuncinya TIDAK boleh diberi awalan
// VITE_ -- awalan itu justru membuat Vite menyuntikkannya ke browser.

// Plafon harian mode lokal sengaja jauh lebih ketat daripada produksi. Sumber
// pemborosan terbesar saat mengembangkan bukan pengunjung, melainkan loop tak
// sengaja -- useEffect keliru, tombol yang tertekan berulang, hot-reload yang
// memicu ulang permintaan.
const MAKS_PER_HARI_DEV = 100;
export const stelaDevPlugin = () => ({
  name: 'stela-dev',
  apply: 'serve',

  configureServer(server) {
    const env = loadEnv(server.config.mode, server.config.envDir ?? process.cwd(), '');
    const baca = (nama) => env[nama] ?? process.env[nama];

    const kunci = {
      ninerouter: baca('NINEROUTER_KEY'),
      anthropic: baca('ANTHROPIC_API_KEY'),
      gemini: baca('GEMINI_API_KEY'),
      groq: baca('GROQ_API_KEY'),
    };
    const argKunci = {
      ninerouterKey: kunci.ninerouter,
      anthropicKey: kunci.anthropic,
      geminiKey: kunci.gemini,
      groqKey: kunci.groq,
    };
        const nexttelProvider = pilihPenyedia(argKunci);
    const stelaGeminiModel = 'gemini-3.6-flash';
    const geminiAvailable = typeof kunci.gemini === 'string' && kunci.gemini.trim().length > 0;
    const stelaGeminiCandidates = geminiAvailable ? [
      { penyedia: 'gemini', apiKey: kunci.gemini, model: stelaGeminiModel },
      { penyedia: 'gemini', apiKey: kunci.gemini, model: 'gemini-3.5-flash-lite' },
    ] : [];
    const penyedia = nexttelProvider;
    for (const rusak of kunciBermasalah(argKunci)) {
      server.config.logger.warn(
        `  [33m➜[0m  Kunci ${rusak.toUpperCase()} diabaikan: bentuknya tidak sesuai. Kosongkan atau ganti baris itu di frontend/.env.`,
      );
    }
    // Dibiarkan undefined kalau tidak disetel, supaya tanyaAI memakai daftar
    // cadangannya dan bisa berpindah model saat kuota satu model habis.
    // Mengisinya dengan MODEL_BAWAAN akan mematikan failover, karena model
    // yang dipilih manual sengaja dihormati apa adanya.
    const model = penyedia === 'ninerouter'
      ? baca('NINEROUTER_MODEL')
      : penyedia === 'anthropic'
        ? baca('STELA_ANTHROPIC_MODEL')
        : penyedia === 'gemini'
          ? baca('STELA_GEMINI_MODEL')
          : baca('STELA_GROQ_MODEL');
    const penjaga = buatPenjaga({
      aktif: baca('STELA_AKTIF') !== 'false',
      maksPerHari: Number(baca('STELA_MAKS_PER_HARI')) || MAKS_PER_HARI_DEV,
    });

    server.config.logger.info(
      stelaGeminiCandidates.length
        ? `  \x1b[32m➜\x1b[0m  STELA lokal siap di /api/stela (gemini, ${stelaGeminiModel}, maks ${penjaga.statistik().maksPerHari}/hari)`
        : '  \x1b[33m➜\x1b[0m  STELA nonaktif: isi GEMINI_API_KEY di frontend/.env',
    );

    server.middlewares.use('/api/stela', async (req, res) => {
      const kirim = (data, status) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };

      if (req.method !== 'POST') return kirim({ error: 'Gunakan metode POST.' }, 405);
      if (!stelaGeminiCandidates.length) {
        return kirim(
          {
            error:
              'Kunci Gemini belum diisi. Isi GEMINI_API_KEY di frontend/.env, lalu jalankan ulang dev server.',
          },
          503,
        );
      }

      const ditolak = penjaga.periksa('lokal');
      if (ditolak) return kirim({ error: ditolak.galat }, ditolak.status);

      let mentah = '';
      try {
        for await (const bagian of req) {
          mentah += bagian;
          // Tolak badan raksasa sebelum sempat menumpuk di memori.
          if (mentah.length > BATAS.MAKS_TOTAL_PANJANG * 4) {
            return kirim({ error: 'Isi permintaan terlalu besar.' }, 413);
          }
        }
      } catch {
        return kirim({ error: 'Gagal membaca permintaan.' }, 400);
      }

      let badan;
      try {
        badan = JSON.parse(mentah);
      } catch {
        return kirim({ error: 'Isi permintaan tidak valid.' }, 400);
      }

      const { pesan, galat } = periksaPesan(badan?.messages);
      if (!pesan) return kirim({ error: galat }, 400);
      if (badan.language !== undefined && !['id', 'en'].includes(badan.language)) return kirim({ error: 'Unsupported language.' }, 400);

      const latestUserMessage = [...pesan].reverse().find((message) => message.role === 'user');
      const bahasa = badan.language ?? deteksiBahasa(latestUserMessage?.content ?? '');

      // Server-side scope enforcement: tolak pertanyaan di luar scope sebelum pemanggilan provider AI
      if (!topikDiizinkan(pesan)) {
        return kirim({ reply: buatPesanPenolakan(bahasa), scope_rejected: true }, 200);
      }

      const tersimpan = penjaga.ambilCache(pesan, bahasa);
      if (tersimpan) {
        server.config.logger.info('  [stela] dijawab dari cache, tanpa panggilan API');
        return kirim({ reply: tersimpan }, 200);
      }

      try {
        const { teks, tokenMasuk, tokenKeluar, modelDipakai } = await tanyaAI({
          sebelumPanggilan: () => penjaga.catatPanggilan(),
          cobaModelCadangan: false,
          daftarPenyedia: stelaGeminiCandidates,
          pesan,
          bahasa,
          contextPublik:
            'Data dinamis publik tidak tersedia di mode pengembangan lokal. Gunakan data sekolah statis.',
        });
        if (!teks) return kirim({ error: 'STELA tidak memberi jawaban.' }, 502);

        penjaga.simpanCache(pesan, teks, bahasa);
        const { terpakaiHariIni, maksPerHari } = penjaga.statistik();
        server.config.logger.info(
          `  [stela] ${terpakaiHariIni}/${maksPerHari} hari ini | model ${modelDipakai} | token masuk ${tokenMasuk}, keluar ${tokenKeluar}`,
        );
        return kirim({ reply: teks }, 200);
      } catch (error) {
        server.config.logger.error(`  [stela] ${error?.message ?? 'kesalahan tidak dikenal'}`);
        // Hanya pesan yang memang ditulis untuk pengunjung yang diteruskan.
        // Sebelumnya semua galat 429 diteruskan mentah, sehingga pengunjung
        // sempat melihat "Gemini menolak dengan status 429" di gelembung chat.
        if (error?.untukPengguna) return kirim({ error: error.message }, error.status ?? 429);
        return kirim({ error: 'STELA sedang mengalami kendala.' }, error?.status ? 502 : 500);
      }
    });

    // Endpoint lokal NextTel memakai penilaian yang sama dengan Edge Function.
    server.middlewares.use('/api/nexttel', async (req, res) => {
      const kirim = (data, status) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
      };

      if (req.method !== 'POST') return kirim({ error: 'Gunakan metode POST.' }, 405);

      const ditolak = penjaga.periksa('lokal-nexttel');
      if (ditolak) return kirim({ error: ditolak.galat }, ditolak.status);

      let mentah = '';
      try {
        for await (const bagian of req) {
          mentah += bagian;
          if (mentah.length > 6000) return kirim({ error: 'Isi permintaan terlalu besar.' }, 413);
        }
      } catch {
        return kirim({ error: 'Gagal membaca permintaan.' }, 400);
      }

      try {
        const badan = JSON.parse(mentah);
        if (!badan || typeof badan !== 'object') return kirim({ error: 'Body tidak valid.' }, 400);
        if (badan.language !== undefined && !['id', 'en'].includes(badan.language)) return kirim({ error: 'Unsupported language.' }, 400);
        const language = badan.language ?? 'id';
        const result = hitungHasilNextTel(badan?.answers);
        if (!result) return kirim({ error: 'Jawaban NextTel tidak valid.' }, 400);
        const daftarPenyedia = [penyedia, ...Object.keys(kunci).filter(p => p !== penyedia)]
          .filter(p => p && POLA_KUNCI[p]?.test(kunci[p] ?? ''))
          .map(p => ({ penyedia: p, apiKey: kunci[p], model: p === penyedia ? model : undefined, baseUrl: p === 'ninerouter' ? baca('NINEROUTER_URL') : undefined }));
        const output = await jelaskanHasilNextTel({ hasil: result, language, daftarPenyedia,
          sebelumPanggilan: () => penjaga.catatPanggilan() });
        return kirim(output, 200);
      } catch (error) {
        server.config.logger.error(`  [nexttel] ${error?.message ?? 'kesalahan tidak dikenal'}`);
        if (error instanceof SyntaxError) return kirim({ error: 'Format JSON tidak valid.' }, 400);
        if (error?.untukPengguna) return kirim({ error: error.message }, error.status ?? 429);
        return kirim({ error: 'NextTel sedang mengalami kendala.' }, 500);
      }
    });

  },
});

export default stelaDevPlugin;
