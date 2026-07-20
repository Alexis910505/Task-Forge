import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type AccessScope = {
  userId: string;
  organizationId: string;
  role: string;
  /** Sin filtro: ADMIN (u otros roles no acotados). */
  unrestricted: boolean;
  departmentId: string | null;
  teamIds: string[];
};

/** Roles con alcance limitado a su departamento / equipos. */
export function isScopedLeadRole(role: string): boolean {
  return role === 'DEPT_HEAD' || role === 'SUPERVISOR' || role === 'TEAM_LEAD';
}

/** Roles acotados por lista de equipos (no por departamento completo). */
export function isTeamScopedRole(role: string): boolean {
  return role === 'SUPERVISOR' || role === 'TEAM_LEAD';
}

export async function resolveAccessScope(
  prisma: PrismaService,
  userId: string,
  organizationId: string,
  role: string,
): Promise<AccessScope> {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
    select: {
      departmentId: true,
      teamMembers: { select: { teamId: true } },
    },
  });

  const departmentId = user?.departmentId ?? null;
  const teamIds = user?.teamMembers.map((m) => m.teamId) ?? [];

  return {
    userId,
    organizationId,
    role,
    unrestricted: role === 'ADMIN' || !isScopedLeadRole(role),
    departmentId,
    teamIds,
  };
}

export function assertCanAccessDepartment(scope: AccessScope, departmentId: string) {
  if (scope.unrestricted) return;
  if (scope.role === 'DEPT_HEAD' && scope.departmentId === departmentId) return;
  throw new ForbiddenException('No tienes acceso a este departamento');
}

export function assertCanCreateDepartment(scope: AccessScope) {
  if (scope.unrestricted) return;
  throw new ForbiddenException('Solo un administrador puede crear departamentos');
}

export function assertCanManageDepartment(scope: AccessScope, departmentId: string) {
  if (scope.unrestricted) return;
  if (scope.role === 'DEPT_HEAD' && scope.departmentId === departmentId) return;
  throw new ForbiddenException('Solo el jefe de ese departamento puede gestionarlo');
}

export function assertCanAccessTeam(
  scope: AccessScope,
  team: { id: string; departmentId: string | null },
) {
  if (scope.unrestricted) return;
  if (scope.role === 'DEPT_HEAD' && team.departmentId && team.departmentId === scope.departmentId) {
    return;
  }
  if (isTeamScopedRole(scope.role) && scope.teamIds.includes(team.id)) return;
  throw new ForbiddenException('No tienes acceso a este equipo');
}

/** TEAM_LEAD no crea/elimina equipos; solo gestiona los suyos. DEPT_HEAD crea dentro de su depto. */
export function assertCanCreateTeam(scope: AccessScope, departmentId: string | null | undefined) {
  if (scope.unrestricted) return;
  if (scope.role === 'DEPT_HEAD' && departmentId && departmentId === scope.departmentId) return;
  throw new ForbiddenException(
    'Solo el jefe de departamento puede crear equipos en su departamento',
  );
}

export function assertCanDeleteTeam(
  scope: AccessScope,
  team: { id: string; departmentId: string | null },
) {
  if (scope.unrestricted) return;
  if (scope.role === 'DEPT_HEAD' && team.departmentId && team.departmentId === scope.departmentId) {
    return;
  }
  throw new ForbiddenException('No puedes eliminar este equipo');
}

export function departmentListWhere(scope: AccessScope): Prisma.DepartmentWhereInput {
  if (scope.unrestricted) return { organizationId: scope.organizationId };
  if (scope.role === 'DEPT_HEAD' && scope.departmentId) {
    return { organizationId: scope.organizationId, id: scope.departmentId };
  }
  // TEAM_LEAD / WORKER: pueden ver depts (read) de la org; escritura ya bloqueada por permisos.
  return { organizationId: scope.organizationId };
}

export function teamListWhere(scope: AccessScope): Prisma.TeamWhereInput {
  if (scope.unrestricted) return { organizationId: scope.organizationId };
  if (scope.role === 'DEPT_HEAD' && scope.departmentId) {
    return { organizationId: scope.organizationId, departmentId: scope.departmentId };
  }
  if (isTeamScopedRole(scope.role)) {
    return {
      organizationId: scope.organizationId,
      id: { in: scope.teamIds.length ? scope.teamIds : ['__none__'] },
    };
  }
  return { organizationId: scope.organizationId };
}

export function projectListWhere(scope: AccessScope): Prisma.ProjectWhereInput {
  if (scope.unrestricted) return { organizationId: scope.organizationId };
  if (scope.role === 'DEPT_HEAD' && scope.departmentId) {
    return { organizationId: scope.organizationId, departmentId: scope.departmentId };
  }
  if (isTeamScopedRole(scope.role) && scope.teamIds.length) {
    // Proyectos del mismo departamento que sus equipos.
    return {
      organizationId: scope.organizationId,
      OR: [
        { department: { teams: { some: { id: { in: scope.teamIds } } } } },
        { departmentId: null },
      ],
    };
  }
  return { organizationId: scope.organizationId };
}

/**
 * Filtro de tareas para leads acotados.
 * DEPT_HEAD: por depto del proyecto o del assignee.
 * TEAM_LEAD: assignee en sus equipos, o sin assignee en tableros de su depto.
 */
export function taskScopeWhere(scope: AccessScope): Prisma.TaskWhereInput | undefined {
  if (scope.unrestricted) return undefined;

  if (scope.role === 'DEPT_HEAD' && scope.departmentId) {
    return {
      OR: [
        { board: { project: { departmentId: scope.departmentId } } },
        { assignee: { departmentId: scope.departmentId } },
        {
          assignee: {
            teamMembers: { some: { team: { departmentId: scope.departmentId } } },
          },
        },
        {
          AND: [
            { assigneeId: null },
            { board: { project: { departmentId: scope.departmentId } } },
          ],
        },
      ],
    };
  }

  if (isTeamScopedRole(scope.role)) {
    if (!scope.teamIds.length) {
      return { id: '__none__' };
    }
    return {
      OR: [
        { assignee: { teamMembers: { some: { teamId: { in: scope.teamIds } } } } },
        { assigneeId: scope.userId },
        {
          AND: [
            { assigneeId: null },
            {
              board: {
                project: { department: { teams: { some: { id: { in: scope.teamIds } } } } },
              },
            },
          ],
        },
      ],
    };
  }

  return undefined;
}

export async function assertCanAccessTask(
  prisma: PrismaService,
  scope: AccessScope,
  taskId: string,
) {
  if (scope.unrestricted) return;
  const extra = taskScopeWhere(scope);
  const found = await prisma.task.findFirst({
    where: {
      id: taskId,
      board: { organizationId: scope.organizationId },
      ...(extra ?? {}),
    },
    select: { id: true },
  });
  if (!found) {
    throw new ForbiddenException('No tienes acceso a esta tarea');
  }
}
