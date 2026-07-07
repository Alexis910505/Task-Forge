import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class LinkTaskAssetsDto {
  @ApiPropertyOptional({ description: 'IDs de assets a vincular (omitir duplicados en servidor)' })
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  assetIds!: string[];
}
