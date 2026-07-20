import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../features/notifications/application/notifications_unread_provider.dart';
import '../branding/app_logo.dart';

/// Avatar del usuario; navega a `/profile` al pulsar.
class AppProfileAvatarButton extends StatelessWidget {
  const AppProfileAvatarButton({super.key, this.profile});

  final Map<String, dynamic>? profile;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final first = '${profile?['firstName'] ?? ''}'.trim();
    final last = '${profile?['lastName'] ?? ''}'.trim();
    final initials =
        '${first.isNotEmpty ? first[0] : ''}${last.isNotEmpty ? last[0] : ''}'
            .toUpperCase();
    final path = GoRouterState.of(context).uri.path;
    final onProfile = path == '/profile';

    return IconButton(
      tooltip: l10n.navProfile,
      onPressed: onProfile ? null : () => GoRouter.of(context).go('/profile'),
      padding: EdgeInsets.zero,
      constraints: const BoxConstraints.tightFor(width: 40, height: 40),
      icon: CircleAvatar(
        radius: 18,
        backgroundColor:
            onProfile
                ? scheme.primary.withValues(alpha: 0.2)
                : scheme.primaryContainer.withValues(alpha: 0.35),
        foregroundColor: scheme.primary,
        child: Text(
          initials.isNotEmpty ? initials : '?',
          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
        ),
      ),
    );
  }
}

/// Cabecera móvil alineada a maquetas TaskForge (logo, notificaciones, ajustes, perfil).
class AppMobileTopBar extends StatelessWidget {
  const AppMobileTopBar({super.key, this.profile});

  final Map<String, dynamic>? profile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final onNotifications =
        GoRouterState.of(context).uri.path == '/notifications';

    return Obx(() {
      final unread = Get.find<NotificationsUnreadController>().count.value;
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Row(
          children: [
            const AppLogo(size: 32),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                l10n.appTitle,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: scheme.primary,
                  height: 1.1,
                ),
              ),
            ),
            IconButton(
              tooltip: l10n.notificationsTitle,
              onPressed:
                  onNotifications
                      ? null
                      : () => GoRouter.of(context).go('/notifications'),
              icon: Badge(
                isLabelVisible: unread > 0,
                label: Text(unread > 99 ? '99+' : '$unread'),
                child: Icon(
                  onNotifications
                      ? Icons.notifications
                      : Icons.notifications_outlined,
                  color:
                      onNotifications
                          ? scheme.primary
                          : scheme.onSurfaceVariant,
                ),
              ),
            ),
            IconButton(
              tooltip: l10n.navSettings,
              onPressed: () => GoRouter.of(context).go('/settings'),
              icon: Icon(
                Icons.settings_outlined,
                color: scheme.onSurfaceVariant,
              ),
            ),
            AppProfileAvatarButton(profile: profile),
          ],
        ),
      );
    });
  }
}
