import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';

import '../../../core/i18n/relative_time.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/offline/offline_providers.dart';
import '../../../core/realtime/realtime_service.dart';
import '../../../core/layout/app_mobile_top_bar.dart';
import '../../auth/application/auth_repository.dart';
import 'activity_presentation.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  Map<String, dynamic>? _data;
  int _assignedToMe = 0;
  String? _error;
  bool _loading = true;
  bool _fromCache = false;
  StreamSubscription<Map<String, Object?>>? _realtimeSub;

  static const _realtimeTriggers = {
    'task.created',
    'task.status_changed',
    'task.assigned',
    'comment.created',
    'dashboard.refresh',
    'notification',
  };

  @override
  void initState() {
    super.initState();
    _realtimeSub = Get.find<RealtimeService>().eventStream.listen((msg) {
      final name = msg['event'] as String?;
      if (name == null || !_realtimeTriggers.contains(name)) {
        return;
      }
      if (mounted) {
        _load();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _load();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    super.dispose();
  }

  static num _asNum(dynamic v, [num fallback = 0]) {
    if (v == null) {
      return fallback;
    }
    if (v is num) {
      return v;
    }
    return num.tryParse(v.toString()) ?? fallback;
  }

  static Map<String, dynamic> _asStatusMap(dynamic v) {
    if (v is! Map) {
      return {};
    }
    return v.map((k, val) => MapEntry('$k', val));
  }

  String _formatError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final m = data['message'];
        if (m is String && m.isNotEmpty) {
          return m;
        }
        if (m is List) {
          return m.map((x) => '$x').join(', ');
        }
      }
      return e.message ?? '$e';
    }
    return '$e';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await Get.find<OutboxSyncService>().processQueue();
      final dio = Get.find<ApiClient>().dio;
      final userId = Get.find<AuthController>().currentUserId;

      final summaryRes = await dio.get<Map<String, dynamic>>(
        '/dashboard/summary',
        queryParameters: const {'period': 'weekly'},
      );
      final data = summaryRes.data;
      if (data != null) {
        await Get.find<LocalDataService>().saveDashboard(data);
      }

      var assigned = 0;
      try {
        final profileRes = await dio.get<Map<String, dynamic>>(
          '/users/me/profile',
        );
        final stats = profileRes.data?['stats'];
        if (stats is Map) {
          assigned = _asNum(stats['openAssignments']).toInt();
        }
      } catch (_) {
        if (userId != null) {
          try {
            final tasksRes = await dio.get<List<dynamic>>(
              '/tasks',
              queryParameters: {'assigneeId': userId, 'rootOnly': false},
            );
            final raw = tasksRes.data;
            if (raw is List) {
              assigned =
                  raw.where((t) {
                    if (t is! Map) return false;
                    final status = '${t['status'] ?? ''}';
                    return status != 'COMPLETED';
                  }).length;
            }
          } catch (_) {
            assigned = 0;
          }
        }
      }

      if (mounted) {
        setState(() {
          _data = data ?? <String, dynamic>{};
          _assignedToMe = assigned;
          _fromCache = false;
        });
      }
    } catch (e) {
      final cached = await Get.find<LocalDataService>().readDashboard();
      if (cached != null) {
        if (mounted) {
          setState(() {
            _data = cached;
            _error = null;
            _fromCache = true;
          });
        }
      } else if (mounted) {
        setState(() => _error = _formatError(e));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final wide = MediaQuery.sizeOf(context).width >= 900;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: _load, child: Text(l10n.dashboardRetry)),
          ],
        ),
      );
    }

    final d = _data;
    final urgent = _asNum(d?['urgent']);
    final total = _asNum(d?['tasksTotal']);
    final byStatus = _asStatusMap(d?['tasksByStatus']);
    final completed = _asNum(byStatus['COMPLETED']);
    final outputPercent = total > 0 ? ((completed / total) * 100).round() : 0;
    final trend = d?['trendPercent'];
    final profile = Get.find<AuthController>().currentSession?.profile;
    String? firstName;
    final rawName = profile?['firstName'];
    if (rawName is String && rawName.trim().isNotEmpty) {
      firstName = rawName.trim();
    }
    final greeting = dashboardGreeting(locale, firstName);
    final recentRaw = d?['recentActivity'];
    final activities = recentRaw is List ? recentRaw : const [];

    return Stack(
      children: [
        RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: EdgeInsets.fromLTRB(20, wide ? 16 : 8, 20, 120),
            children: [
              if (!wide) AppMobileTopBar(profile: profile),
              if (_fromCache) ...[
                MaterialBanner(
                  content: Text(l10n.dashboardOfflineBanner),
                  leading: Icon(
                    Icons.cloud_off_outlined,
                    color: scheme.primary,
                  ),
                  actions: [
                    TextButton(
                      onPressed: _load,
                      child: Text(l10n.dashboardRefresh),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],
              Text(
                greeting,
                style: theme.textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.01,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                l10n.dashboardTagline,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                  height: 1.35,
                ),
              ),
              const SizedBox(height: 22),
              _BentoUrgentCard(urgent: urgent, l10n: l10n),
              const SizedBox(height: 12),
              _BentoAssignedCard(count: _assignedToMe, l10n: l10n),
              const SizedBox(height: 12),
              _BentoWeeklyOutputCard(
                percent: outputPercent,
                trendPercent: trend is num ? trend.toInt() : null,
                l10n: l10n,
              ),
              const SizedBox(height: 28),
              _RecentActivitySection(
                l10n: l10n,
                locale: locale,
                activities: activities,
              ),
            ],
          ),
        ),
        if (!wide)
          Positioned(
            right: 20,
            bottom: 20,
            child: FloatingActionButton(
              tooltip: l10n.dashboardQuickAction,
              onPressed: () => context.push('/tasks/new'),
              child: const Icon(Icons.add, size: 28),
            ),
          ),
      ],
    );
  }
}

class _BentoUrgentCard extends StatelessWidget {
  const _BentoUrgentCard({required this.urgent, required this.l10n});

  final num urgent;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final n = urgent.toInt();

    return Material(
      color: scheme.surfaceContainerLowest,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: scheme.errorContainer,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.priority_high,
                    color: scheme.onErrorContainer,
                    size: 22,
                  ),
                ),
                if (n > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: scheme.error,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      l10n.dashboardCriticalBadge,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: scheme.onError,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        fontSize: 10,
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              l10n.dashboardUrgentTitle,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              n.toString().padLeft(2, '0'),
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: scheme.error,
                height: 1,
              ),
            ),
            const SizedBox(height: 12),
            Divider(color: scheme.outlineVariant, height: 1),
            const SizedBox(height: 8),
            _CardCta(
              label: l10n.dashboardUrgentCta,
              color: scheme.primary,
              onTap: () => context.go('/my-tasks'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BentoAssignedCard extends StatelessWidget {
  const _BentoAssignedCard({required this.count, required this.l10n});

  final int count;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;

    return Material(
      color: scheme.primary,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.primaryContainer),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: scheme.onPrimary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.assignment_ind,
                color: scheme.onPrimary,
                size: 22,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.dashboardAssignedTitle,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: scheme.onPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              count.toString().padLeft(2, '0'),
              style: theme.textTheme.displaySmall?.copyWith(
                fontWeight: FontWeight.w800,
                color: scheme.onPrimary,
                height: 1,
              ),
            ),
            const SizedBox(height: 12),
            Divider(color: scheme.onPrimary.withValues(alpha: 0.25), height: 1),
            const SizedBox(height: 8),
            _CardCta(
              label: l10n.dashboardAssignedCta,
              color: scheme.onPrimary,
              onTap: () => context.go('/my-tasks'),
            ),
          ],
        ),
      ),
    );
  }
}

class _BentoWeeklyOutputCard extends StatelessWidget {
  const _BentoWeeklyOutputCard({
    required this.percent,
    required this.trendPercent,
    required this.l10n,
  });

  final int percent;
  final int? trendPercent;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final clamped = percent.clamp(0, 100);

    return Material(
      color: scheme.surfaceContainer,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: scheme.tertiaryContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(
                Icons.query_stats,
                color: scheme.onTertiaryContainer,
                size: 22,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              l10n.dashboardOutputTitle,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '$clamped%',
                  style: theme.textTheme.displaySmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    height: 1,
                  ),
                ),
                if (trendPercent != null) ...[
                  const SizedBox(width: 8),
                  Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      trendPercent! >= 0
                          ? l10n.dashboardOutputTrend('${trendPercent!.abs()}')
                          : '−${trendPercent!.abs()}%',
                      style: theme.textTheme.labelLarge?.copyWith(
                        color: scheme.tertiary,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 16),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: clamped / 100,
                minHeight: 6,
                backgroundColor: scheme.outlineVariant,
                color: scheme.tertiary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CardCta extends StatelessWidget {
  const _CardCta({
    required this.label,
    required this.color,
    required this.onTap,
  });

  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w700,
                  fontSize: 12,
                ),
              ),
            ),
            Icon(Icons.chevron_right, size: 18, color: color),
          ],
        ),
      ),
    );
  }
}

class _RecentActivitySection extends StatelessWidget {
  const _RecentActivitySection({
    required this.l10n,
    required this.locale,
    required this.activities,
  });

  final AppLocalizations l10n;
  final String locale;
  final List<dynamic> activities;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final items = <Widget>[];

    for (var i = 0; i < activities.length && i < 8; i++) {
      final raw = activities[i];
      if (raw is! Map) {
        continue;
      }
      final entry = Map<String, dynamic>.from(raw);
      items.add(_ActivityTile(entry: entry, locale: locale, l10n: l10n));
      if (i < activities.length - 1 && i < 7) {
        items.add(Divider(height: 1, color: scheme.outlineVariant));
      }
    }

    return Material(
      color: scheme.surfaceContainerLowest,
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerLow,
              border: Border(bottom: BorderSide(color: scheme.outlineVariant)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  l10n.dashboardRecentActivity,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                TextButton(
                  onPressed: () => context.go('/my-tasks'),
                  child: Text(
                    l10n.dashboardSeeAll,
                    style: theme.textTheme.labelLarge?.copyWith(
                      color: scheme.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (items.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                '—',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            )
          else
            ...items,
        ],
      ),
    );
  }
}

class _ActivityTile extends StatelessWidget {
  const _ActivityTile({
    required this.entry,
    required this.locale,
    required this.l10n,
  });

  final Map<String, dynamic> entry;
  final String locale;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final action = '${entry['action'] ?? ''}';
    final visual = activityVisual(action, scheme);
    final createdAt = DateTime.tryParse('${entry['createdAt'] ?? ''}');
    final timeLabel =
        createdAt != null
            ? formatRelativeTime(createdAt, locale).toUpperCase()
            : '';
    final message = activityMessage(l10n, entry);
    final taskId = activityTaskId(entry);

    return InkWell(
      onTap: taskId != null ? () => context.push('/tasks/$taskId') : null,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: visual.background,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Icon(visual.icon, size: 22, color: visual.foreground),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    message,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurface,
                      height: 1.35,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  if (timeLabel.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      timeLabel,
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        fontSize: 10,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
