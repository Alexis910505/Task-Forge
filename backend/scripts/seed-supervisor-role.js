/**
 * Siembra el rol de sistema SUPERVISOR en todas las organizaciones que aún no lo tengan.
 * Uso: node scripts/seed-supervisor-role.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const SUPERVISOR_PERMISSIONS = [
  'users:read',
  'users:write',
  'departments:read',
  'teams:read',
  'teams:write',
  'projects:read',
  'boards:read',
  'boards:write',
  'tasks:read',
  'tasks:write',
  'tasks:assign',
  'comments:write',
  'attachments:write',
  'notifications:read',
  'dashboard:read',
  'reports:read',
  'activity:read',
  'assets:read',
  'assets:write',
  'organizations:read',
];

async function main() {
  const orgs = await prisma.organization.findMany({ select: { id: true, slug: true } });
  let created = 0;
  for (const org of orgs) {
    const existing = await prisma.role.findFirst({
      where: { organizationId: org.id, name: 'SUPERVISOR' },
      select: { id: true },
    });
    if (existing) {
      console.log(`OK    ${org.slug}: SUPERVISOR ya existe`);
      continue;
    }
    await prisma.role.create({
      data: {
        organizationId: org.id,
        name: 'SUPERVISOR',
        isSystem: true,
        permissions: SUPERVISOR_PERMISSIONS,
      },
    });
    created += 1;
    console.log(`FIXED ${org.slug}: SUPERVISOR creado`);
  }
  console.log(`Organizaciones: ${orgs.length}, roles creados: ${created}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
