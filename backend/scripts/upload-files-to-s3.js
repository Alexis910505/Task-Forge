/**
 * Copia `uploads/{attachments,branding}` al bucket S3 y verifica tamaño por objeto.
 * Variables: S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 * Uso: node scripts/upload-files-to-s3.js [carpeta]
 */
const { readdirSync, readFileSync, existsSync } = require('fs');
const { join, extname } = require('path');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

async function main() {
  for (const k of ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) {
    if (!process.env[k]) throw new Error(`Falta ${k}`);
  }
  const root = process.argv[2] ?? join(__dirname, '..', 'uploads');
  const Bucket = process.env.S3_BUCKET;
  const s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });

  let count = 0;
  for (const folder of ['attachments', 'branding']) {
    const dir = join(root, folder);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const Key = `${folder}/${name}`;
      const Body = readFileSync(join(dir, name));
      const ContentType = MIME[extname(name).toLowerCase()] ?? 'application/octet-stream';
      await s3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
      const head = await s3.send(new HeadObjectCommand({ Bucket, Key }));
      if (head.ContentLength !== Body.length) throw new Error(`Tamaño distinto en ${Key}`);
      count += 1;
    }
  }
  console.log(`${count} archivos subidos y verificados`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
