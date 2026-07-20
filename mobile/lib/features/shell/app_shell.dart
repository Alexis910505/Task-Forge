import 'package:flutter/material.dart';

import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;

import 'package:go_router/go_router.dart';

import '../../core/branding/app_logo.dart';

import '../../core/layout/app_mobile_top_bar.dart';

import '../../core/offline/app_database.dart';
import '../../core/offline/local_data_service.dart';

import '../../core/security/user_permissions_provider.dart';

import '../auth/application/auth_repository.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  bool _showBottomNav(String location) {
    return location.startsWith('/my-tasks') ||
        location.startsWith('/dashboard') ||
        location.startsWith('/assets') ||
        location.startsWith('/notifications') ||
        location.startsWith('/profile');
  }

  int _bottomNavIndex(String location, bool canReadAssets) {
    if (location.startsWith('/my-tasks')) return 0;
    if (location.startsWith('/dashboard')) return 1;
    if (canReadAssets && location.startsWith('/assets')) return 2;
    if (location.startsWith('/notifications')) return canReadAssets ? 3 : 2;
    if (location.startsWith('/profile')) return canReadAssets ? 4 : 3;
    return 1;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final location = GoRouterState.of(context).matchedLocation;
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final canReports = canReadReports();
    final hasAssetsAccess = canReadAssets();

    void go(String path) => context.go(path);

    Future<void> signOut() async {
      await Get.find<LocalDataService>().clearAllUserData();
      await Get.find<AuthController>().logout();
      if (context.mounted) {
        context.go('/login');
      }
    }

    final showBottomNav = !wide && _showBottomNav(location);
    final bottomIndex = _bottomNavIndex(location, hasAssetsAccess);

    final railDestinations = <NavigationRailDestination>[
      NavigationRailDestination(
        icon: const Icon(Icons.dashboard_outlined),
        selectedIcon: const Icon(Icons.dashboard),
        label: Text(l10n.navDashboard),
      ),
      NavigationRailDestination(
        icon: const Icon(Icons.assignment_outlined),
        selectedIcon: const Icon(Icons.assignment),
        label: Text(l10n.navRailTasks),
      ),
      if (canReports)
        NavigationRailDestination(
          icon: const Icon(Icons.bar_chart_outlined),
          selectedIcon: const Icon(Icons.bar_chart),
          label: Text(l10n.navRailReports),
        ),
      if (hasAssetsAccess)
        NavigationRailDestination(
          icon: const Icon(Icons.inventory_2_outlined),
          selectedIcon: const Icon(Icons.inventory_2),
          label: Text(l10n.navAssets),
        ),
      NavigationRailDestination(
        icon: const Icon(Icons.view_kanban_outlined),
        selectedIcon: const Icon(Icons.view_kanban),
        label: Text(l10n.navKanban),
      ),
      NavigationRailDestination(
        icon: const Icon(Icons.apartment_outlined),
        selectedIcon: const Icon(Icons.apartment),
        label: Text(l10n.navOrganization),
      ),
      NavigationRailDestination(
        icon: const Icon(Icons.person_outline),
        selectedIcon: const Icon(Icons.person),
        label: Text(l10n.navProfile),
      ),
      NavigationRailDestination(
        icon: const Icon(Icons.settings_outlined),
        selectedIcon: const Icon(Icons.settings),
        label: Text(l10n.navRailSettings),
      ),
    ];

    final railPaths = <String>[
      '/dashboard',
      '/my-tasks',
      if (canReports) '/reports',
      if (hasAssetsAccess) '/assets',
      '/kanban',
      '/organization',
      '/profile',
      '/settings',
    ];

    var railSelected = 0;
    for (var i = 0; i < railPaths.length; i++) {
      if (location.startsWith(railPaths[i])) {
        railSelected = i;
        break;
      }
    }

    final bottomDestinations = <NavigationDestination>[
      NavigationDestination(
        icon: const Icon(Icons.assignment_outlined),
        selectedIcon: const Icon(Icons.assignment),
        label: l10n.navWork,
      ),
      NavigationDestination(
        icon: const Icon(Icons.dashboard_outlined),
        selectedIcon: const Icon(Icons.dashboard),
        label: l10n.navDashboard,
      ),
      if (hasAssetsAccess)
        NavigationDestination(
          icon: const Icon(Icons.inventory_2_outlined),
          selectedIcon: const Icon(Icons.inventory_2),
          label: l10n.navAssets,
        ),
      NavigationDestination(
        icon: const Icon(Icons.notifications_outlined),
        selectedIcon: const Icon(Icons.notifications),
        label: l10n.navAlerts,
      ),
      NavigationDestination(
        icon: const Icon(Icons.person_outline),
        selectedIcon: const Icon(Icons.person),
        label: l10n.navProfile,
      ),
    ];

    final bottomPaths = <String>[
      '/my-tasks',
      '/dashboard',
      if (hasAssetsAccess) '/assets',
      '/notifications',
      '/profile',
    ];

    return Scaffold(
      appBar:
          wide
              ? AppBar(
                automaticallyImplyLeading: false,
                title: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const AppLogo(size: 28),
                    const SizedBox(width: 10),
                    Text(
                      l10n.appTitle,
                      style: theme.appBarTheme.titleTextStyle,
                    ),
                  ],
                ),
                actions: [
                  Obx(() {
                    final profile =
                        Get.find<AuthController>().session.value?.profile;
                    return Padding(
                      padding: const EdgeInsets.only(right: 4),
                      child: AppProfileAvatarButton(profile: profile),
                    );
                  }),
                  StreamBuilder<int>(
                    stream: Get.find<LocalDataService>().watchOutboxCount(),
                    builder: (context, outSnapshot) {
                      final db = Get.find<AppDatabase>();
                      return StreamBuilder<int>(
                        stream: db
                            .select(db.evidenceUploadQueue)
                            .watch()
                            .map((rows) => rows.length),
                        builder: (context, evidenceSnapshot) {
                          final n =
                              (outSnapshot.data ?? 0) +
                              (evidenceSnapshot.data ?? 0);
                          if (n <= 0) {
                            return const SizedBox.shrink();
                          }
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: Tooltip(
                              message: l10n.syncPendingTooltip,
                              child: Chip(
                                backgroundColor: scheme.surfaceContainerHigh,
                                side: BorderSide(color: scheme.outlineVariant),
                                avatar: Icon(
                                  Icons.cloud_upload_outlined,
                                  size: 18,
                                  color: scheme.primary,
                                ),
                                label: Text(
                                  '$n',
                                  style: TextStyle(
                                    color: scheme.onSurface,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      );
                    },
                  ),
                ],
              )
              : null,
      bottomNavigationBar:
          showBottomNav
              ? NavigationBar(
                selectedIndex: bottomIndex.clamp(
                  0,
                  bottomDestinations.length - 1,
                ),
                height: 72,
                onDestinationSelected: (i) {
                  if (i >= 0 && i < bottomPaths.length) {
                    go(bottomPaths[i]);
                  }
                },
                destinations: bottomDestinations,
              )
              : null,
      body: Row(
        children: [
          if (wide)
            NavigationRail(
              selectedIndex: railSelected,
              onDestinationSelected: (i) {
                if (i >= 0 && i < railPaths.length) {
                  go(railPaths[i]);
                }
              },
              labelType: NavigationRailLabelType.all,
              trailing: IconButton(
                tooltip: l10n.signOut,
                onPressed: signOut,
                icon: Icon(Icons.logout, color: scheme.onInverseSurface),
              ),
              destinations: railDestinations,
            ),
          Expanded(child: wide ? child : SafeArea(bottom: false, child: child)),
        ],
      ),
    );
  }
}
