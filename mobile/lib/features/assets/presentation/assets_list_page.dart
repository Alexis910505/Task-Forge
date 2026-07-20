import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/security/user_permissions_provider.dart';
import '../../auth/application/auth_repository.dart';
import 'asset_catalog.dart';
import 'asset_form_dialog.dart';
import 'asset_presentation.dart';

class AssetsListPage extends StatefulWidget {
  const AssetsListPage({super.key});

  @override
  State<AssetsListPage> createState() => _AssetsListPageState();
}

class _AssetsListPageState extends State<AssetsListPage> {
  final _searchCtrl = TextEditingController();
  Timer? _searchDebounce;
  String? _selectedCategoryCode;
  List<AssetCatalogOption> _categories = [];
  List<AssetCatalogOption> _statuses = [];
  List<Map<String, dynamic>> _assets = [];
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _searchCtrl.addListener(_onSearchChanged);
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), _loadAssets);
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadCatalogs(), _loadAssets()]);
  }

  Future<void> _loadCatalogs() async {
    try {
      final catalogs = await fetchAssetCatalogs(Get.find<ApiClient>().dio);
      if (!mounted) return;
      setState(() {
        _categories = catalogs.categories;
        _statuses = catalogs.statuses;
      });
    } catch (_) {
      // El listado puede seguir con labels del API.
    }
  }

  Future<void> _loadAssets() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final q = _searchCtrl.text.trim();
      final res = await dio.get<List<dynamic>>(
        '/assets',
        queryParameters: {
          if (q.isNotEmpty) 'q': q,
          if (_selectedCategoryCode != null) 'category': _selectedCategoryCode,
        },
      );
      final raw = res.data;
      final items = raw is List
          ? raw
              .whereType<Map>()
              .map((m) => Map<String, dynamic>.from(m))
              .toList()
          : <Map<String, dynamic>>[];
      if (mounted) {
        setState(() => _assets = items);
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

  Future<void> _openCreateDialog() async {
    final l10n = AppLocalizations.of(context)!;
    final dio = Get.find<ApiClient>().dio;

    if (_categories.isEmpty || _statuses.isEmpty) {
      await _loadCatalogs();
    }
    if (!mounted) return;
    if (_categories.isEmpty || _statuses.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(l10n.assetsCatalogLoadFailed)),
      );
      return;
    }

    final result = await showAssetFormDialog(
      context: context,
      l10n: l10n,
      categories: _categories,
      statuses: _statuses,
    );
    if (result == null || !mounted) return;

    try {
      await dio.post(
        '/assets',
        data: {
          'name': result.name,
          'code': result.code,
          'category': result.category,
          'status': result.status,
          'location': result.location,
          if (result.maintenanceDate != null)
            'maintenanceDate': result.maintenanceDate,
        },
      );
      await _loadAssets();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(l10n.assetsCreateSuccess)),
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final profile = Get.find<AuthController>().currentSession?.profile;
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final canWrite = canWriteAssets();

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([_loadCatalogs(), _loadAssets()]);
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.fromLTRB(
            wide ? 16 : 20,
            wide ? 16 : 8,
            wide ? 16 : 20,
            120,
          ),
          children: [
            if (!wide) AppMobileTopBar(profile: profile),
            Text(
              l10n.assetsHubTitle,
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              l10n.assetsHubSubtitle,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 16),
            _DiscoverabilityRow(l10n: l10n),
            const SizedBox(height: 20),
            TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: l10n.assetsSearchHint,
                prefixIcon: const Icon(Icons.search),
                filled: true,
                fillColor: scheme.surfaceContainer,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: scheme.outlineVariant),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: scheme.outlineVariant),
                ),
              ),
            ),
            const SizedBox(height: 16),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _FilterChip(
                    label: l10n.assetsFilterAll,
                    selected: _selectedCategoryCode == null,
                    onTap: () {
                      setState(() => _selectedCategoryCode = null);
                      _loadAssets();
                    },
                  ),
                  ..._categories.map(
                    (cat) => Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: _FilterChip(
                        label: cat.name,
                        selected: _selectedCategoryCode == cat.code,
                        onTap: () {
                          setState(() => _selectedCategoryCode = cat.code);
                          _loadAssets();
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              l10n.assetsSectionTitle,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 12),
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
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _loadAssets,
                      child: Text(l10n.dashboardRetry),
                    ),
                  ],
                ),
              )
            else if (_assets.isEmpty)
              _AssetsEmptyState(
                l10n: l10n,
                canWrite: canWrite,
                onCreate: _openCreateDialog,
              )
            else
              ..._assets.map(
                (asset) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: _AssetCard(
                    asset: asset,
                    l10n: l10n,
                    onTap: () => context.push('/assets/${asset['id']}'),
                  ),
                ),
              ),
          ],
        ),
      ),
      floatingActionButton: canWrite
          ? FloatingActionButton(
              tooltip: l10n.assetsCreateTitle,
              onPressed: _openCreateDialog,
              child: const Icon(Icons.add),
            )
          : null,
    );
  }
}

class _DiscoverabilityRow extends StatelessWidget {
  const _DiscoverabilityRow({required this.l10n});

  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.go('/kanban'),
            icon: const Icon(Icons.view_kanban_outlined, size: 18),
            label: Text(l10n.navKanban),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: OutlinedButton.icon(
            onPressed: () => context.go('/organization'),
            icon: Icon(
              Icons.apartment_outlined,
              size: 18,
              color: scheme.primary,
            ),
            label: Text(l10n.navOrganization),
          ),
        ),
      ],
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return FilterChip(
      label: Text(
        label,
        style: TextStyle(
          fontWeight: FontWeight.w700,
          fontSize: 12,
          letterSpacing: 0.4,
          color: selected ? scheme.onPrimaryContainer : scheme.onSurfaceVariant,
        ),
      ),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      backgroundColor: scheme.surface,
      selectedColor: scheme.primaryContainer,
      side: BorderSide(color: scheme.outlineVariant),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
    );
  }
}

class _AssetCard extends StatelessWidget {
  const _AssetCard({
    required this.asset,
    required this.l10n,
    required this.onTap,
  });

  final Map<String, dynamic> asset;
  final AppLocalizations l10n;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final name = '${asset['name'] ?? ''}';
    final code = '${asset['code'] ?? ''}';
    final category = '${asset['category'] ?? ''}';
    final categoryName = '${asset['categoryName'] ?? ''}';
    final location = '${asset['location'] ?? ''}'.trim();
    final status = '${asset['status'] ?? 'OPERATIONAL'}';
    final visual = assetStatusVisual(
      status,
      scheme,
      l10n,
      customLabel: '${asset['statusName'] ?? ''}',
      customColor: asset['statusColor']?.toString(),
    );
    final photos = asset['_count'] is Map ? asset['_count'] as Map : null;
    final photoCount = (photos?['photos'] as num?)?.toInt() ?? 0;
    final firstPhotoUrl =
        asset['photos'] is List && (asset['photos'] as List).isNotEmpty
            ? '${(asset['photos'] as List).first['url'] ?? ''}'
            : '';

    return Material(
      color: scheme.surfaceContainerLowest,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: scheme.outlineVariant),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: scheme.surfaceContainer,
                        border: Border.all(color: scheme.outlineVariant),
                      ),
                      child:
                          firstPhotoUrl.isNotEmpty
                              ? Image.network(
                                resolveUploadUrl(firstPhotoUrl),
                                fit: BoxFit.cover,
                                errorBuilder:
                                    (_, __, ___) => Icon(
                                      Icons.inventory_2_outlined,
                                      color: scheme.onSurfaceVariant,
                                    ),
                              )
                              : Icon(
                                Icons.inventory_2_outlined,
                                color: scheme.onSurfaceVariant,
                              ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name.isEmpty ? '—' : name,
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          code.toUpperCase(),
                          style: theme.textTheme.labelMedium?.copyWith(
                            color: scheme.outline,
                            letterSpacing: 0.8,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: visual.background,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      visual.label.toUpperCase(),
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: visual.foreground,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        fontSize: 10,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Divider(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
                height: 1,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(
                    Icons.category_outlined,
                    size: 18,
                    color: scheme.outline,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    assetCategoryLabel(
                      category,
                      l10n,
                      customLabel: categoryName,
                    ),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                  if (location.isNotEmpty) ...[
                    const SizedBox(width: 20),
                    Icon(
                      Icons.location_on_outlined,
                      size: 18,
                      color: scheme.outline,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        location,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                  if (photoCount > 0) ...[
                    const SizedBox(width: 8),
                    Icon(Icons.photo_outlined, size: 16, color: scheme.outline),
                    const SizedBox(width: 2),
                    Text('$photoCount', style: theme.textTheme.labelSmall),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AssetsEmptyState extends StatelessWidget {
  const _AssetsEmptyState({
    required this.l10n,
    required this.canWrite,
    required this.onCreate,
  });

  final AppLocalizations l10n;
  final bool canWrite;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: scheme.outlineVariant),
      ),
      child: Column(
        children: [
          Icon(
            Icons.inventory_2_outlined,
            size: 48,
            color: scheme.primary.withValues(alpha: 0.7),
          ),
          const SizedBox(height: 16),
          Text(
            l10n.assetsEmptyTitle,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Text(
            l10n.assetsEmptyHint,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
            textAlign: TextAlign.center,
          ),
          if (canWrite) ...[
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: onCreate,
              icon: const Icon(Icons.add),
              label: Text(l10n.assetsCreateTitle),
            ),
          ],
        ],
      ),
    );
  }
}
