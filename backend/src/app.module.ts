import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './core/config/environment-variables';
import { JwtAuthGuard } from './core/guards/jwt-auth.guard';
import { RolesGuard } from './core/guards/roles.guard';
import { PermissionsGuard } from './core/guards/permissions.guard';
import { PrismaModule } from './core/prisma/prisma.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { BoardsModule } from './modules/boards/boards.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AssetsModule } from './modules/assets/assets.module';
import { CommentsModule } from './modules/comments/comments.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ActivityModule } from './modules/activity/activity.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { EventsModule } from './websocket/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    OrganizationsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    TeamsModule,
    ProjectsModule,
    BoardsModule,
    TasksModule,
    AssetsModule,
    CommentsModule,
    AttachmentsModule,
    NotificationsModule,
    ActivityModule,
    DashboardModule,
    ReportsModule,
    EventsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
