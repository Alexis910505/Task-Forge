import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        role: true,
        department: true,
      },
    });
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        role: true,
        department: true,
        teamMembers: { include: { team: true } },
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  /** Perfil sesión: sin equipos anidados (menos payload y menos riesgo de errores al serializar). */
  async findMe(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true, organizationId: true } },
        department: true,
      },
    });
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async getMyProfile(organizationId: string, userId: string) {
    const user = await this.findMe(organizationId, userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevMonthStart.setHours(0, 0, 0, 0);
    const prevMonthEnd = new Date(monthStart.getTime() - 1);

    const assigneeFilter = {
      assigneeId: userId,
      board: { organizationId },
    };

    const [
      tasksCompleted,
      completedMonth,
      completedPrevMonth,
      overdueOpen,
      openAssigned,
      avgRows,
      activeTasks,
      locationTask,
    ] = await Promise.all([
      this.prisma.task.count({
        where: { ...assigneeFilter, status: TaskStatus.COMPLETED },
      }),
      this.prisma.task.count({
        where: {
          ...assigneeFilter,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: monthStart },
        },
      }),
      this.prisma.task.count({
        where: {
          ...assigneeFilter,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: prevMonthStart, lte: prevMonthEnd },
        },
      }),
      this.prisma.task.count({
        where: {
          ...assigneeFilter,
          status: { not: TaskStatus.COMPLETED },
          dueDate: { lt: now },
        },
      }),
      this.prisma.task.count({
        where: {
          ...assigneeFilter,
          status: { not: TaskStatus.COMPLETED },
        },
      }),
      this.prisma.$queryRaw<{ avg: Prisma.Decimal | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 3600.0) AS avg
        FROM "Task" t
        INNER JOIN "Board" b ON b.id = t."boardId"
        WHERE b."organizationId" = ${organizationId}
          AND t."assigneeId" = ${userId}
          AND t.status = 'COMPLETED'::"TaskStatus"
      `,
      this.prisma.task.findMany({
        where: {
          ...assigneeFilter,
          status: { not: TaskStatus.COMPLETED },
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { updatedAt: 'desc' }],
        take: 20,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          board: { select: { name: true, project: { select: { name: true } } } },
        },
      }),
      this.prisma.task.findFirst({
        where: {
          ...assigneeFilter,
          location: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        select: { location: true },
      }),
    ]);

    const avgRaw = avgRows[0]?.avg;
    const avgResolutionHours =
      avgRaw != null && Number.isFinite(Number(avgRaw))
        ? Math.round(Number(avgRaw) * 10) / 10
        : null;

    const denom = completedMonth + overdueOpen;
    const efficiencyPercent = denom > 0 ? Math.round((completedMonth / denom) * 1000) / 10 : 100;

    let monthTrendPercent: number | null = null;
    if (completedPrevMonth > 0) {
      monthTrendPercent = Math.round(
        ((completedMonth - completedPrevMonth) / completedPrevMonth) * 100,
      );
    } else if (completedMonth > 0) {
      monthTrendPercent = 100;
    }

    return {
      user,
      location: locationTask?.location ?? null,
      stats: {
        tasksCompleted,
        tasksCompletedMonth: completedMonth,
        monthTrendPercent,
        efficiencyPercent,
        avgResolutionHours,
        resolutionStable:
          monthTrendPercent == null || Math.abs(monthTrendPercent) < 5,
        openAssignments: openAssigned,
      },
      activeTasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        projectName: t.board.project?.name ?? t.board.name,
      })),
    };
  }

  async updateMe(organizationId: string, userId: string, dto: UpdateProfileDto) {
    await this.ensureExists(organizationId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName } : {}),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: { select: { id: true, name: true, organizationId: true } },
        department: true,
      },
    });
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, organizationId },
    });
    if (!role) {
      throw new NotFoundException('Rol no válido para la organización');
    }
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
      });
      if (!dept) {
        throw new NotFoundException('Departamento no encontrado');
      }
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roleId: dto.roleId,
        departmentId: dto.departmentId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.ensureExists(organizationId, id);
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({
        where: { id: dto.roleId, organizationId },
      });
      if (!role) {
        throw new NotFoundException('Rol no válido');
      }
    }
    if (dto.departmentId) {
      const dept = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
      });
      if (!dept) {
        throw new NotFoundException('Departamento no encontrado');
      }
    }
    const { password, ...rest } = dto;
    const data: Prisma.UserUncheckedUpdateInput = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        role: true,
        department: true,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true };
  }

  listRoles(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, organizationId } });
    if (!u) {
      throw new NotFoundException();
    }
  }
}
