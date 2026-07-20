import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  assertCanCreateDepartment,
  assertCanManageDepartment,
  departmentListWhere,
  resolveAccessScope,
} from '../../core/security/access-scope';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
import { CreateDepartmentDto } from './dto/create-department.dto';

export type DepartmentStatus = 'ACTIVE' | 'REVIEW';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: RequestUser) {
    return resolveAccessScope(this.prisma, user.userId, user.organizationId, user.role);
  }

  async findAll(user: RequestUser) {
    const scope = await this.scope(user);
    const organizationId = user.organizationId;
    const now = new Date();

    const [departments, stats, teamMembers] = await Promise.all([
      this.prisma.department.findMany({
        where: departmentListWhere(scope),
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { teams: true, users: true } },
          users: {
            where: { isActive: true },
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.$queryRaw<
        {
          departmentId: string;
          activeTasks: bigint;
          overdueOpen: bigint;
        }[]
      >`
        WITH task_dept AS (
          SELECT t.id AS task_id, t.status, t."dueDate", p."departmentId" AS department_id
          FROM "Task" t
          INNER JOIN "Board" b ON b.id = t."boardId"
          INNER JOIN "Project" p ON p.id = b."projectId"
          WHERE b."organizationId" = ${organizationId}
            AND p."departmentId" IS NOT NULL
          UNION
          SELECT t.id, t.status, t."dueDate", u."departmentId"
          FROM "Task" t
          INNER JOIN "Board" b ON b.id = t."boardId"
          INNER JOIN "User" u ON u.id = t."assigneeId"
          WHERE b."organizationId" = ${organizationId}
            AND u."departmentId" IS NOT NULL
        )
        SELECT
          department_id AS "departmentId",
          COUNT(*) FILTER (WHERE status <> 'COMPLETED'::"TaskStatus")::bigint AS "activeTasks",
          COUNT(*) FILTER (
            WHERE status <> 'COMPLETED'::"TaskStatus"
              AND "dueDate" IS NOT NULL
              AND "dueDate" < ${now}
          )::bigint AS "overdueOpen"
        FROM task_dept
        GROUP BY department_id
      `,
      this.prisma.teamMember.findMany({
        where: {
          team: { organizationId, departmentId: { not: null } },
          user: { isActive: true },
        },
        select: {
          userId: true,
          team: { select: { departmentId: true } },
        },
      }),
    ]);

    const teamMemberIdsByDept = new Map<string, Set<string>>();
    for (const tm of teamMembers) {
      const deptId = tm.team.departmentId;
      if (!deptId) continue;
      let set = teamMemberIdsByDept.get(deptId);
      if (!set) {
        set = new Set<string>();
        teamMemberIdsByDept.set(deptId, set);
      }
      set.add(tm.userId);
    }

    const statsByDept = new Map(
      stats.map((row) => [
        row.departmentId,
        {
          activeTasks: Number(row.activeTasks),
          overdueOpen: Number(row.overdueOpen),
        },
      ]),
    );

    return departments.map((dept) => {
      const counts = statsByDept.get(dept.id) ?? { activeTasks: 0, overdueOpen: 0 };
      const { activeTasks, overdueOpen } = counts;
      const memberIds = new Set(dept.users.map((u) => u.id));
      for (const id of teamMemberIdsByDept.get(dept.id) ?? []) {
        memberIds.add(id);
      }
      const memberCount = memberIds.size;
      const tasksPerMember = memberCount > 0 ? activeTasks / memberCount : activeTasks;

      let status: DepartmentStatus = 'ACTIVE';
      if ((memberCount === 0 && activeTasks > 0) || tasksPerMember >= 2 || overdueOpen >= 3) {
        status = 'REVIEW';
      }

      const manager =
        dept.users.find((u) => u.role.name === 'DEPT_HEAD') ??
        dept.users.find((u) => u.role.name === 'ADMIN') ??
        dept.users[0] ??
        null;

      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        memberCount,
        teamCount: dept._count.teams,
        activeTasks,
        status,
        manager: manager
          ? {
              id: manager.id,
              firstName: manager.firstName,
              lastName: manager.lastName,
              email: manager.email,
            }
          : null,
      };
    });
  }

  async create(user: RequestUser, dto: CreateDepartmentDto) {
    const scope = await this.scope(user);
    assertCanCreateDepartment(scope);
    const name = dto.name.trim();
    const description = dto.description?.trim() || null;
    return this.prisma.department.create({
      data: { name, description, organizationId: user.organizationId },
    });
  }

  async update(user: RequestUser, id: string, dto: Partial<CreateDepartmentDto>) {
    const scope = await this.scope(user);
    await this.ensure(user.organizationId, id);
    assertCanManageDepartment(scope, id);
    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }
    if (dto.description !== undefined) {
      data.description = dto.description.trim() || null;
    }
    return this.prisma.department.update({ where: { id }, data });
  }

  async remove(user: RequestUser, id: string) {
    const scope = await this.scope(user);
    if (scope.role !== 'ADMIN' && !scope.unrestricted) {
      throw new ForbiddenException('Solo un administrador puede eliminar departamentos');
    }
    await this.ensure(user.organizationId, id);
    await this.prisma.department.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensure(organizationId: string, id: string) {
    const d = await this.prisma.department.findFirst({ where: { id, organizationId } });
    if (!d) {
      throw new NotFoundException();
    }
  }
}
