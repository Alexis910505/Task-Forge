import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';

@Injectable()
export class BoardsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateBoardDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    const existing = await this.prisma.board.count({
      where: { projectId: dto.projectId, organizationId },
    });
    if (existing > 0) {
      throw new ConflictException('Cada proyecto solo puede tener un tablero');
    }
    return this.prisma.board.create({
      data: {
        name: dto.name,
        projectId: dto.projectId,
        organizationId,
      },
      include: { project: true },
    });
  }

  async findOneWithTasks(organizationId: string, id: string) {
    const board = await this.prisma.board.findFirst({
      where: { id, organizationId },
      include: {
        project: true,
        tasks: {
          orderBy: [{ status: 'asc' }, { sortOrder: 'asc' }],
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
            createdBy: { select: { id: true, firstName: true, lastName: true } },
            taskAssets: {
              include: {
                asset: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    category: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!board) {
      throw new NotFoundException();
    }
    const columns = Object.values(TaskStatus).map((status) => ({
      status,
      tasks: board.tasks.filter((t) => t.status === status),
    }));
    return { ...board, columns };
  }
}
