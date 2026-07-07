import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  AddAssetPhotoDto,
  CreateAssetDto,
  ListAssetsQueryDto,
  UpdateAssetDto,
} from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

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

  list(organizationId: string, query: ListAssetsQueryDto) {
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
    return this.prisma.asset.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { taskLinks: true, photos: true } },
      },
    });
  }

  async create(organizationId: string, userId: string | undefined, dto: CreateAssetDto) {
    try {
      const asset = await this.prisma.asset.create({
        data: {
          organizationId,
          name: dto.name,
          code: dto.code.trim(),
          category: dto.category,
          status: dto.status,
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
    return asset;
  }

  async update(organizationId: string, userId: string | undefined, id: string, dto: UpdateAssetDto) {
    await this.ensureExists(organizationId, id);
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

  async logTaskLink(assetId: string, userId: string | undefined, taskId: string) {
    await this.writeHistory(assetId, userId, 'LINKED_TO_TASK', { taskId });
  }

  async logTaskUnlink(assetId: string, userId: string | undefined, taskId: string) {
    await this.writeHistory(assetId, userId, 'UNLINKED_FROM_TASK', { taskId });
  }
}
