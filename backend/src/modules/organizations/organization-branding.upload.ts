import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { join } from 'path';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import {
  OrganizationsService,
  type OrganizationBrandingKind,
} from './organizations.service';

export const brandingUploadDir = join(process.cwd(), 'uploads', 'branding');

export const MAX_ORG_LOGO_BYTES = 5 * 1024 * 1024;
export const MAX_ORG_FAVICON_BYTES = 1 * 1024 * 1024;

export const ORG_BRANDING_MIME = /^image\/(jpeg|png|webp|svg\+xml)$/;

export function parseBrandingKind(param: string): OrganizationBrandingKind {
  if (param === 'logo' || param === 'favicon') {
    return param;
  }
  throw new BadRequestException('Tipo de branding inválido (logo o favicon)');
}

export const organizationBrandingMulter = diskStorage({
  destination: (_req, _file, cb) => cb(null, brandingUploadDir),
  filename: (req: Request & { user: RequestUser; params: { kind: string } }, file, cb) => {
    try {
      const kind = parseBrandingKind(req.params.kind);
      cb(
        null,
        OrganizationsService.brandingFilename(req.user.organizationId, kind, file.originalname),
      );
    } catch (e) {
      cb(e as Error, '');
    }
  },
});
