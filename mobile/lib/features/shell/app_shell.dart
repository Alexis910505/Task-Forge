import 'package:flutter/material.dart';

import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:go_router/go_router.dart';



import '../../core/branding/app_logo.dart';

import '../../core/layout/app_mobile_top_bar.dart';

import '../../core/offline/offline_providers.dart';

import '../../core/security/user_permissions_provider.dart';

import '../../features/evidence/evidence_providers.dart';

import '../auth/application/auth_repository.dart';



class AppShell extends ConsumerWidget {

  const AppShell({super.key, required this.child});



  final Widget child;



  int _shellIndexForLocation(String location) {

    if (location.startsWith('/my-tasks')) return 1;

    if (location.startsWith('/reports')) return 2;

    if (location.startsWith('/organization')) return 3;

    if (location.startsWith('/notifications')) return 6;

    if (location.startsWith('/profile')) return 4;

    if (location.startsWith('/settings')) return 5;

    return 0;

  }



  int _bottomNavIndex(String location, bool canReports) {

    if (location.startsWith('/my-tasks')) return 1;

    if (canReports && location.startsWith('/reports')) return 2;

    return 0;

  }



  bool _showBottomNav(int shellIndex, bool canReports) {
    if (shellIndex == 4 || shellIndex == 5 || shellIndex == 6) return true;
    if (shellIndex == 0 || shellIndex == 1) return true;
    if (canReports && shellIndex == 2) return true;
    return false;
  }



  @override

  Widget build(BuildContext context, WidgetRef ref) {

    final theme = Theme.of(context);

    final scheme = theme.colorScheme;

    final l10n = AppLocalizations.of(context)!;

    final location = GoRouterState.of(context).matchedLocation;

    final wide = MediaQuery.sizeOf(context).width >= 900;

    final canReports = ref.watch(canReadReportsProvider);

    final shellIndex = _shellIndexForLocation(location);

    void go(String path) => context.go(path);



    Future<void> signOut() async {

      await ref.read(localDataServiceProvider).clearAllUserData();

      await ref.read(authRepositoryProvider.notifier).logout();

      if (context.mounted) {

        context.go('/login');

      }

    }



    final showBottomNav = _showBottomNav(shellIndex, canReports);

    final bottomIndex = _bottomNavIndex(location, canReports);



    final railDestinations = <NavigationRailDestination>[

      NavigationRailDestination(

        icon: const Icon(Icons.dashboard_outlined),

        selectedIcon: const Icon(Icons.dashboard),

        label: Text(l10n.navDashboard),

      ),

      NavigationRailDestination(

        icon: const Icon(Icons.checklist_outlined),

        selectedIcon: const Icon(Icons.checklist),

        label: Text(l10n.navRailTasks),

      ),

      if (canReports)

        NavigationRailDestination(

          icon: const Icon(Icons.bar_chart_outlined),

          selectedIcon: const Icon(Icons.bar_chart),

          label: Text(l10n.navRailReports),

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

        icon: const Icon(Icons.dashboard_outlined),

        selectedIcon: const Icon(Icons.dashboard),

        label: l10n.navDashboard,

      ),

      NavigationDestination(

        icon: const Icon(Icons.checklist_outlined),

        selectedIcon: const Icon(Icons.checklist),

        label: l10n.navMyTasks,

      ),

      if (canReports)

        NavigationDestination(

          icon: const Icon(Icons.bar_chart_outlined),

          selectedIcon: const Icon(Icons.bar_chart),

          label: l10n.navReports,

        ),

    ];



  final bottomPaths = <String>[

      '/dashboard',

      '/my-tasks',

      if (canReports) '/reports',

    ];



    return Scaffold(

      appBar: wide

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

                Consumer(

                  builder: (context, ref, _) {

                    final profile = ref.watch(authRepositoryProvider).valueOrNull?.profile;

                    return Padding(

                      padding: const EdgeInsets.only(right: 4),

                      child: AppProfileAvatarButton(profile: profile),

                    );

                  },

                ),

                Consumer(

                  builder: (context, ref, _) {

                    final out = ref.watch(pendingOutboxCountProvider);

                    final ev = ref.watch(pendingEvidenceCountProvider);

                    final n = out.maybeWhen(data: (v) => v, orElse: () => 0) +

                        ev.maybeWhen(data: (v) => v, orElse: () => 0);

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

                          avatar: Icon(Icons.cloud_upload_outlined, size: 18, color: scheme.primary),

                          label: Text('$n', style: TextStyle(color: scheme.onSurface, fontWeight: FontWeight.w600)),

                        ),

                      ),

                    );

                  },

                ),

              ],

            )

          : null,

      bottomNavigationBar: showBottomNav

          ? NavigationBar(

              selectedIndex: bottomIndex.clamp(0, bottomDestinations.length - 1),

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

          Expanded(

            child: wide

                ? child

                : SafeArea(

                    bottom: false,

                    child: child,

                  ),

          ),

        ],

      ),

    );

  }

}


