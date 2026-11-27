/**
 * Arranque en producción: aplica las migraciones pendientes y luego inicia la API.
 * Las migraciones usan la conexión directa de Neon (quita `-pooler` del host),
 * porque el pooler no admite los bloqueos que usa `prisma migrate`.
 * Si una migración falla, la API no arranca y Render mantiene la versión anterior.
 */
const { spawnSync } = require('child_process');
const { join } = require('path');

const url = process.env.DATABASE_URL ?? '';
const directUrl = url.replace('-pooler.', '.');
const prisma = join(__dirname, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

const result = spawnSync(prisma, ['migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: directUrl },
  shell: process.platform === 'win32',
});
if (result.status !== 0) {
  console.error('prisma migrate deploy falló; la API no arranca');
  process.exit(result.status ?? 1);
}

require('../dist/main');
