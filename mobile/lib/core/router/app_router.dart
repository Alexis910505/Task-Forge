import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../security/user_permissions_provider.dart';
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
import '../../features/tasks/presentation/task_detail_mobile_page.dart';
import 'router_refresh.dart';

final _shellNavigatorKey = GlobalKey<NavigatorState>(debugLabel: 'shell');

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(goRouterRefreshProvider);
  return GoRouter(
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authRepositoryProvider);
      final loc = state.matchedLocation;
      final loggingIn = loc == '/login';
      if (auth.isLoading) {
        return null;
      }
      final loggedIn = auth.maybeWhen(data: (v) => v != null, orElse: () => false);
      if (!loggedIn && !loggingIn) {
        return '/login';
      }
      if (loggedIn && loggingIn) {
        return '/dashboard';
      }
      if (loggedIn && loc.startsWith('/reports')) {
        final canReports = ref.read(canReadReportsProvider);
        if (!canReports) {
          return '/dashboard';
        }
      }
      if (loggedIn && loc.startsWith('/settings')) {
        final canOrg = ref.read(canReadOrganizationProvider);
        if (!canOrg) {
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
            pageBuilder: (context, state) => const NoTransitionPage(child: DashboardPage()),
          ),
          GoRoute(
            path: '/kanban',
            pageBuilder: (context, state) => const NoTransitionPage(child: KanbanPage()),
          ),
          GoRoute(
            path: '/my-tasks',
            pageBuilder: (context, state) => const NoTransitionPage(child: MyTasksPage()),
          ),
          GoRoute(
            path: '/reports',
            pageBuilder: (context, state) => const NoTransitionPage(child: ReportsPage()),
          ),
          GoRoute(
            path: '/notifications',
            pageBuilder: (context, state) => const NoTransitionPage(child: NotificationsPage()),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (context, state) => const NoTransitionPage(child: ProfilePage()),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) => const NoTransitionPage(child: SettingsPage()),
          ),
          GoRoute(
            path: '/organization',
            pageBuilder: (context, state) => const NoTransitionPage(child: OrganizationPage()),
          ),
        ],
      ),
      GoRoute(
        path: '/tasks/new',
        builder: (context, state) => const CreateTaskOfflinePage(),
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
      GoRoute(
        path: '/tasks/:taskId/evidence',
        builder: (context, state) {
          final id = state.pathParameters['taskId']!;
          return TaskEvidencePage(taskId: id);
        },
      ),
    ],
  );
});
