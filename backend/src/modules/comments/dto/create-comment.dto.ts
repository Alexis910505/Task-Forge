import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateCommentDto {
  @ApiPropertyOptional()
  @IsString()
  @MinLength(1)
  content!: string;
}
