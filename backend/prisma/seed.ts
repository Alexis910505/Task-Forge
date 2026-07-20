import {
  PrismaClient,
  TaskStatus,
  TaskPriority,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  SYSTEM_ROLE_NAMES,
  SYSTEM_ROLE_PERMISSIONS,
} from '../src/core/security/role-permissions';

const prisma = new PrismaClient();

const DEFAULT_ORG_SLUG = 'default';
/** Si ya existe este proyecto, no duplicamos datos demo. */
const DEMO_PROJECT_NAME = 'TaskForge — Operaciones';

async function main() {
  const org = await prisma.organization.upsert({
    where: { slug: DEFAULT_ORG_SLUG },
    update: {},
    create: {
      name: 'TaskForge Demo',
      slug: DEFAULT_ORG_SLUG,
    },
  });

  for (const name of SYSTEM_ROLE_NAMES) {
    await prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: org.id,
          name,
        },
      },
      update: {
        isSystem: true,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[name]],
      },
      create: {
        organizationId: org.id,
        name,
        isSystem: true,
        permissions: [...SYSTEM_ROLE_PERMISSIONS[name]],
      },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: 'ADMIN',
      },
    },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const adminEmail = 'admin@taskforge.local';

  const admin = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: org.id,
        email: adminEmail,
      },
    },
    update: {
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
      isActive: true,
    },
    create: {
      organizationId: org.id,
      email: adminEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
    },
  });

  const existingDemo = await prisma.project.findFirst({
    where: { organizationId: org.id, name: DEMO_PROJECT_NAME },
  });
  if (existingDemo) {
    return;
  }

  const dept = await prisma.department.create({
    data: {
      organizationId: org.id,
      name: 'Operaciones',
      description: 'Departamento demo: proyectos, tableros y tareas.',
    },
  });

  await prisma.user.update({
    where: { id: admin.id },
    data: { departmentId: dept.id },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      name: DEMO_PROJECT_NAME,
      description: 'Proyecto de demostración enlazado al Kanban web.',
      departmentId: dept.id,
      ownerId: admin.id,
    },
  });

  const board = await prisma.board.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      name: 'Tablero principal',
    },
  });

  const team = await prisma.team.create({
    data: {
      organizationId: org.id,
      name: 'Equipo de campo',
      departmentId: dept.id,
    },
  });

  await prisma.teamMember.create({
    data: { teamId: team.id, userId: admin.id },
  });

  await prisma.assetCategoryOption.createMany({
    data: [
      { organizationId: org.id, code: 'VEHICLE', name: 'Vehículo', color: '#1565C0', icon: 'directions_car', sortOrder: 10 },
      { organizationId: org.id, code: 'TOOL', name: 'Herramienta', color: '#6D4C41', icon: 'handyman', sortOrder: 20 },
      { organizationId: org.id, code: 'EQUIPMENT', name: 'Equipo', color: '#6750A4', icon: 'inventory_2', isDefault: true, sortOrder: 30 },
      { organizationId: org.id, code: 'MACHINERY', name: 'Maquinaria', color: '#EF6C00', icon: 'precision_manufacturing', sortOrder: 40 },
      { organizationId: org.id, code: 'BUILDING', name: 'Edificio', color: '#455A64', icon: 'domain', sortOrder: 50 },
      { organizationId: org.id, code: 'ROOM', name: 'Sala', color: '#00838F', icon: 'meeting_room', sortOrder: 60 },
      { organizationId: org.id, code: 'ELECTRICAL', name: 'Eléctrico', color: '#F9A825', icon: 'electric_bolt', sortOrder: 70 },
      { organizationId: org.id, code: 'HVAC', name: 'Climatización', color: '#0277BD', icon: 'ac_unit', sortOrder: 80 },
      { organizationId: org.id, code: 'OTHER', name: 'Otro', color: '#616161', icon: 'category', sortOrder: 90 },
    ],
    skipDuplicates: true,
  });

  await prisma.assetStatusOption.createMany({
    data: [
      { organizationId: org.id, code: 'OPERATIONAL', name: 'Operativo', color: '#2E7D32', isDefault: true, sortOrder: 10 },
      { organizationId: org.id, code: 'MAINTENANCE', name: 'Mantenimiento', color: '#ED6C02', sortOrder: 20 },
      { organizationId: org.id, code: 'OFFLINE', name: 'Fuera de servicio', color: '#D32F2F', sortOrder: 30 },
      { organizationId: org.id, code: 'RESERVED', name: 'Reservado', color: '#6750A4', sortOrder: 40 },
      { organizationId: org.id, code: 'RETIRED', name: 'Retirado', color: '#616161', sortOrder: 50 },
    ],
    skipDuplicates: true,
  });

  await prisma.asset.create({
    data: {
      organizationId: org.id,
      name: 'Generador principal',
      code: 'GEN-001',
      category: 'EQUIPMENT',
      status: 'OPERATIONAL',
      location: 'Nave A',
    },
  });

  await prisma.notification.create({
    data: {
      userId: admin.id,
      type: NotificationType.SYSTEM,
      title: 'Bienvenido a TaskForge',
      body: 'Datos de demostración cargados. Usa el Kanban y el dashboard con datos reales.',
      read: false,
    },
  });

  const taskSpecs: Array<{
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    description?: string;
    sortOrder: number;
  }> = [
    {
      title: 'Revisión HVAC — Nave B',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      description: 'Inspección trimestral.',
      sortOrder: 0,
    },
    {
      title: 'Optimizar rutas flota A',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      sortOrder: 0,
    },
    {
      title: 'Actualizar firmware PLC — Sitio B',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.CRITICAL,
      description: 'Coordinar ventana de mantenimiento.',
      sortOrder: 0,
    },
    {
      title: 'Checklist seguridad Q4',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.LOW,
      sortOrder: 0,
    },
    {
      title: 'Sustituir cinta transportadora S2',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      sortOrder: 0,
    },
  ];

  const duePast = new Date();
  duePast.setDate(duePast.getDate() - 2);

  for (let i = 0; i < taskSpecs.length; i++) {
    const spec = taskSpecs[i];
    await prisma.task.create({
      data: {
        title: spec.title,
        description: spec.description,
        boardId: board.id,
        status: spec.status,
        priority: spec.priority,
        sortOrder: spec.sortOrder,
        createdById: admin.id,
        assigneeId: admin.id,
        location: i === 2 ? 'Sitio B' : undefined,
        dueDate: spec.status === TaskStatus.IN_PROGRESS ? duePast : undefined,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
