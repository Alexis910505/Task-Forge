/**
 * Cambia la contraseña de un usuario y cierra todas sus sesiones.
 * Variables: DATABASE_URL, USER_EMAIL, NEW_PASSWORD (mín. 12), ORG_SLUG (por defecto `default`).
 * Uso: node scripts/set-user-password.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

async function main() {
  const email = process.env.USER_EMAIL?.toLowerCase().trim();
  const password = process.env.NEW_PASSWORD ?? '';
  const slug = process.env.ORG_SLUG ?? 'default';
  if (!email) throw new Error('Falta USER_EMAIL');
  if (password.length < 12) throw new Error('NEW_PASSWORD debe tener al menos 12 caracteres');

  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirstOrThrow({ where: { email, organization: { slug } } });
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(password, 10) },
      }),
      prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    console.log(`Contraseña actualizada: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
