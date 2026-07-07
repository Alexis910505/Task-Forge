import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { TaskCommentsController } from './task-comments.controller';
import { ActivityModule } from '../activity/activity.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ActivityModule, NotificationsModule],
  controllers: [TaskCommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
