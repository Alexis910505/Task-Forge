import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string) {
    return this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: true,
        boards: { select: { id: true, name: true } },
      },
    });
  }

  async create(organizationId: string, dto: CreateProjectDto, ownerId: string) {
    if (dto.departmentId) {
      const d = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
      });
      if (!d) {
        throw new NotFoundException('Departamento no encontrado');
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          departmentId: dto.departmentId,
          organizationId,
          ownerId,
        },
      });
      const board = await tx.board.create({
        data: {
          name: dto.name,
          projectId: project.id,
          organizationId,
        },
      });
      return tx.project.findUniqueOrThrow({
        where: { id: project.id },
        include: {
          boards: { where: { id: board.id } },
          department: true,
          owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async update(organizationId: string, id: string, dto: UpdateProjectDto) {
    await this.ensureExists(organizationId, id);
    if (dto.departmentId) {
      const d = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId },
      });
      if (!d) {
        throw new NotFoundException('Departamento no encontrado');
      }
    }
    const { name, description, departmentId } = dto;
    await this.prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
      },
    });
    if (name) {
      const board = await this.prisma.board.findFirst({ where: { projectId: id, organizationId } });
      if (board) {
        await this.prisma.board.update({ where: { id: board.id }, data: { name } });
      }
    }
    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(organizationId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!p) {
      throw new NotFoundException();
    }
  }

  async findOne(organizationId: string, id: string) {
    const p = await this.prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        boards: { orderBy: { updatedAt: 'desc' } },
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: true,
      },
    });
    if (!p) {
      throw new NotFoundException();
    }
    return p;
  }
}
