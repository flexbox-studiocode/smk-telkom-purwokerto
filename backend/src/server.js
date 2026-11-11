import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './db.js';
import { hapusSesiNexaKedaluwarsa } from './routes/ai.js';

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
