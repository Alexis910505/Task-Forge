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
  CreateAssetCategoryDto,
  CreateAssetDto,
  CreateAssetStatusDto,
  ListAssetsQueryDto,
  UpdateAssetCategoryDto,
  UpdateAssetDto,
  UpdateAssetStatusDto,
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

  @Get('catalog/categories')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Listar categorías administrables de activos' })
  categories(@Req() req: Request & { user: RequestUser }) {
    return this.assets.listCategories(req.user.organizationId);
  }

  @Post('catalog/categories')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Crear categoría de activo' })
  createCategory(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateAssetCategoryDto,
  ) {
    return this.assets.createCategory(req.user.organizationId, dto);
  }

  @Patch('catalog/categories/:categoryId')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Actualizar categoría de activo' })
  updateCategory(
    @Req() req: Request & { user: RequestUser },
    @Param('categoryId') id: string,
    @Body() dto: UpdateAssetCategoryDto,
  ) {
    return this.assets.updateCategory(req.user.organizationId, id, dto);
  }

  @Delete('catalog/categories/:categoryId')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Eliminar categoría de activo sin uso' })
  removeCategory(
    @Req() req: Request & { user: RequestUser },
    @Param('categoryId') id: string,
  ) {
    return this.assets.removeCategory(req.user.organizationId, id);
  }

  @Get('catalog/statuses')
  @RequirePermissions('assets:read')
  @ApiOperation({ summary: 'Listar estados administrables de activos' })
  statuses(@Req() req: Request & { user: RequestUser }) {
    return this.assets.listStatuses(req.user.organizationId);
  }

  @Post('catalog/statuses')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Crear estado de activo' })
  createStatus(
    @Req() req: Request & { user: RequestUser },
    @Body() dto: CreateAssetStatusDto,
  ) {
    return this.assets.createStatus(req.user.organizationId, dto);
  }

  @Patch('catalog/statuses/:statusId')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Actualizar estado de activo' })
  updateStatus(
    @Req() req: Request & { user: RequestUser },
    @Param('statusId') id: string,
    @Body() dto: UpdateAssetStatusDto,
  ) {
    return this.assets.updateStatus(req.user.organizationId, id, dto);
  }

  @Delete('catalog/statuses/:statusId')
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Eliminar estado de activo sin uso' })
  removeStatus(
    @Req() req: Request & { user: RequestUser },
    @Param('statusId') id: string,
  ) {
    return this.assets.removeStatus(req.user.organizationId, id);
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
