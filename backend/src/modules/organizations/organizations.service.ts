import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { extname } from 'path';
import type { Express } from 'express';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BootstrapOrganizationDto, UpdateOrganizationBrandingDto } from './dto/organization.dto';

export type OrganizationBrandingKind = 'logo' | 'favicon';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug: slug.toLowerCase().trim() },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        faviconUrl: true,
        primaryColor: true,
        secondaryColor: true,
        accentColor: true,
      },
    });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }
    return org;
  }

  async getCurrent(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException();
    }
    return org;
  }

  async uploadBrandingFile(
    organizationId: string,
    kind: OrganizationBrandingKind,
    file: Express.Multer.File,
  ) {
    await this.ensureExists(organizationId);
    const publicUrl = `/uploads/branding/${file.filename}`;
    const data =
      kind === 'logo' ? { logoUrl: publicUrl } : { faviconUrl: publicUrl };
    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });
  }

  async updateBranding(organizationId: string, dto: UpdateOrganizationBrandingDto) {
    const data: Prisma.OrganizationUncheckedUpdateInput = {};
    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.logoUrl !== undefined) {
      data.logoUrl = dto.logoUrl;
    }
    if (dto.faviconUrl !== undefined) {
      data.faviconUrl = dto.faviconUrl;
    }
    if (dto.primaryColor !== undefined) {
      data.primaryColor = dto.primaryColor;
    }
    if (dto.secondaryColor !== undefined) {
      data.secondaryColor = dto.secondaryColor;
    }
    if (dto.accentColor !== undefined) {
      data.accentColor = dto.accentColor;
    }
    if (dto.customCss !== undefined) {
      data.customCss = dto.customCss;
    }
    if (dto.settings !== undefined) {
      data.settings = dto.settings as Prisma.InputJsonValue;
    }
    return this.prisma.organization.update({
      where: { id: organizationId },
      data,
    });
  }

  private async ensureExists(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!org) {
      throw new NotFoundException();
    }
  }

  static brandingFilename(
    organizationId: string,
    kind: OrganizationBrandingKind,
    originalName: string,
  ): string {
    const ext = extname(originalName).toLowerCase();
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.svg'].includes(ext) ? ext : '.png';
    return `${organizationId}-${kind}${safeExt}`;
  }

  async bootstrap(dto: BootstrapOrganizationDto) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('El slug ya está en uso');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug,
        },
      });

      const roleRows = await Promise.all(
        Object.values(RoleName).map((name) =>
          tx.role.create({
            data: { organizationId: org.id, name },
          }),
        ),
      );
      const adminRole = roleRows.find((r) => r.name === RoleName.ADMIN);
      if (!adminRole) {
        throw new ConflictException('No se pudo crear rol admin');
      }

      await tx.user.create({
        data: {
          organizationId: org.id,
          email: dto.adminEmail.toLowerCase().trim(),
          passwordHash,
          firstName: dto.adminFirstName.trim(),
          lastName: dto.adminLastName.trim(),
          roleId: adminRole.id,
        },
      });

      return {
        organizationId: org.id,
        slug: org.slug,
        name: org.name,
      };
    });
  }
}
