import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './db.js';
import { hapusSesiNexaKedaluwarsa } from './routes/ai.js';
import { validateAiEncryptionKey } from './services/aiConfigCrypto.js';

// Validasi key enkripsi saat startup bila tersedia. Tidak mematikan proses
// supaya migrasi tetap aman; bila key tidak valid, penyimpanan API key dari
// dashboard akan ditolak dengan pesan yang jelas.
if (env.AI_CONFIG_ENCRYPTION_KEY) {
  try { validateAiEncryptionKey(); } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'ai_config_key_invalid', message: error.message }));
  }
} else {
  console.warn(JSON.stringify({ level: 'warn', event: 'ai_config_key_missing', message: 'AI_CONFIG_ENCRYPTION_KEY belum diset; penyimpanan API key AI melalui dashboard dinonaktifkan.' }));
}

const server = app.listen(env.PORT, () => {
  console.log(`Backend listening on http://localhost:${env.PORT}`);
});

// Identitas pra-chat NEXA hanya disimpan selama sesi; sapu baris kedaluwarsa tiap jam.
const sapuNexa = () => hapusSesiNexaKedaluwarsa().catch(() => console.error(JSON.stringify({ level: 'error', event: 'nexa_session_purge_failed' })));
sapuNexa();
setInterval(sapuNexa, 60 * 60 * 1000).unref();

async function shutdown(signal) {
  console.log(`${signal}: shutting down`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
