import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  ALL_PERMISSIONS,
  sanitizePermissions,
  SYSTEM_ROLE_NAMES,
  SYSTEM_ROLE_PERMISSIONS,
  type PermissionKey,
} from '../../core/security/role-permissions';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/** Inventario: todos los roles pueden ver y gestionar activos. */
const INVENTORY_PERMISSIONS: PermissionKey[] = ['assets:read', 'assets:write'];

function withInventoryPermissions(permissions: PermissionKey[]): PermissionKey[] {
  const set = new Set(permissions);
  for (const p of INVENTORY_PERMISSIONS) {
    set.add(p);
  }
  return ALL_PERMISSIONS.filter((p) => set.has(p));
}

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  listPermissions() {
    return { permissions: ALL_PERMISSIONS };
  }

  findAll(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        permissions: true,
        isSystem: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true } },
      },
    });
  }

  async create(organizationId: string, dto: CreateRoleDto) {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('El nombre debe tener al menos 2 caracteres');
    }
    const reserved = SYSTEM_ROLE_NAMES.some((n) => n === name.toUpperCase());
    if (reserved && name.toUpperCase() === name) {
      throw new ConflictException('Ese nombre está reservado para un rol de sistema');
    }
    const permissions = withInventoryPermissions(sanitizePermissions(dto.permissions));
    try {
      return await this.prisma.role.create({
        data: {
          organizationId,
          name,
          permissions,
          isSystem: false,
        },
        select: {
          id: true,
          name: true,
          permissions: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { users: true } },
        },
      });
    } catch {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }
  }

  async update(organizationId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.ensure(organizationId, id);
    const data: { name?: string; permissions?: string[] } = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name.length < 2) {
        throw new BadRequestException('El nombre debe tener al menos 2 caracteres');
      }
      if (role.isSystem && name !== role.name) {
        throw new BadRequestException('No se puede renombrar un rol de sistema');
      }
      data.name = name;
    }

    if (dto.permissions !== undefined) {
      data.permissions = withInventoryPermissions(sanitizePermissions(dto.permissions));
    }

    try {
      return await this.prisma.role.update({
        where: { id },
        data,
        select: {
          id: true,
          name: true,
          permissions: true,
          isSystem: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { users: true } },
        },
      });
    } catch {
      throw new ConflictException('Ya existe un rol con ese nombre');
    }
  }

  async remove(organizationId: string, id: string) {
    const role = await this.ensure(organizationId, id);
    if (role.name === 'ADMIN') {
      throw new BadRequestException(
        'El rol de administrador no se puede eliminar: la organización quedaría sin administración',
      );
    }
    const users = await this.prisma.user.count({ where: { roleId: id } });
    if (users > 0) {
      throw new ConflictException('Reasigna los usuarios de este rol antes de eliminarlo');
    }
    await this.prisma.role.delete({ where: { id } });
    return { deleted: true };
  }

  /** Crea los roles de sistema con permisos por defecto (bootstrap de org). */
  static systemRoleCreates(organizationId: string) {
    return SYSTEM_ROLE_NAMES.map((name) => ({
      organizationId,
      name,
      isSystem: true,
      permissions: [...SYSTEM_ROLE_PERMISSIONS[name]],
    }));
  }

  private async ensure(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }
}
