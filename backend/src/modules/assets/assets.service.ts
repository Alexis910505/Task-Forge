import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  AddAssetPhotoDto,
  CreateAssetDto,
  CreateAssetCategoryDto,
  CreateAssetStatusDto,
  ListAssetsQueryDto,
  UpdateAssetCategoryDto,
  UpdateAssetDto,
  UpdateAssetStatusDto,
} from './dto/asset.dto';

const DEFAULT_CATEGORIES = [
  { code: 'VEHICLE', name: 'Vehículo', color: '#1565C0', icon: 'directions_car', sortOrder: 10 },
  { code: 'TOOL', name: 'Herramienta', color: '#6D4C41', icon: 'handyman', sortOrder: 20 },
  { code: 'EQUIPMENT', name: 'Equipo', color: '#6750A4', icon: 'inventory_2', isDefault: true, sortOrder: 30 },
  { code: 'MACHINERY', name: 'Maquinaria', color: '#EF6C00', icon: 'precision_manufacturing', sortOrder: 40 },
  { code: 'BUILDING', name: 'Edificio', color: '#455A64', icon: 'domain', sortOrder: 50 },
  { code: 'ROOM', name: 'Sala', color: '#00838F', icon: 'meeting_room', sortOrder: 60 },
  { code: 'ELECTRICAL', name: 'Eléctrico', color: '#F9A825', icon: 'electric_bolt', sortOrder: 70 },
  { code: 'HVAC', name: 'Climatización', color: '#0277BD', icon: 'ac_unit', sortOrder: 80 },
  { code: 'OTHER', name: 'Otro', color: '#616161', icon: 'category', sortOrder: 90 },
] as const;

const DEFAULT_STATUSES = [
  { code: 'OPERATIONAL', name: 'Operativo', color: '#2E7D32', isDefault: true, sortOrder: 10 },
  { code: 'MAINTENANCE', name: 'Mantenimiento', color: '#ED6C02', sortOrder: 20 },
  { code: 'OFFLINE', name: 'Fuera de servicio', color: '#D32F2F', sortOrder: 30 },
  { code: 'RESERVED', name: 'Reservado', color: '#6750A4', sortOrder: 40 },
  { code: 'RETIRED', name: 'Retirado', color: '#616161', sortOrder: 50 },
] as const;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCatalogs(organizationId: string) {
    const [categoryCount, statusCount] = await Promise.all([
      this.prisma.assetCategoryOption.count({ where: { organizationId } }),
      this.prisma.assetStatusOption.count({ where: { organizationId } }),
    ]);
    const writes: Promise<unknown>[] = [];
    if (categoryCount === 0) {
      writes.push(
        this.prisma.assetCategoryOption.createMany({
          data: DEFAULT_CATEGORIES.map((row) => ({ organizationId, ...row })),
          skipDuplicates: true,
        }),
      );
    }
    if (statusCount === 0) {
      writes.push(
        this.prisma.assetStatusOption.createMany({
          data: DEFAULT_STATUSES.map((row) => ({ organizationId, ...row })),
          skipDuplicates: true,
        }),
      );
    }
    await Promise.all(writes);
  }

  async listCategories(organizationId: string) {
    await this.ensureCatalogs(organizationId);
    const rows = await this.prisma.assetCategoryOption.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.prisma.asset.groupBy({
      by: ['category'],
      where: { organizationId },
      _count: { _all: true },
    });
    const countByCode = new Map(counts.map((r) => [r.category, r._count._all]));
    return rows.map((row) => ({ ...row, assetCount: countByCode.get(row.code) ?? 0 }));
  }

  async listStatuses(organizationId: string) {
    await this.ensureCatalogs(organizationId);
    const rows = await this.prisma.assetStatusOption.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.prisma.asset.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: { _all: true },
    });
    const countByCode = new Map(counts.map((r) => [r.status, r._count._all]));
    return rows.map((row) => ({ ...row, assetCount: countByCode.get(row.code) ?? 0 }));
  }

  async createCategory(organizationId: string, dto: CreateAssetCategoryDto) {
    await this.ensureCatalogs(organizationId);
    const code = dto.code.trim().toUpperCase();
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.assetCategoryOption.updateMany({
            where: { organizationId },
            data: { isDefault: false },
          });
        }
        return tx.assetCategoryOption.create({
          data: {
            organizationId,
            code,
            name: dto.name.trim(),
            color: dto.color,
            icon: dto.icon?.trim(),
            isDefault: dto.isDefault,
            sortOrder: dto.sortOrder,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe una categoría con ese código');
      }
      throw e;
    }
  }

  async updateCategory(
    organizationId: string,
    id: string,
    dto: UpdateAssetCategoryDto,
  ) {
    const row = await this.prisma.assetCategoryOption.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.assetCategoryOption.updateMany({
          where: { organizationId, id: { not: id } },
          data: { isDefault: false },
        });
      }
      if (dto.isDefault === false && row.isDefault) {
        throw new BadRequestException('Selecciona otra categoría predeterminada primero');
      }
      return tx.assetCategoryOption.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon.trim() } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    });
  }

  async removeCategory(organizationId: string, id: string) {
    const row = await this.prisma.assetCategoryOption.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Categoría no encontrada');
    if (row.isDefault) {
      throw new ConflictException('No se puede eliminar la categoría predeterminada');
    }
    const used = await this.prisma.asset.count({
      where: { organizationId, category: row.code },
    });
    if (used > 0) {
      throw new ConflictException(`La categoría está asignada a ${used} activo(s)`);
    }
    await this.prisma.assetCategoryOption.delete({ where: { id } });
    return { deleted: true };
  }

  async createStatus(organizationId: string, dto: CreateAssetStatusDto) {
    await this.ensureCatalogs(organizationId);
    const code = dto.code.trim().toUpperCase();
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (dto.isDefault) {
          await tx.assetStatusOption.updateMany({
            where: { organizationId },
            data: { isDefault: false },
          });
        }
        return tx.assetStatusOption.create({
          data: {
            organizationId,
            code,
            name: dto.name.trim(),
            color: dto.color,
            isDefault: dto.isDefault,
            sortOrder: dto.sortOrder,
          },
        });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un estado con ese código');
      }
      throw e;
    }
  }

  async updateStatus(organizationId: string, id: string, dto: UpdateAssetStatusDto) {
    const row = await this.prisma.assetStatusOption.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Estado no encontrado');
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.assetStatusOption.updateMany({
          where: { organizationId, id: { not: id } },
          data: { isDefault: false },
        });
      }
      if (dto.isDefault === false && row.isDefault) {
        throw new BadRequestException('Selecciona otro estado predeterminado primero');
      }
      return tx.assetStatusOption.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.color !== undefined ? { color: dto.color } : {}),
          ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        },
      });
    });
  }

  async removeStatus(organizationId: string, id: string) {
    const row = await this.prisma.assetStatusOption.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Estado no encontrado');
    if (row.isDefault) {
      throw new ConflictException('No se puede eliminar el estado predeterminado');
    }
    const used = await this.prisma.asset.count({
      where: { organizationId, status: row.code },
    });
    if (used > 0) {
      throw new ConflictException(`El estado está asignado a ${used} activo(s)`);
    }
    await this.prisma.assetStatusOption.delete({ where: { id } });
    return { deleted: true };
  }

  private async writeHistory(
    assetId: string,
    userId: string | undefined,
    action: string,
    metadata?: Record<string, unknown>,
  ) {
    await this.prisma.assetHistory.create({
      data: {
        assetId,
        userId: userId ?? null,
        action,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  async list(organizationId: string, query: ListAssetsQueryDto) {
    await this.ensureCatalogs(organizationId);
    const where: Prisma.AssetWhereInput = {
      organizationId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
              { code: { contains: query.q, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };
    const [assets, categories, statuses] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { taskLinks: true, photos: true } },
        },
      }),
      this.prisma.assetCategoryOption.findMany({ where: { organizationId } }),
      this.prisma.assetStatusOption.findMany({ where: { organizationId } }),
    ]);
    const categoryByCode = new Map(categories.map((row) => [row.code, row]));
    const statusByCode = new Map(statuses.map((row) => [row.code, row]));
    return assets.map((asset) => ({
      ...asset,
      categoryName: categoryByCode.get(asset.category)?.name ?? asset.category,
      categoryIcon: categoryByCode.get(asset.category)?.icon ?? 'inventory_2',
      categoryColor: categoryByCode.get(asset.category)?.color ?? '#6750A4',
      statusName: statusByCode.get(asset.status)?.name ?? asset.status,
      statusColor: statusByCode.get(asset.status)?.color ?? '#616161',
    }));
  }

  async create(organizationId: string, userId: string | undefined, dto: CreateAssetDto) {
    await this.ensureCatalogs(organizationId);
    const selectedStatus =
      dto.status ??
      (
        await this.prisma.assetStatusOption.findFirst({
          where: { organizationId, isDefault: true },
          select: { code: true },
        })
      )?.code ??
      'OPERATIONAL';
    await this.assertCatalogValues(organizationId, dto.category, selectedStatus);
    try {
      const asset = await this.prisma.asset.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code.trim(),
          category: dto.category,
          status: selectedStatus,
          location: dto.location,
          maintenanceDate: dto.maintenanceDate
            ? new Date(dto.maintenanceDate)
            : undefined,
        },
      });
      await this.writeHistory(asset.id, userId, 'ASSET_CREATED', {
        name: asset.name,
        code: asset.code,
      });
      return asset;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un activo con ese código en la organización');
      }
      throw e;
    }
  }

  async findOne(organizationId: string, id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, organizationId },
      include: {
        photos: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } },
        taskLinks: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                boardId: true,
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException();
    }
    const [categoryOption, statusOption] = await Promise.all([
      this.prisma.assetCategoryOption.findFirst({
        where: { organizationId, code: asset.category },
      }),
      this.prisma.assetStatusOption.findFirst({
        where: { organizationId, code: asset.status },
      }),
    ]);
    return {
      ...asset,
      categoryName: categoryOption?.name ?? asset.category,
      categoryIcon: categoryOption?.icon ?? 'inventory_2',
      categoryColor: categoryOption?.color ?? '#6750A4',
      statusName: statusOption?.name ?? asset.status,
      statusColor: statusOption?.color ?? '#616161',
    };
  }

  async update(organizationId: string, userId: string | undefined, id: string, dto: UpdateAssetDto) {
    await this.ensureExists(organizationId, id);
    await this.assertCatalogValues(organizationId, dto.category, dto.status);
    const data: Prisma.AssetUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.code !== undefined) {
      data.code = dto.code.trim();
    }
    if (dto.category !== undefined) {
      data.category = dto.category;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.location !== undefined) {
      data.location = dto.location;
    }
    if (dto.maintenanceDate !== undefined) {
      data.maintenanceDate =
        dto.maintenanceDate === '' ? null : new Date(dto.maintenanceDate);
    }
    try {
      const asset = await this.prisma.asset.update({ where: { id }, data });
      await this.writeHistory(id, userId, 'ASSET_UPDATED', dto as Record<string, unknown>);
      return asset;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('Ya existe un activo con ese código en la organización');
      }
      throw e;
    }
  }

  async remove(organizationId: string, _userId: string | undefined, id: string) {
    await this.ensureExists(organizationId, id);
    await this.prisma.asset.delete({ where: { id } });
    return { deleted: true };
  }

  history(organizationId: string, id: string, take = 200) {
    return this.prisma.assetHistory.findMany({
      where: { assetId: id, asset: { organizationId } },
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async addPhoto(organizationId: string, userId: string, assetId: string, dto: AddAssetPhotoDto) {
    await this.ensureExists(organizationId, assetId);
    const row = await this.prisma.assetPhoto.create({
      data: {
        assetId,
        userId,
        url: dto.url,
        filename: dto.filename,
        mimeType: dto.mimeType,
        size: dto.size,
      },
    });
    await this.writeHistory(assetId, userId, 'PHOTO_ADDED', {
      photoId: row.id,
      filename: dto.filename,
    });
    return row;
  }

  async removePhoto(
    organizationId: string,
    userId: string | undefined,
    assetId: string,
    photoId: string,
  ) {
    await this.ensureExists(organizationId, assetId);
    const res = await this.prisma.assetPhoto.deleteMany({
      where: { id: photoId, assetId, asset: { organizationId } },
    });
    if (res.count === 0) {
      throw new NotFoundException();
    }
    await this.writeHistory(assetId, userId, 'PHOTO_REMOVED', { photoId });
    return { deleted: true };
  }

  async ensureExists(organizationId: string, id: string) {
    const a = await this.prisma.asset.findFirst({ where: { id, organizationId } });
    if (!a) {
      throw new NotFoundException();
    }
  }

  async ensureAllExist(organizationId: string, ids: string[]) {
    if (!ids.length) {
      return;
    }
    const found = await this.prisma.asset.findMany({
      where: { id: { in: ids }, organizationId },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new NotFoundException('Uno o más assets no existen en la organización');
    }
  }

  private async assertCatalogValues(
    organizationId: string,
    category?: string,
    status?: string,
  ) {
    await this.ensureCatalogs(organizationId);
    const checks: Promise<unknown>[] = [];
    if (category) {
      checks.push(
        this.prisma.assetCategoryOption.findFirst({
          where: { organizationId, code: category },
          select: { id: true },
        }).then((row) => {
          if (!row) throw new BadRequestException('Categoría de activo no válida');
        }),
      );
    }
    if (status) {
      checks.push(
        this.prisma.assetStatusOption.findFirst({
          where: { organizationId, code: status },
          select: { id: true },
        }).then((row) => {
          if (!row) throw new BadRequestException('Estado de activo no válido');
        }),
      );
    }
    await Promise.all(checks);
  }

  async logTaskLink(assetId: string, userId: string | undefined, taskId: string) {
    await this.writeHistory(assetId, userId, 'LINKED_TO_TASK', { taskId });
  }

  async logTaskUnlink(assetId: string, userId: string | undefined, taskId: string) {
    await this.writeHistory(assetId, userId, 'UNLINKED_FROM_TASK', { taskId });
  }
}
