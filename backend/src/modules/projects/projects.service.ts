import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { projectListWhere, resolveAccessScope } from '../../core/security/access-scope';
import type { RequestUser } from '../../core/strategies/jwt.strategy';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: RequestUser) {
    const scope = await resolveAccessScope(
      this.prisma,
      user.userId,
      user.organizationId,
      user.role,
    );
    return this.prisma.project.findMany({
      where: projectListWhere(scope),
      orderBy: { updatedAt: 'desc' },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        department: true,
        boards: { select: { id: true, name: true } },
      },
    });
  }

  async create(user: RequestUser, dto: CreateProjectDto) {
    const scope = await resolveAccessScope(
      this.prisma,
      user.userId,
      user.organizationId,
      user.role,
    );
    if (scope.role === 'DEPT_HEAD') {
      if (!dto.departmentId || dto.departmentId !== scope.departmentId) {
        throw new ForbiddenException('Solo puedes crear proyectos en tu departamento');
      }
    }
    if (dto.departmentId) {
      const d = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: user.organizationId },
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
          organizationId: user.organizationId,
          ownerId: user.userId,
        },
      });
      const board = await tx.board.create({
        data: {
          name: dto.name,
          projectId: project.id,
          organizationId: user.organizationId,
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

  async update(user: RequestUser, id: string, dto: UpdateProjectDto) {
    const scope = await resolveAccessScope(
      this.prisma,
      user.userId,
      user.organizationId,
      user.role,
    );
    const project = await this.ensureExists(user.organizationId, id);
    if (!scope.unrestricted) {
      if (scope.role === 'DEPT_HEAD') {
        if (!project.departmentId || project.departmentId !== scope.departmentId) {
          throw new ForbiddenException('No puedes editar proyectos fuera de tu departamento');
        }
        if (dto.departmentId !== undefined && dto.departmentId !== scope.departmentId) {
          throw new ForbiddenException('No puedes mover el proyecto a otro departamento');
        }
      } else {
        throw new ForbiddenException('No tienes permiso para editar este proyecto');
      }
    }
    if (dto.departmentId) {
      const d = await this.prisma.department.findFirst({
        where: { id: dto.departmentId, organizationId: user.organizationId },
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
      const board = await this.prisma.board.findFirst({
        where: { projectId: id, organizationId: user.organizationId },
      });
      if (board) {
        await this.prisma.board.update({ where: { id: board.id }, data: { name } });
      }
    }
    return this.findOne(user.organizationId, id);
  }

  async remove(user: RequestUser, id: string) {
    const scope = await resolveAccessScope(
      this.prisma,
      user.userId,
      user.organizationId,
      user.role,
    );
    const project = await this.ensureExists(user.organizationId, id);
    if (!scope.unrestricted) {
      if (
        scope.role !== 'DEPT_HEAD' ||
        !project.departmentId ||
        project.departmentId !== scope.departmentId
      ) {
        throw new ForbiddenException('No puedes eliminar este proyecto');
      }
    }
    await this.prisma.project.delete({ where: { id } });
    return { deleted: true };
  }

  private async ensureExists(organizationId: string, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, organizationId } });
    if (!p) {
      throw new NotFoundException();
    }
    return p;
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
