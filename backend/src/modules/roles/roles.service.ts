import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { rolesBelow } from '../../core/security/role-chain';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

/** Inventario: todos los roles pueden ver activos (editarlos depende del rol). */
const INVENTORY_PERMISSIONS: PermissionKey[] = ['assets:read'];

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

  async findAll(organizationId: string) {
    const roles = await this.prisma.role.findMany({
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
    // Cadena de mando: qué permisos recibe cada rol de los de debajo (y de cuál).
    const byName = new Map(roles.filter((r) => r.isSystem).map((r) => [r.name, r.permissions]));
    return roles.map((r) => {
      const inherited: Record<string, string> = {};
      if (r.isSystem) {
        for (const below of rolesBelow(r.name)) {
          for (const p of byName.get(below) ?? []) {
            if (!r.permissions.includes(p) && !(p in inherited)) inherited[p] = below;
          }
        }
      }
      return { ...r, inheritedPermissions: inherited };
    });
  }

  async create(organizationId: string, dto: CreateRoleDto, actorRole?: string) {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('El nombre debe tener al menos 2 caracteres');
    }
    const reserved = SYSTEM_ROLE_NAMES.some((n) => n === name.toUpperCase());
    if (reserved && name.toUpperCase() === name) {
      throw new ConflictException('Ese nombre está reservado para un rol de sistema');
    }
    const permissions = this.limitForActor(
      withInventoryPermissions(sanitizePermissions(dto.permissions)),
      actorRole,
    );
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

  async update(organizationId: string, id: string, dto: UpdateRoleDto, actorRole?: string) {
    const role = await this.ensure(organizationId, id);
    this.assertActorCanEdit(role, actorRole);
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
      data.permissions = this.limitForActor(
        withInventoryPermissions(sanitizePermissions(dto.permissions)),
        actorRole,
      );
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

  async remove(organizationId: string, id: string, actorRole?: string) {
    const role = await this.ensure(organizationId, id);
    this.assertActorCanEdit(role, actorRole);
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

  /** IT solo gestiona roles personalizados; los de sistema son del Super Admin. */
  private assertActorCanEdit(role: { isSystem: boolean }, actorRole?: string) {
    if (actorRole === 'IT' && role.isSystem) {
      throw new ForbiddenException('Los roles de fábrica solo los puede cambiar el Super Admin');
    }
  }

  /** IT no puede dar a un rol personalizado permisos que él mismo no tiene (evita escalar). */
  private limitForActor(permissions: PermissionKey[], actorRole?: string): PermissionKey[] {
    if (actorRole !== 'IT') return permissions;
    const allowed = new Set<string>(SYSTEM_ROLE_PERMISSIONS.IT);
    return permissions.filter((p) => allowed.has(p) || p === 'assets:read' || p === 'assets:write');
  }

  private async ensure(organizationId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }
}
