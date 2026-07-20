/**
 * Añade 'users:write' a los roles de sistema DEPT_HEAD, SUPERVISOR y TEAM_LEAD ya existentes en BD.
 * Uso: node scripts/grant-users-write-leads.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    where: { name: { in: ['DEPT_HEAD', 'SUPERVISOR', 'TEAM_LEAD'] } },
    select: { id: true, name: true, organizationId: true, permissions: true },
  });
  for (const role of roles) {
    if (role.permissions.includes('users:write')) {
      console.log(`OK    ${role.name} (${role.organizationId}) ya tiene users:write`);
      continue;
    }
    await prisma.role.update({
      where: { id: role.id },
      data: { permissions: [...role.permissions, 'users:write'] },
    });
    console.log(`FIXED ${role.name} (${role.organizationId}) += users:write`);
  }
  console.log(`Roles revisados: ${roles.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
