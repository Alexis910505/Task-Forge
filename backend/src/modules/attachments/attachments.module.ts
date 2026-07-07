import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { TaskAttachmentsController } from './task-attachments.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [TaskAttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
