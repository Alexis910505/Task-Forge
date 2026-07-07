import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddTeamMemberDto {
  @ApiPropertyOptional()
  @IsString()
  userId!: string;
}
