import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

export type DepartmentStatus = 'ACTIVE' | 'REVIEW';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId },
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
    });

    const now = new Date();

    return Promise.all(
      departments.map(async (dept) => {
        const deptFilter = {
          board: { organizationId },
          OR: [
            { board: { project: { departmentId: dept.id } } },
            { assignee: { departmentId: dept.id } },
          ],
        };

        const [activeTasks, overdueOpen] = await Promise.all([
          this.prisma.task.count({
            where: { ...deptFilter, status: { not: TaskStatus.COMPLETED } },
          }),
          this.prisma.task.count({
            where: {
              ...deptFilter,
              status: { not: TaskStatus.COMPLETED },
              dueDate: { lt: now },
            },
          }),
        ]);

        const memberCount = dept._count.users;
        const tasksPerMember = memberCount > 0 ? activeTasks / memberCount : activeTasks;

        let status: DepartmentStatus = 'ACTIVE';
        if ((memberCount === 0 && activeTasks > 0) || tasksPerMember >= 2 || overdueOpen >= 3) {
          status = 'REVIEW';
        }

        const managerUser =
          dept.users.find((u) => u.role.name === 'MANAGER') ??
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
          manager: managerUser
            ? {
                id: managerUser.id,
                firstName: managerUser.firstName,
                lastName: managerUser.lastName,
                email: managerUser.email,
              }
            : null,
        };
      }),
    );
  }

  create(organizationId: string, dto: CreateDepartmentDto) {
    const name = dto.name.trim();
    const description = dto.description?.trim() || null;
    return this.prisma.department.create({
      data: { name, description, organizationId },
    });
  }

  async update(organizationId: string, id: string, dto: Partial<CreateDepartmentDto>) {
    await this.ensure(organizationId, id);
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.ensure(organizationId, id);
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
