import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/i18n/relative_time.dart';
import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/dio_provider.dart';
import '../../auth/application/auth_repository.dart';
import '../application/notification_presentation.dart';
import '../application/notifications_unread_provider.dart';

class NotificationsPage extends StatefulWidget {
  const NotificationsPage({super.key});

  @override
  State<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends State<NotificationsPage>
    with WidgetsBindingObserver {
  List<NotificationItem> _items = const [];
  String? _error;
  bool _loading = true;
  bool _markingAll = false;
  Worker? _revisionWorker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    final unread = Get.find<NotificationsUnreadController>();
    _revisionWorker = ever(unread.revision, (_) {
      if (!mounted) return;
      unawaited(_load(silent: true));
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _revisionWorker?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_load(silent: true));
      unawaited(Get.find<NotificationsUnreadController>().refreshCount());
    }
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<List<dynamic>>('/notifications');
      final raw = res.data ?? const [];
      final items =
          raw
              .whereType<Map>()
              .map(
                (m) => NotificationItem.fromJson(Map<String, dynamic>.from(m)),
              )
              .toList();
      if (mounted) {
        setState(() {
          _items = items;
          _loading = false;
          _error = null;
        });
      }
      await Get.find<NotificationsUnreadController>().refreshCount();
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _error = e is DioException ? (e.message ?? '$e') : '$e';
          _loading = false;
        });
      }
    }
  }

  Future<void> _markRead(String id) async {
    final idx = _items.indexWhere((n) => n.id == id);
    if (idx < 0) return;
    final wasUnread = !_items[idx].read;
    if (wasUnread) {
      setState(() {
        _items = [
          for (var i = 0; i < _items.length; i++)
            if (i == idx)
              NotificationItem(
                id: _items[i].id,
                type: _items[i].type,
                title: _items[i].title,
                body: _items[i].body,
                read: true,
                createdAt: _items[i].createdAt,
                metadata: _items[i].metadata,
              )
            else
              _items[i],
        ];
      });
      final unread = Get.find<NotificationsUnreadController>().count.value;
      if (unread > 0) {
        Get.find<NotificationsUnreadController>().setCount(unread - 1);
      }
    }
    try {
      await Get.find<ApiClient>().dio.patch<void>('/notifications/$id/read');
    } catch (_) {
      if (wasUnread && mounted) {
        await _load();
      }
    }
  }

  Future<void> _markAllRead() async {
    if (_markingAll) return;
    setState(() => _markingAll = true);
    setState(() {
      _items = [
        for (final n in _items)
          NotificationItem(
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            read: true,
            createdAt: n.createdAt,
            metadata: n.metadata,
          ),
      ];
    });
    Get.find<NotificationsUnreadController>().setCount(0);
    try {
      await Get.find<ApiClient>().dio.patch<void>('/notifications/read-all');
    } catch (_) {
      await _load();
    } finally {
      if (mounted) {
        setState(() => _markingAll = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final profile = Get.find<AuthController>().currentSession?.profile;
    final unread = Get.find<NotificationsUnreadController>().count.value;
    final sections = groupNotifications(_items);

    return ColoredBox(
      color: scheme.surface,
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            AppMobileTopBar(profile: profile),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.notificationsTitle,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.notificationsSubtitle,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                ),
                if (unread > 0)
                  TextButton(
                    onPressed: _markingAll ? null : _markAllRead,
                    child: Text(
                      _markingAll
                          ? l10n.notificationsMarkingAll
                          : l10n.notificationsMarkAllRead,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: scheme.primary,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 48),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Column(
                  children: [
                    Text(_error!, style: TextStyle(color: scheme.error)),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _load,
                      child: Text(l10n.dashboardRetry),
                    ),
                  ],
                ),
              )
            else if (_items.isEmpty)
              _EmptyNotifications(l10n: l10n)
            else
              ...sections.map(
                (section) => _NotificationSectionView(
                  section: section,
                  l10n: l10n,
                  locale: locale,
                  onMarkRead: _markRead,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _EmptyNotifications extends StatelessWidget {
  const _EmptyNotifications({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(32),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(
            Icons.notifications_none_outlined,
            size: 48,
            color: scheme.onSurfaceVariant,
          ),
          const SizedBox(height: 12),
          Text(
            l10n.notificationsEmpty,
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 4),
          Text(
            l10n.notificationsEmptyHint,
            textAlign: TextAlign.center,
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _NotificationSectionView extends StatelessWidget {
  const _NotificationSectionView({
    required this.section,
    required this.l10n,
    required this.locale,
    required this.onMarkRead,
  });

  final NotificationSection section;
  final AppLocalizations l10n;
  final String locale;
  final Future<void> Function(String id) onMarkRead;

  String _sectionTitle() {
    switch (section.key) {
      case NotificationSectionKey.newAlerts:
        return l10n.notificationsSectionNewAlerts;
      case NotificationSectionKey.yesterday:
        return l10n.notificationsSectionYesterday(
          formatYesterdaySectionLabel(locale),
        );
      case NotificationSectionKey.earlier:
        return l10n.notificationsSectionEarlier;
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 10),
            child: Row(
              children: [
                if (section.key == NotificationSectionKey.newAlerts) ...[
                  Container(
                    width: 8,
                    height: 8,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      color: scheme.primary,
                      shape: BoxShape.circle,
                    ),
                  ),
                ],
                Text(
                  _sectionTitle().toUpperCase(),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.2,
                    color:
                        section.key == NotificationSectionKey.newAlerts
                            ? scheme.primary
                            : scheme.onSurfaceVariant.withValues(alpha: 0.7),
                  ),
                ),
              ],
            ),
          ),
          ...section.items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _NotificationCard(
                item: item,
                l10n: l10n,
                locale: locale,
                onMarkRead: () => onMarkRead(item.id),
                onOpenTask: () async {
                  final taskId =
                      NotificationMetadata.parse(item.metadata).taskId;
                  if (taskId == null) return;
                  await onMarkRead(item.id);
                  if (context.mounted) {
                    context.push('/tasks/$taskId');
                  }
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  const _NotificationCard({
    required this.item,
    required this.l10n,
    required this.locale,
    required this.onMarkRead,
    this.onOpenTask,
  });

  final NotificationItem item;
  final AppLocalizations l10n;
  final String locale;
  final VoidCallback onMarkRead;
  final Future<void> Function()? onOpenTask;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final meta = NotificationMetadata.parse(item.metadata);
    final visual = notificationVisual(item.type, scheme);
    final typeLabel = notificationTypeLabel(item.type, l10n);
    final title = item.title.isNotEmpty ? item.title : typeLabel;
    final isUnread = !item.read;
    final showActions =
        isUnread && onOpenTask != null && item.type == 'TASK_ASSIGNED';
    final statusLabel = statusLabelForNotification(meta.status, l10n, scheme);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap:
            onOpenTask != null
                ? () => onOpenTask!()
                : (isUnread ? onMarkRead : null),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color:
                isUnread
                    ? scheme.primary.withValues(alpha: 0.05)
                    : scheme.surface.withValues(alpha: item.read ? 0.5 : 1),
            borderRadius: BorderRadius.circular(12),
            border: Border(
              left:
                  isUnread
                      ? BorderSide(color: scheme.primary, width: 4)
                      : BorderSide.none,
              top: BorderSide(
                color: scheme.outlineVariant.withValues(
                  alpha: item.read ? 0.5 : 1,
                ),
              ),
              right: BorderSide(
                color: scheme.outlineVariant.withValues(
                  alpha: item.read ? 0.5 : 1,
                ),
              ),
              bottom: BorderSide(
                color: scheme.outlineVariant.withValues(
                  alpha: item.read ? 0.5 : 1,
                ),
              ),
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: visual.backgroundColor,
                  shape: BoxShape.circle,
                ),
                child: Icon(visual.icon, size: 22, color: visual.iconColor),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            title,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          formatRelativeTime(item.createdAt, locale),
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontSize: 11,
                          ),
                        ),
                        if (isUnread) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 8,
                            height: 8,
                            decoration: BoxDecoration(
                              color: scheme.primary,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (item.body != null && item.body!.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        item.body!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                          height: 1.4,
                        ),
                      ),
                    ],
                    if (statusLabel != null) ...[
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            l10n.notificationsStatusChanged,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: scheme.tertiaryFixed,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusLabel.toUpperCase(),
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                fontSize: 9,
                                color: scheme.onTertiaryFixed,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    if (meta.threadTitle != null || meta.taskTitle != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: scheme.surfaceContainerLow,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: scheme.outlineVariant.withValues(
                              alpha: 0.35,
                            ),
                          ),
                        ),
                        child: Text(
                          meta.threadTitle != null
                              ? l10n.notificationsThreadLabel(meta.threadTitle!)
                              : meta.taskTitle!,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ],
                    if (showActions) ...[
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: [
                          FilledButton(
                            onPressed: onOpenTask,
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(0, 32),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              textStyle: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            child: Text(l10n.notificationsViewDetails),
                          ),
                          OutlinedButton(
                            onPressed: onMarkRead,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(0, 32),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              textStyle: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            child: Text(l10n.notificationsDismiss),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
