import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:path_provider/path_provider.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/offline/offline_providers.dart';
import '../../auth/application/auth_repository.dart';
import '../../evidence/application/evidence_upload_worker.dart';
import '../application/reports_sync_queue.dart';

/// Reportes móviles (`assets/taskforge_reportes_y_sincronizaci_n`).
class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key});

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  late final ReportsSyncQueueController _syncQueue;
  late final Worker _syncQueueWorker;
  late final Worker _connectivityWorker;
  Map<String, dynamic>? _overview;
  String? _error;
  bool _loading = true;
  bool _syncing = false;
  bool _exporting = false;
  DateTime? _lastCacheAt;

  @override
  void initState() {
    super.initState();
    _syncQueue = Get.put(ReportsSyncQueueController());
    _syncQueueWorker = ever(_syncQueue.items, (_) {
      if (mounted) setState(() {});
    });
    _connectivityWorker = ever(Get.find<ConnectivityService>().online, (_) {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _syncQueueWorker.dispose();
    _connectivityWorker.dispose();
    Get.delete<ReportsSyncQueueController>();
    super.dispose();
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

  static num _parseAvgHours(dynamic raw) {
    if (raw == null) {
      return 0;
    }
    if (raw is num) {
      return raw;
    }
    if (raw is Map) {
      return _num(raw['averageCompletionHours']);
    }
    return 0;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<Map<String, dynamic>>('/reports/overview');
      final cacheAt = await Get.find<LocalDataService>().lastCacheUpdatedAt();
      if (mounted) {
        setState(() {
          _overview = res.data;
          _lastCacheAt = cacheAt;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = _formatError(e);
          _loading = false;
        });
      }
    }
  }

  Future<void> _forceSync() async {
    if (!Get.find<ConnectivityService>().online.value) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.reportsSyncOffline),
          ),
        );
      }
      return;
    }
    setState(() => _syncing = true);
    try {
      await Get.find<OutboxSyncService>().processQueue();
      await Get.find<EvidenceUploadWorker>().processPending();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(AppLocalizations.of(context)!.reportsSyncDone),
          ),
        );
      }
      await _load();
    } finally {
      if (mounted) {
        setState(() => _syncing = false);
      }
    }
  }

  Future<void> _export(String kind) async {
    final l10n = AppLocalizations.of(context)!;
    final productivity = _overview?['productivity'];
    final period = productivity is Map ? productivity['period'] : null;
    final from = period is Map ? period['from']?.toString() : null;
    final to = period is Map ? period['to']?.toString() : null;
    if (from == null || to == null) {
      return;
    }

    setState(() => _exporting = true);
    try {
      final dio = Get.find<ApiClient>().dio;
      final path =
          kind == 'pdf' ? '/reports/export/pdf' : '/reports/export/xlsx';
      final res = await dio.get<List<int>>(
        path,
        queryParameters: {'from': from, 'to': to},
        options: Options(responseType: ResponseType.bytes),
      );
      final bytes = res.data;
      if (bytes == null || bytes.isEmpty) {
        throw StateError('empty');
      }
      final dir = await getApplicationDocumentsDirectory();
      final ext = kind == 'pdf' ? 'pdf' : 'xlsx';
      final file = File(
        '${dir.path}/taskforge-report-${DateTime.now().millisecondsSinceEpoch}.$ext',
      );
      await file.writeAsBytes(bytes, flush: true);
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.reportsExportSaved)));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.reportsExportFailed)));
      }
    } finally {
      if (mounted) {
        setState(() => _exporting = false);
      }
    }
  }

  void _showExportSheet() {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.reportsExportReport,
                style: Theme.of(ctx).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              _ExportOption(
                icon: Icons.picture_as_pdf_outlined,
                iconColor: scheme.error,
                title: l10n.reportsExportPdf,
                subtitle: l10n.reportsExportPdfHint,
                onTap: _exporting ? null : () => _export('pdf'),
              ),
              const SizedBox(height: 8),
              _ExportOption(
                icon: Icons.table_chart_outlined,
                iconColor: scheme.tertiary,
                title: l10n.reportsExportExcel,
                subtitle: l10n.reportsExportExcelHint,
                onTap: _exporting ? null : () => _export('xlsx'),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.reportsExportCycleNote,
                textAlign: TextAlign.center,
                style: Theme.of(
                  ctx,
                ).textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final profile = Get.find<AuthController>().currentSession?.profile;
    final syncItems = _syncQueue.items;
    final online = Get.find<ConnectivityService>().online.value;

    final productivity = _overview?['productivity'];
    final summary = _overview?['summary'];
    final productivityMap = productivity is Map ? productivity : null;
    final summaryMap = summary is Map ? summary : null;
    final byDept = _parseDepartmentList(_overview?['byDepartment']);

    final efficiency = _num(productivityMap?['completionRatePercent']);
    final completed = _num(productivityMap?['tasksCompletedInPeriod']).round();
    final created = _num(productivityMap?['tasksCreatedInPeriod']).round();
    final target = created > 0 ? (created * 1.15).round() : 1500;
    final avgHours = _parseAvgHours(_overview?['averageCompletionHours']);
    final efficiencyDelta = _numOrNull(summaryMap?['efficiencyDeltaPercent']);

    final deptRows = _departmentRows(byDept);
    final syncList = syncItems.toList(growable: false);

    return ColoredBox(
      color: scheme.surface,
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
          children: [
            AppMobileTopBar(profile: profile),
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  l10n.reportsDashboardTitle,
                  style: theme.textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.reportsDashboardSubtitle,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.icon(
                    onPressed:
                        _overview == null || _exporting
                            ? null
                            : _showExportSheet,
                    icon:
                        _exporting
                            ? SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: scheme.onPrimary,
                              ),
                            )
                            : const Icon(Icons.ios_share, size: 18),
                    label: Text(l10n.reportsExportReport),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 32),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_error != null)
              MaterialBanner(
                content: Text(_error!),
                actions: [
                  TextButton(
                    onPressed: _load,
                    child: Text(l10n.dashboardRetry),
                  ),
                ],
              )
            else if (_overview != null) ...[
              _KpiGrid(
                efficiency: efficiency,
                efficiencyDelta: efficiencyDelta,
                completed: completed,
                target: target,
                avgHours: avgHours,
                l10n: l10n,
              ),
              const SizedBox(height: 20),
              _DepartmentCard(rows: deptRows, l10n: l10n),
              const SizedBox(height: 16),
              _SyncQueueCard(
                items: syncList,
                syncing: _syncing,
                onForceSync: _forceSync,
                l10n: l10n,
              ),
              const SizedBox(height: 16),
              _SystemHealthCard(
                online: online,
                lastCacheAt: _lastCacheAt,
                l10n: l10n,
              ),
            ],
          ],
        ),
      ),
    );
  }

  static num _num(dynamic v, [num fallback = 0]) {
    if (v == null) {
      return fallback;
    }
    if (v is num) {
      return v;
    }
    return num.tryParse(v.toString()) ?? fallback;
  }

  static num? _numOrNull(dynamic v) {
    if (v == null) {
      return null;
    }
    if (v is num) {
      return v;
    }
    return num.tryParse(v.toString());
  }

  static List<Map<String, dynamic>> _parseDepartmentList(dynamic raw) {
    if (raw is! List) {
      return const [];
    }
    return raw
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
  }

  List<_DeptRow> _departmentRows(List<Map<String, dynamic>> rows) {
    if (rows.isEmpty) {
      return const [];
    }
    final total = rows.fold<num>(0, (s, r) => s + _num(r['tasksTotal']));
    final safeTotal = total > 0 ? total : 1;
    final sorted = [...rows]
      ..sort((a, b) => _num(b['tasksTotal']).compareTo(_num(a['tasksTotal'])));
    return sorted.take(6).map((r) {
      final pct = ((_num(r['tasksTotal']) / safeTotal) * 100).round().clamp(
        0,
        100,
      );
      return _DeptRow(name: '${r['departmentName'] ?? '—'}', percent: pct);
    }).toList();
  }
}

class _DeptRow {
  const _DeptRow({required this.name, required this.percent});
  final String name;
  final int percent;
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({
    required this.efficiency,
    required this.efficiencyDelta,
    required this.completed,
    required this.target,
    required this.avgHours,
    required this.l10n,
  });

  final num efficiency;
  final num? efficiencyDelta;
  final int completed;
  final int target;
  final num avgHours;
  final AppLocalizations l10n;

  String _formatAvg(num hours) {
    if (hours <= 0) {
      return '—';
    }
    if (hours < 1) {
      return '${(hours * 60).round()}m';
    }
    if (hours < 24) {
      final h = hours.floor();
      final m = ((hours - h) * 60).round();
      return m > 0 ? '${h}h ${m}m' : '${h}h';
    }
    return '${hours.toStringAsFixed(1)}h';
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final delta = efficiencyDelta;
    final trendUp = delta != null && delta >= 0;

    return Column(
      children: [
        _KpiCard(
          label: l10n.reportsEfficiencyLabel,
          value: '${efficiency.toStringAsFixed(1)}%',
          valueColor: scheme.primary,
          icon: Icons.bolt,
          footer:
              delta != null
                  ? Row(
                    children: [
                      Icon(
                        trendUp ? Icons.trending_up : Icons.trending_down,
                        size: 14,
                        color: trendUp ? scheme.tertiary : scheme.error,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        trendUp
                            ? l10n.reportsEfficiencyTrendUp(
                              delta.abs().toStringAsFixed(1),
                            )
                            : l10n.reportsEfficiencyTrendDown(
                              delta.abs().toStringAsFixed(1),
                            ),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: trendUp ? scheme.tertiary : scheme.error,
                        ),
                      ),
                    ],
                  )
                  : null,
        ),
        const SizedBox(height: 12),
        _KpiCard(
          label: l10n.reportsTasksCompletedLabel,
          value: '$completed',
          icon: Icons.task_alt,
          footer: Text(
            l10n.reportsTasksTarget(target),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: scheme.onSurfaceVariant,
            ),
          ),
        ),
        const SizedBox(height: 12),
        _KpiCard(
          label: l10n.reportsAvgTimeLabel,
          value: _formatAvg(avgHours),
          icon: Icons.schedule,
          footer:
              avgHours > 0
                  ? Row(
                    children: [
                      Icon(Icons.trending_down, size: 14, color: scheme.error),
                      const SizedBox(width: 4),
                      Text(
                        l10n.reportsAvgTimeDelay(
                          (avgHours * 12).round().clamp(1, 999),
                        ),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: scheme.error,
                        ),
                      ),
                    ],
                  )
                  : null,
        ),
      ],
    );
  }
}

class _KpiCard extends StatelessWidget {
  const _KpiCard({
    required this.label,
    required this.value,
    required this.icon,
    this.valueColor,
    this.footer,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? valueColor;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      height: 128,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Positioned.fill(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label.toUpperCase(),
                      style: themeLabelStyle(context, scheme.onSurfaceVariant),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      value,
                      style: Theme.of(
                        context,
                      ).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: valueColor ?? scheme.onSurface,
                        height: 1,
                      ),
                    ),
                  ],
                ),
                if (footer != null) footer!,
              ],
            ),
          ),
          Positioned(
            right: -8,
            bottom: -8,
            child: Icon(
              icon,
              size: 80,
              color: scheme.onSurface.withValues(alpha: 0.06),
            ),
          ),
        ],
      ),
    );
  }
}

TextStyle themeLabelStyle(BuildContext context, Color color) {
  return Theme.of(context).textTheme.labelSmall!.copyWith(
    fontWeight: FontWeight.w700,
    letterSpacing: 0.6,
    color: color,
  );
}

class _DepartmentCard extends StatelessWidget {
  const _DepartmentCard({required this.rows, required this.l10n});

  final List<_DeptRow> rows;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final barColors = [
      scheme.primary,
      scheme.tertiaryContainer,
      scheme.error,
      scheme.inversePrimary,
      scheme.secondary,
      scheme.primaryContainer,
    ];

    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    l10n.reportsDeptPerformance,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                Icon(
                  Icons.filter_list,
                  color: scheme.onSurfaceVariant,
                  size: 22,
                ),
              ],
            ),
          ),
          Divider(height: 1, color: scheme.outlineVariant),
          Padding(
            padding: const EdgeInsets.all(16),
            child:
                rows.isEmpty
                    ? Text(
                      l10n.reportsNoDeptData,
                      style: TextStyle(color: scheme.onSurfaceVariant),
                    )
                    : Column(
                      children: [
                        for (var i = 0; i < rows.length; i++) ...[
                          if (i > 0) const SizedBox(height: 20),
                          _DeptBar(
                            name: rows[i].name,
                            percent: rows[i].percent,
                            color: barColors[i % barColors.length],
                            l10n: l10n,
                          ),
                        ],
                      ],
                    ),
          ),
        ],
      ),
    );
  }
}

class _DeptBar extends StatelessWidget {
  const _DeptBar({
    required this.name,
    required this.percent,
    required this.color,
    required this.l10n,
  });

  final String name;
  final int percent;
  final Color color;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
            Text(
              l10n.reportsCapacity(percent),
              style: TextStyle(fontSize: 13, color: scheme.onSurfaceVariant),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: percent / 100,
            minHeight: 8,
            backgroundColor: scheme.surfaceContainerHigh,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _SyncQueueCard extends StatelessWidget {
  const _SyncQueueCard({
    required this.items,
    required this.syncing,
    required this.onForceSync,
    required this.l10n,
  });

  final List<SyncQueueItem> items;
  final bool syncing;
  final VoidCallback onForceSync;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surfaceContainerHigh.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.cloud_sync, color: scheme.primary, size: 22),
                const SizedBox(width: 8),
                Text(
                  l10n.reportsSyncQueue,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (items.isEmpty)
              Text(
                l10n.reportsSyncDone,
                style: TextStyle(color: scheme.onSurfaceVariant, fontSize: 13),
              )
            else
              ...items
                  .take(8)
                  .map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: _SyncQueueTile(item: item),
                    ),
                  ),
            const SizedBox(height: 4),
            OutlinedButton(
              onPressed: syncing ? null : onForceSync,
              style: OutlinedButton.styleFrom(
                foregroundColor: scheme.primary,
                side: BorderSide(color: scheme.primary),
              ),
              child:
                  syncing
                      ? SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: scheme.primary,
                        ),
                      )
                      : Text(
                        l10n.reportsForceSync,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SyncQueueTile extends StatelessWidget {
  const _SyncQueueTile({required this.item});

  final SyncQueueItem item;

  Icon _statusIcon(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    switch (item.status) {
      case SyncQueueItemStatus.syncing:
        return Icon(Icons.sync, size: 18, color: scheme.tertiary);
      case SyncQueueItemStatus.paused:
        return Icon(
          Icons.pause_circle_outline,
          size: 18,
          color: scheme.onSurfaceVariant,
        );
      case SyncQueueItemStatus.waiting:
        return Icon(Icons.wifi_find, size: 18, color: scheme.onSurfaceVariant);
      case SyncQueueItemStatus.error:
        return Icon(Icons.priority_high, size: 18, color: scheme.error);
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: scheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: scheme.outlineVariant.withValues(alpha: 0.35),
        ),
        boxShadow: [
          BoxShadow(
            color: scheme.shadow.withValues(alpha: 0.04),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(item.icon, color: scheme.secondary, size: 22),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    item.subtitle,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            _statusIcon(context),
          ],
        ),
      ),
    );
  }
}

class _SystemHealthCard extends StatelessWidget {
  const _SystemHealthCard({
    required this.online,
    required this.lastCacheAt,
    required this.l10n,
  });

  final bool online;
  final DateTime? lastCacheAt;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final minutes =
        lastCacheAt == null
            ? null
            : DateTime.now().difference(lastCacheAt!).inMinutes.clamp(0, 9999);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.inverseSurface,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                l10n.reportsSystemHealth.toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.2,
                  color: scheme.inversePrimary.withValues(alpha: 0.8),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                online ? l10n.reportsNetworkStable : l10n.reportsNetworkOffline,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: scheme.onInverseSurface,
                  height: 1.1,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                minutes != null
                    ? l10n.reportsLastBackup(minutes)
                    : l10n.reportsSyncDone,
                style: TextStyle(
                  fontSize: 14,
                  color: scheme.onInverseSurface.withValues(alpha: 0.7),
                ),
              ),
            ],
          ),
          Positioned(
            right: -12,
            bottom: -12,
            child: Icon(
              Icons.verified_user_outlined,
              size: 100,
              color: scheme.onInverseSurface.withValues(alpha: 0.08),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExportOption extends StatelessWidget {
  const _ExportOption({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Material(
      color: scheme.surfaceContainer,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Icon(icon, color: iconColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11,
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
