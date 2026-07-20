import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:go_router/go_router.dart';

import '../security/user_permissions_provider.dart';
import '../../features/assets/presentation/asset_detail_page.dart';
import '../../features/assets/presentation/assets_list_page.dart';
import '../../features/auth/application/auth_repository.dart';
import '../../features/auth/presentation/login_page.dart';
import '../../features/create_task/presentation/create_task_offline_page.dart';
import '../../features/dashboard/presentation/dashboard_page.dart';
import '../../features/evidence/presentation/task_evidence_page.dart';
import '../../features/kanban/presentation/kanban_page.dart';
import '../../features/my_tasks/presentation/my_tasks_page.dart';
import '../../features/notifications/presentation/notifications_page.dart';
import '../../features/organization/presentation/organization_page.dart';
import '../../features/profile/presentation/profile_page.dart';
import '../../features/reports/presentation/reports_page.dart';
import '../../features/settings/presentation/settings_page.dart';
import '../../features/shell/app_shell.dart';
import '../../features/tasks/presentation/task_activity_page.dart';
import '../../features/tasks/presentation/task_detail_mobile_page.dart';
import 'router_refresh.dart';

final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

late final GoRouter appRouter;
late final GoRouterRefresh goRouterRefresh;

void initAppRouter() {
  goRouterRefresh = GoRouterRefresh();
  appRouter = GoRouter(
    initialLocation: '/login',
    refreshListenable: goRouterRefresh,
    redirect: (context, state) {
      final auth = Get.find<AuthController>();
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login';
      if (auth.isBootstrapping.value) {
        return null;
      }
      final loggedIn = auth.isLoggedIn;
      if (!loggedIn && !loggingIn) {
        return '/login';
      }
      if (loggedIn && loggingIn) {
        return '/dashboard';
      }
      if (loggedIn && loc.startsWith('/reports')) {
        if (!canReadReports()) {
          return '/dashboard';
        }
      }
      if (loggedIn && loc.startsWith('/settings')) {
        if (!canReadOrganization()) {
          return '/dashboard';
        }
      }
      if (loggedIn && loc.startsWith('/assets')) {
        if (!canReadAssets()) {
          return '/dashboard';
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: '/kanban',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: KanbanPage()),
          ),
          GoRoute(
            path: '/my-tasks',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: MyTasksPage()),
          ),
          GoRoute(
            path: '/assets',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: AssetsListPage()),
          ),
          GoRoute(
            path: '/reports',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ReportsPage()),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: NotificationsPage()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: ProfilePage()),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: SettingsPage()),
          ),
          GoRoute(
            path: '/organization',
            pageBuilder: (context, state) =>
                const NoTransitionPage(child: OrganizationPage()),
          ),
        ],
      ),
      GoRoute(
        path: '/assets/:assetId',
        builder: (context, state) {
          final id = state.pathParameters['assetId']!;
          return AssetDetailPage(assetId: id);
        },
      ),
      GoRoute(
        path: '/tasks/new',
        builder: (context, state) => const CreateTaskOfflinePage(),
      ),
      GoRoute(
        path: '/tasks/:taskId/activity',
        builder: (context, state) {
          final id = state.pathParameters['taskId']!;
          return TaskActivityPage(taskId: id);
        },
      ),
      GoRoute(
        path: '/tasks/:taskId/evidence',
        builder: (context, state) {
          final id = state.pathParameters['taskId']!;
          return TaskEvidencePage(taskId: id);
        },
      ),
      GoRoute(
        path: '/tasks/:taskId',
        builder: (context, state) {
          final id = state.pathParameters['taskId']!;
          if (id == 'new') {
            return const CreateTaskOfflinePage();
          }
          return TaskDetailMobilePage(taskId: id);
        },
      ),
    ],
  );
}
