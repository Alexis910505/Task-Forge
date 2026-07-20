import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  ActivityService,
  DASHBOARD_RECENT_ACTIVITY_LIMIT,
} from '../activity/activity.service';

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly';

function periodBounds(period: DashboardPeriod): { start: Date; previousStart: Date } {
  const now = new Date();
  const start = new Date(now);
  const previousStart = new Date(now);
  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
    previousStart.setDate(previousStart.getDate() - 1);
    previousStart.setHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    start.setDate(start.getDate() - 7);
    previousStart.setDate(previousStart.getDate() - 14);
  } else {
    start.setDate(start.getDate() - 30);
    previousStart.setDate(previousStart.getDate() - 60);
  }
  return { start, previousStart };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async summary(organizationId: string, period: DashboardPeriod = 'daily') {
    const taskWhere = { board: { organizationId }, parentTaskId: null };
    const { start: periodStart, previousStart } = periodBounds(period);
    const last48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const now = new Date();

    const [
      users,
      tasksTotal,
      tasksByStatus,
      overdue,
      urgent,
      completedLast48h,
      tasksCreatedCurrent,
      tasksCreatedPrevious,
      recentActivity,
      departmentWorkload,
      urgentTasks,
    ] = await Promise.all([
      this.prisma.user.count({ where: { organizationId, isActive: true } }),
      this.prisma.task.count({ where: taskWhere }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: taskWhere,
        _count: { status: true },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          dueDate: { lt: now },
          status: { not: TaskStatus.COMPLETED },
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          status: { not: TaskStatus.COMPLETED },
          OR: [
            { priority: TaskPriority.CRITICAL },
            {
              dueDate: { lt: now },
            },
          ],
        },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          status: TaskStatus.COMPLETED,
          updatedAt: { gte: last48h },
        },
      }),
      this.prisma.task.count({
        where: { ...taskWhere, createdAt: { gte: periodStart } },
      }),
      this.prisma.task.count({
        where: {
          ...taskWhere,
          createdAt: { gte: previousStart, lt: periodStart },
        },
      }),
      this.activity.findRecentForOrganization(organizationId, DASHBOARD_RECENT_ACTIVITY_LIMIT),
      this.departmentWorkload(organizationId),
      this.prisma.task.findMany({
        where: {
          ...taskWhere,
          status: { not: TaskStatus.COMPLETED },
          OR: [
            { priority: TaskPriority.CRITICAL },
            { dueDate: { lt: now } },
          ],
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          priority: true,
          dueDate: true,
          status: true,
        },
      }),
    ]);

    const statusMap = Object.fromEntries(
      tasksByStatus.map((r) => [r.status, r._count.status]),
    ) as Record<TaskStatus, number>;

    let trendPercent: number | null = null;
    if (tasksCreatedPrevious > 0) {
      trendPercent = Math.round(
        ((tasksCreatedCurrent - tasksCreatedPrevious) / tasksCreatedPrevious) * 100,
      );
    } else if (tasksCreatedCurrent > 0) {
      trendPercent = 100;
    }

    return {
      period,
      usersActive: users,
      tasksTotal,
      tasksByStatus: statusMap,
      overdue,
      urgent,
      completedLast48h,
      tasksCreatedInPeriod: tasksCreatedCurrent,
      trendPercent,
      recentActivity: recentActivity.map((entry) => ({
        id: entry.id,
        action: entry.action,
        createdAt: entry.createdAt,
        metadata: entry.metadata,
        user: entry.user,
        task: entry.task,
      })),
      departmentWorkload,
      urgentTasks: urgentTasks.map((task) => {
        const isOverdue = task.dueDate != null && task.dueDate < now;
        const isCritical = task.priority === TaskPriority.CRITICAL;
        let reason: 'critical' | 'overdue' | 'both' = 'critical';
        if (isCritical && isOverdue) {
          reason = 'both';
        } else if (isOverdue) {
          reason = 'overdue';
        }
        return {
          id: task.id,
          title: task.title,
          priority: task.priority,
          dueDate: task.dueDate,
          reason,
        };
      }),
    };
  }

  private async departmentWorkload(organizationId: string) {
    const [departments, stats] = await Promise.all([
      this.prisma.department.findMany({
        where: { organizationId },
        orderBy: { name: 'asc' },
        include: { _count: { select: { users: true } } },
      }),
      this.prisma.$queryRaw<
        {
          departmentId: string;
          openTasks: bigint;
          completedTasks: bigint;
          totalTasks: bigint;
        }[]
      >`
        WITH task_dept AS (
          SELECT t.id AS task_id, t.status, p."departmentId" AS department_id
          FROM "Task" t
          INNER JOIN "Board" b ON b.id = t."boardId"
          INNER JOIN "Project" p ON p.id = b."projectId"
          WHERE b."organizationId" = ${organizationId}
            AND t."parentTaskId" IS NULL
            AND p."departmentId" IS NOT NULL
          UNION
          SELECT t.id, t.status, u."departmentId"
          FROM "Task" t
          INNER JOIN "Board" b ON b.id = t."boardId"
          INNER JOIN "User" u ON u.id = t."assigneeId"
          WHERE b."organizationId" = ${organizationId}
            AND t."parentTaskId" IS NULL
            AND u."departmentId" IS NOT NULL
        )
        SELECT
          department_id AS "departmentId",
          COUNT(*) FILTER (WHERE status <> 'COMPLETED'::"TaskStatus")::bigint AS "openTasks",
          COUNT(*) FILTER (WHERE status = 'COMPLETED'::"TaskStatus")::bigint AS "completedTasks",
          COUNT(*)::bigint AS "totalTasks"
        FROM task_dept
        GROUP BY department_id
      `,
    ]);

    const statsByDept = new Map(
      stats.map((row) => [
        row.departmentId,
        {
          openTasks: Number(row.openTasks),
          completedTasks: Number(row.completedTasks),
          totalTasks: Number(row.totalTasks),
        },
      ]),
    );

    return departments.map((dept) => {
      const counts = statsByDept.get(dept.id) ?? {
        openTasks: 0,
        completedTasks: 0,
        totalTasks: 0,
      };
      const { openTasks, completedTasks, totalTasks } = counts;
      const memberCount = dept._count.users;
      const tasksPerMember = memberCount > 0 ? openTasks / memberCount : openTasks;
      const efficiency =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : null;

      let loadLevel: 'critical' | 'balanced' | 'under' = 'balanced';
      if (memberCount === 0 && openTasks > 0) {
        loadLevel = 'critical';
      } else if (tasksPerMember >= 5) {
        loadLevel = 'critical';
      } else if (tasksPerMember < 1.5 && openTasks > 0) {
        loadLevel = 'under';
      }

      return {
        id: dept.id,
        name: dept.name,
        openTasks,
        totalTasks,
        completedTasks,
        memberCount,
        efficiency,
        loadLevel,
      };
    });
  }
}
