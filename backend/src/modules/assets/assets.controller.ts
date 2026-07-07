import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import {
  AddAssetPhotoDto,
  CreateAssetDto,
  ListAssetsQueryDto,
  UpdateAssetDto,
} from './dto/asset.dto';
import { RequirePermissions } from '../../core/decorators/permissions.decorator';
import type { Request } from 'express';
import { RequestUser } from '../../core/strategies/jwt.strategy';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Get()
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Listar activos con filtros' })
  list(@Req() req: Request & { user: RequestUser }, @Query() query: ListAssetsQueryDto) {
    return this.assets.list(req.user.organizationId, query);
  }

  @Post()
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Crear activo' })
  create(@Req() req: Request & { user: RequestUser }, @Body() dto: CreateAssetDto) {
    return this.assets.create(req.user.organizationId, req.user.userId, dto);
  }

  @Get(':id')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Detalle con fotos, historial reciente y tareas vinculadas' })
  findOne(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.assets.findOne(req.user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Actualizar activo' })
  update(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assets.update(req.user.organizationId, req.user.userId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Eliminar activo' })
  remove(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.assets.remove(req.user.organizationId, req.user.userId, id);
  }

  @Get(':id/history')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Historial completo del activo' })
  history(@Req() req: Request & { user: RequestUser }, @Param('id') id: string) {
    return this.assets.history(req.user.organizationId, id);
  }

  @Post(':id/photos')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Registrar foto (tras subida a almacenamiento)' })
  addPhoto(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Body() dto: AddAssetPhotoDto,
  ) {
    return this.assets.addPhoto(req.user.organizationId, req.user.userId, id, dto);
  }

  @Delete(':id/photos/:photoId')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Eliminar registro de foto' })
  removePhoto(
    @Req() req: Request & { user: RequestUser },
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.assets.removePhoto(req.user.organizationId, req.user.userId, id, photoId);
  }
}
