import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  assertCanAccessTeam,
  assertCanCreateTeam,
  assertCanDeleteTeam,
  isTeamScopedRole,
  resolveAccessScope,
  teamListWhere,
} from '../../core/security/access-scope';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  private scope(user: RequestUser) {
    return resolveAccessScope(this.prisma, user.userId, user.organizationId, user.role);
  }

  async findAll(user: RequestUser) {
    const scope = await this.scope(user);
    const teams = await this.prisma.team.findMany({
      where: teamListWhere(scope),
      orderBy: { name: 'asc' },
      include: {
        department: { select: { id: true, name: true } },
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    return Promise.all(
      teams.map(async (team) => {
        const memberIds = team.members.map((m) => m.user.id);
        const activeTasks =
          memberIds.length > 0
            ? await this.prisma.task.count({
                where: {
                  status: { not: TaskStatus.COMPLETED },
                  assigneeId: { in: memberIds },
                  board: { organizationId: user.organizationId },
                },
              })
            : 0;

        const leadUser =
          team.members.find((m) => m.user.role.name === 'TEAM_LEAD')?.user ??
          team.members.find((m) => m.user.role.name === 'SUPERVISOR')?.user ??
          team.members.find((m) => m.user.role.name === 'DEPT_HEAD')?.user ??
          team.members.find((m) => m.user.role.name === 'ADMIN')?.user ??
          team.members[0]?.user ??
          null;

        return {
          id: team.id,
          name: team.name,
          department: team.department,
          memberCount: team.members.length,
          activeTasks,
          lead: leadUser
            ? {
                id: leadUser.id,
                firstName: leadUser.firstName,
                lastName: leadUser.lastName,
                email: leadUser.email,
              }
            : null,
          members: team.members.map((m) => ({
            id: m.id,
            user: {
              id: m.user.id,
              email: m.user.email,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              role: m.user.role.name,
            },
          })),
        };
      }),
    );
  }

  async create(user: RequestUser, dto: CreateTeamDto) {
    const scope = await this.scope(user);
    const departmentId = await this.resolveDepartmentId(user.organizationId, dto.departmentId);
    assertCanCreateTeam(scope, departmentId);
    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        organizationId: user.organizationId,
        departmentId,
      },
      include: {
        department: { select: { id: true, name: true } },
        members: true,
      },
    });
    return {
      id: team.id,
      name: team.name,
      department: team.department,
      memberCount: 0,
      activeTasks: 0,
      lead: null,
      members: [],
    };
  }

  async update(user: RequestUser, id: string, dto: Partial<CreateTeamDto>) {
    const scope = await this.scope(user);
    const team = await this.ensureTeam(user.organizationId, id);
    assertCanAccessTeam(scope, team);

    // Solo ADMIN / DEPT_HEAD pueden cambiar el departamento del equipo.
    if (dto.departmentId !== undefined && isTeamScopedRole(scope.role)) {
      throw new ConflictException('Un rol acotado por equipos no puede reasignar el departamento');
    }

    const departmentId =
      dto.departmentId !== undefined
        ? await this.resolveDepartmentId(user.organizationId, dto.departmentId || null)
        : undefined;

    if (departmentId !== undefined && scope.role === 'DEPT_HEAD' && departmentId !== scope.departmentId) {
      throw new ConflictException('Solo puedes asignar equipos a tu departamento');
    }

    await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
    });
    const rows = await this.findAll(user);
    return rows.find((t) => t.id === id);
  }

  async remove(user: RequestUser, id: string) {
    const scope = await this.scope(user);
    const team = await this.ensureTeam(user.organizationId, id);
    assertCanDeleteTeam(scope, team);
    await this.prisma.team.delete({ where: { id } });
    return { deleted: true };
  }

  async addMember(user: RequestUser, teamId: string, userId: string) {
    const scope = await this.scope(user);
    const team = await this.ensureTeam(user.organizationId, teamId);
    assertCanAccessTeam(scope, team);
    const member = await this.prisma.user.findFirst({
      where: { id: userId, organizationId: user.organizationId },
    });
    if (!member) {
      throw new NotFoundException('Usuario no encontrado en la organización');
    }
    try {
      return this.prisma.teamMember.create({
        data: { teamId, userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: { select: { name: true } },
            },
          },
        },
      });
    } catch {
      throw new ConflictException('El usuario ya pertenece a este equipo');
    }
  }

  async removeMember(user: RequestUser, teamId: string, userId: string) {
    const scope = await this.scope(user);
    const team = await this.ensureTeam(user.organizationId, teamId);
    assertCanAccessTeam(scope, team);
    await this.prisma.teamMember.deleteMany({ where: { teamId, userId } });
    return { deleted: true };
  }

  private async resolveDepartmentId(
    organizationId: string,
    departmentId?: string | null,
  ): Promise<string | null> {
    if (!departmentId) {
      return null;
    }
    const d = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!d) {
      throw new NotFoundException('Departamento no encontrado');
    }
    return d.id;
  }

  private async ensureTeam(organizationId: string, id: string) {
    const t = await this.prisma.team.findFirst({ where: { id, organizationId } });
    if (!t) {
      throw new NotFoundException();
    }
    return t;
  }
}
