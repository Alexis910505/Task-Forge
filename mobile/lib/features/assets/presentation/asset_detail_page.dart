import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/i18n/relative_time.dart';
import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/security/user_permissions_provider.dart';
import 'asset_catalog.dart';
import 'asset_form_dialog.dart';
import 'asset_presentation.dart';

class AssetDetailPage extends StatefulWidget {
  const AssetDetailPage({super.key, required this.assetId});

  final String assetId;

  @override
  State<AssetDetailPage> createState() => _AssetDetailPageState();
}

class _AssetDetailPageState extends State<AssetDetailPage> {
  Map<String, dynamic>? _asset;
  List<Map<String, dynamic>> _history = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final detailRes = await dio.get<Map<String, dynamic>>(
        '/assets/${widget.assetId}',
      );
      List<Map<String, dynamic>> history = [];
      try {
        final historyRes = await dio.get<List<dynamic>>(
          '/assets/${widget.assetId}/history',
        );
        final raw = historyRes.data;
        if (raw is List) {
          history =
              raw
                  .whereType<Map>()
                  .map((m) => Map<String, dynamic>.from(m))
                  .toList();
        }
      } catch (_) {
        final embedded = detailRes.data?['history'];
        if (embedded is List) {
          history =
              embedded
                  .whereType<Map>()
                  .map((m) => Map<String, dynamic>.from(m))
                  .toList();
        }
      }
      if (mounted) {
        setState(() {
          _asset = detailRes.data;
          _history = history;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = _formatError(e));
      }
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  String _formatError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final m = data['message'];
        if (m is String && m.isNotEmpty) return m;
        if (m is List) return m.map((x) => '$x').join(', ');
      }
      return e.message ?? '$e';
    }
    return '$e';
  }

  Future<void> _openEditDialog() async {
    final l10n = AppLocalizations.of(context)!;
    final asset = _asset;
    if (asset == null) return;

    late final List<AssetCatalogOption> categories;
    late final List<AssetCatalogOption> statuses;
    try {
      final catalogs = await fetchAssetCatalogs(Get.find<ApiClient>().dio);
      categories = catalogs.categories;
      statuses = catalogs.statuses;
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.assetsCatalogLoadFailed)),
      );
      return;
    }
    if (!mounted) return;
    if (categories.isEmpty || statuses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.assetsCatalogLoadFailed)),
      );
      return;
    }

    final result = await showAssetFormDialog(
      context: context,
      l10n: l10n,
      categories: categories,
      statuses: statuses,
      initialName: '${asset['name'] ?? ''}',
      initialCode: '${asset['code'] ?? ''}',
      initialCategory: '${asset['category'] ?? ''}',
      initialStatus: '${asset['status'] ?? ''}',
      initialLocation: '${asset['location'] ?? ''}',
      initialMaintenanceDate: asset['maintenanceDate']?.toString(),
      isEdit: true,
    );
    if (result == null || !mounted) return;

    try {
      await Get.find<ApiClient>().dio.patch(
        '/assets/${widget.assetId}',
        data: {
          'name': result.name,
          'code': result.code,
          'category': result.category,
          'status': result.status,
          'location': result.location ?? '',
          'maintenanceDate': result.maintenanceDate ?? '',
        },
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.assetsUpdateSuccess)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_formatError(e))),
        );
      }
    }
  }

  List<Map<String, dynamic>> _photos() {
    final raw = _asset?['photos'];
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
  }

  List<Map<String, dynamic>> _linkedTasks() {
    final raw = _asset?['taskLinks'];
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .toList();
  }

  String _formatMaintenanceDate(String? iso, String locale) {
    if (iso == null || iso.isEmpty) return '—';
    final dt = DateTime.tryParse(iso);
    if (dt == null) return '—';
    return DateFormat.MMMd(locale).format(dt.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final locale = Localizations.localeOf(context).languageCode;
    final canWrite = canWriteAssets();

    if (_loading) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(child: CircularProgressIndicator(color: scheme.primary)),
      );
    }

    if (_error != null || _asset == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _error ?? l10n.genericRequestError,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _load,
                  child: Text(l10n.dashboardRetry),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final asset = _asset!;
    final name = '${asset['name'] ?? ''}';
    final code = '${asset['code'] ?? ''}';
    final category = '${asset['category'] ?? ''}';
    final categoryName = '${asset['categoryName'] ?? ''}';
    final location = '${asset['location'] ?? ''}'.trim();
    final status = '${asset['status'] ?? 'OPERATIONAL'}';
    final statusVisual = assetStatusVisual(
      status,
      scheme,
      l10n,
      customLabel: '${asset['statusName'] ?? ''}',
      customColor: asset['statusColor']?.toString(),
    );
    final photos = _photos();
    final tasks = _linkedTasks();
    final openTasks =
        tasks.where((t) {
          final task = t['task'];
          if (task is! Map) return false;
          return '${task['status'] ?? ''}' != 'COMPLETED';
        }).length;

    return Scaffold(
      backgroundColor: scheme.surface,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.pop(),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Text(
                      l10n.assetDetailTitle,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                  IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainerLowest,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name.isEmpty ? '—' : name,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${l10n.assetsFieldCode}: ${code.toUpperCase()}',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: scheme.outline,
                              letterSpacing: 0.6,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (photos.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      SizedBox(
                        height: 180,
                        child: ListView.separated(
                          scrollDirection: Axis.horizontal,
                          itemCount: photos.length,
                          separatorBuilder: (_, __) => const SizedBox(width: 8),
                          itemBuilder: (context, i) {
                            final url = resolveUploadUrl(
                              '${photos[i]['url'] ?? ''}',
                            );
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: AspectRatio(
                                aspectRatio: i == 0 ? 16 / 9 : 1,
                                child: Image.network(
                                  url,
                                  fit: BoxFit.cover,
                                  errorBuilder:
                                      (_, __, ___) => ColoredBox(
                                        color: scheme.surfaceContainer,
                                        child: Icon(
                                          Icons.broken_image_outlined,
                                          color: scheme.onSurfaceVariant,
                                        ),
                                      ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      mainAxisSpacing: 12,
                      crossAxisSpacing: 12,
                      childAspectRatio: 1.4,
                      children: [
                        _InfoTile(
                          label: l10n.assetDetailStatus,
                          child: Row(
                            children: [
                              Container(
                                width: 8,
                                height: 8,
                                decoration: BoxDecoration(
                                  color: statusVisual.foreground,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  statusVisual.label.toUpperCase(),
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                    color: statusVisual.foreground,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        _InfoTile(
                          label: l10n.assetDetailCategory,
                          child: Text(
                            assetCategoryLabel(
                              category,
                              l10n,
                              customLabel: categoryName,
                            ),
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        _InfoTile(
                          label: l10n.assetDetailLocation,
                          child: Row(
                            children: [
                              Icon(
                                Icons.location_on_outlined,
                                size: 18,
                                color: scheme.primary,
                              ),
                              const SizedBox(width: 4),
                              Expanded(
                                child: Text(
                                  location.isEmpty ? '—' : location,
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        _InfoTile(
                          label: l10n.assetDetailNextService,
                          child: Row(
                            children: [
                              Icon(
                                Icons.event_outlined,
                                size: 18,
                                color: scheme.error,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _formatMaintenanceDate(
                                  '${asset['maintenanceDate'] ?? ''}',
                                  locale,
                                ),
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    if (tasks.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            l10n.assetDetailLinkedTasks,
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          if (openTasks > 0)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: scheme.primaryContainer,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                l10n.assetDetailOpenTasks(openTasks),
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: scheme.onPrimaryContainer,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...tasks.map((link) {
                        final task = link['task'];
                        if (task is! Map) return const SizedBox.shrink();
                        final taskMap = Map<String, dynamic>.from(task);
                        final taskId = '${taskMap['id'] ?? ''}';
                        final taskTitle = '${taskMap['title'] ?? ''}';
                        final taskStatus = '${taskMap['status'] ?? ''}';
                        final isOpen = taskStatus != 'COMPLETED';
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Material(
                            color:
                                isOpen
                                    ? scheme.surfaceContainerHighest
                                    : scheme.surfaceContainer,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: BorderSide(
                                color:
                                    isOpen
                                        ? scheme.primary
                                        : scheme.outlineVariant,
                                width: isOpen ? 0 : 1,
                              ),
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap:
                                  taskId.isEmpty
                                      ? null
                                      : () => context.push('/tasks/$taskId'),
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            taskTitle.isEmpty ? '—' : taskTitle,
                                            style: theme.textTheme.labelLarge
                                                ?.copyWith(
                                                  fontWeight: FontWeight.w800,
                                                  color:
                                                      isOpen
                                                          ? scheme.primary
                                                          : scheme
                                                              .onSurfaceVariant,
                                                ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            taskStatus.replaceAll('_', ' '),
                                            style: theme.textTheme.bodySmall
                                                ?.copyWith(
                                                  color:
                                                      scheme.onSurfaceVariant,
                                                ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Icon(
                                      Icons.chevron_right,
                                      color: scheme.outline,
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ],
                    const SizedBox(height: 28),
                    Text(
                      l10n.assetDetailHistory,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_history.isEmpty)
                      Text(
                        l10n.assetDetailNoHistory,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      )
                    else
                      ...List.generate(_history.length, (i) {
                        final entry = _history[i];
                        final action = '${entry['action'] ?? ''}';
                        final createdAt = DateTime.tryParse(
                          '${entry['createdAt'] ?? ''}',
                        );
                        final timeLabel =
                            createdAt != null
                                ? formatRelativeTime(
                                  createdAt,
                                  locale,
                                ).toUpperCase()
                                : '';
                        final isLast = i == _history.length - 1;
                        return _HistoryTimelineItem(
                          title: assetHistoryActionLabel(action, l10n),
                          subtitle: _historySubtitle(entry),
                          timeLabel: timeLabel,
                          isLast: isLast,
                          isFirst: i == 0,
                        );
                      }),
                    if (canWrite) ...[
                      const SizedBox(height: 28),
                      FilledButton.icon(
                        onPressed: _openEditDialog,
                        icon: const Icon(Icons.edit_outlined),
                        label: Text(l10n.assetDetailEdit),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size.fromHeight(48),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _historySubtitle(Map<String, dynamic> entry) {
    final user = entry['user'];
    if (user is Map) {
      final first = '${user['firstName'] ?? ''}'.trim();
      final last = '${user['lastName'] ?? ''}'.trim();
      final name = '$first $last'.trim();
      if (name.isNotEmpty) return name;
    }
    final meta = entry['metadata'];
    if (meta is Map && meta['name'] != null) {
      return '${meta['name']}';
    }
    return '';
  }
}

class _InfoTile extends StatelessWidget {
  const _InfoTile({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: theme.textTheme.labelSmall?.copyWith(
              color: scheme.outline,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }
}

class _HistoryTimelineItem extends StatelessWidget {
  const _HistoryTimelineItem({
    required this.title,
    required this.subtitle,
    required this.timeLabel,
    required this.isLast,
    required this.isFirst,
  });

  final String title;
  final String subtitle;
  final String timeLabel;
  final bool isLast;
  final bool isFirst;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 24,
            child: Column(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: isFirst ? scheme.tertiary : scheme.outlineVariant,
                    shape: BoxShape.circle,
                    border: Border.all(color: scheme.surface, width: 3),
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(width: 2, color: scheme.outlineVariant),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(bottom: isLast ? 0 : 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          title.toUpperCase(),
                          style: theme.textTheme.labelLarge?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      if (timeLabel.isNotEmpty)
                        Text(
                          timeLabel,
                          style: theme.textTheme.labelSmall?.copyWith(
                            color: scheme.outline,
                          ),
                        ),
                    ],
                  ),
                  if (subtitle.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
