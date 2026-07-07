import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const teams = await this.prisma.team.findMany({
      where: { organizationId },
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
                  board: { organizationId },
                },
              })
            : 0;

        const leadUser =
          team.members.find((m) => m.user.role.name === RoleName.MANAGER)?.user ??
          team.members.find((m) => m.user.role.name === RoleName.ADMIN)?.user ??
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

  async create(organizationId: string, dto: CreateTeamDto) {
    const departmentId = await this.resolveDepartmentId(organizationId, dto.departmentId);
    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        organizationId,
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

  async update(organizationId: string, id: string, dto: Partial<CreateTeamDto>) {
    await this.ensureTeam(organizationId, id);
    const departmentId =
      dto.departmentId !== undefined
        ? await this.resolveDepartmentId(organizationId, dto.departmentId || null)
        : undefined;
    await this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
    });
    const rows = await this.findAll(organizationId);
    return rows.find((t) => t.id === id);
  }

  async remove(organizationId: string, id: string) {
    await this.ensureTeam(organizationId, id);
    await this.prisma.team.delete({ where: { id } });
    return { deleted: true };
  }

  async addMember(organizationId: string, teamId: string, userId: string) {
    await this.ensureTeam(organizationId, teamId);
    const member = await this.prisma.user.findFirst({
      where: { id: userId, organizationId },
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

  async removeMember(organizationId: string, teamId: string, userId: string) {
    await this.ensureTeam(organizationId, teamId);
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
  }
}
