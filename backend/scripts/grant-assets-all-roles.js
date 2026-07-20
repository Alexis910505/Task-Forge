/**
 * Garantiza assets:read y assets:write en TODOS los roles de todas las organizaciones.
 * Uso: node scripts/grant-assets-all-roles.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const REQUIRED = ['assets:read', 'assets:write'];

async function main() {
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, organizationId: true, permissions: true },
  });
  let fixed = 0;
  for (const role of roles) {
    const next = [...role.permissions];
    let changed = false;
    for (const p of REQUIRED) {
      if (!next.includes(p)) {
        next.push(p);
        changed = true;
      }
    }
    if (!changed) {
      console.log(`OK    ${role.name} (${role.organizationId})`);
      continue;
    }
    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: next },
    });
    fixed += 1;
    console.log(`FIXED ${role.name} (${role.organizationId}) += ${REQUIRED.join(', ')}`);
  }
  console.log(`Roles revisados: ${roles.length}, actualizados: ${fixed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
