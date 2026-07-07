import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Express, Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { BootstrapOrganizationDto, UpdateOrganizationBrandingDto } from './dto/organization.dto';
import { Public } from '../../core/decorators/public.decorator';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import { RequestUser } from '../../core/strategies/jwt.strategy';
import {
  MAX_ORG_FAVICON_BYTES,
  MAX_ORG_LOGO_BYTES,
  ORG_BRANDING_MIME,
  organizationBrandingMulter,
  parseBrandingKind,
} from './organization-branding.upload';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Public()
  @Get('resolve/:slug')
  @ApiOperation({ summary: 'Resolver organización por slug (login / branding público)' })
  resolve(@Param('slug') slug: string) {
    return this.organizations.resolveBySlug(slug);
  }

  @Public()
  @Post('bootstrap')
  @ApiOperation({ summary: 'Crear organización + roles + primer administrador (alta SaaS)' })
  bootstrap(@Body() dto: BootstrapOrganizationDto) {
    return this.organizations.bootstrap(dto);
  }

  @Get('current')
  @ApiBearerAuth()
  @RequirePermissions('organizations:read')
  @ApiOperation({ summary: 'Organización actual (config + branding)' })
  current(@Req() req: Request & { user: RequestUser }) {
    return this.organizations.getCurrent(req.user.organizationId);
  }

  @Patch('current')
  @ApiBearerAuth()
  @RequirePermissions('organizations:write')
  @ApiOperation({ summary: 'Actualizar nombre, branding y settings JSON' })
  updateCurrent(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: UpdateOrganizationBrandingDto,
  ) {
    return this.organizations.updateBranding(req.user.organizationId, dto);
  }

  @Post('current/branding/:kind')
  @ApiBearerAuth()
  @RequirePermissions('organizations:write')
  @ApiOperation({ summary: 'Subir logo o favicon de la organización (PNG, JPG, WEBP, SVG)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: organizationBrandingMulter,
      limits: { fileSize: MAX_ORG_LOGO_BYTES },
    }),
  )
  uploadBranding(
    @Req() req: Request & { user: RequestUser },
    @Param('kind') kindParam: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: true,
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_ORG_LOGO_BYTES }),
          new FileTypeValidator({ fileType: ORG_BRANDING_MIME }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const kind = parseBrandingKind(kindParam);
    if (kind === 'favicon' && file.size > MAX_ORG_FAVICON_BYTES) {
      throw new BadRequestException('El icono no puede superar 1 MB');
    }
    return this.organizations.uploadBrandingFile(req.user.organizationId, kind, file);
  }
}
