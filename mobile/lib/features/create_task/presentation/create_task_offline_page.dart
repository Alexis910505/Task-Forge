import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/offline_providers.dart';
import '../application/offline_create_task_service.dart';

const _categories = ['Maintenance', 'Repair', 'Safety', 'Audit'];

class CreateTaskOfflinePage extends StatefulWidget {
  const CreateTaskOfflinePage({super.key});

  @override
  State<CreateTaskOfflinePage> createState() => _CreateTaskOfflinePageState();
}

class _CreateTaskOfflinePageState extends State<CreateTaskOfflinePage> {
  final _titleCtrl = TextEditingController();
  final _assetCtrl = TextEditingController();
  String _category = _categories.first;
  String _priority = 'MEDIUM';
  String? _boardId;
  String? _boardError;
  bool _loadingBoard = true;
  bool _saving = false;
  final List<String> _photoPaths = [];

  bool get _isOnline {
    return Get.find<ConnectivityService>().online.value;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadBoard());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _assetCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadBoard() async {
    final local = Get.find<LocalDataService>();
    var boardId = await local.readDefaultBoardId();
    boardId ??= await local.firstCachedBoardId();

    // Si no hay board en caché, tomar el primero de /projects.
    if (boardId == null) {
      try {
        final dio = Get.find<ApiClient>().dio;
        final res = await dio.get<List<dynamic>>('/projects');
        final projects = res.data;
        if (projects is List) {
          for (final p in projects) {
            if (p is! Map) continue;
            final boards = p['boards'];
            if (boards is! List || boards.isEmpty) continue;
            final first = boards.first;
            if (first is Map && first['id'] != null) {
              boardId = '${first['id']}';
              await local.saveDefaultBoardId(boardId);
              break;
            }
          }
        }
      } catch (_) {
        /* offline o sin permisos */
      }
    }

    if (mounted) {
      setState(() {
        _boardId = boardId;
        _boardError = boardId == null ? 'missing' : null;
        _loadingBoard = false;
      });
    }
  }

  Future<void> _addPhoto() async {
    if (_photoPaths.length >= 4) return;
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
    );
    if (file != null && mounted) {
      setState(() => _photoPaths.add(file.path));
    }
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final title = _titleCtrl.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.createTaskTitleRequired)));
      return;
    }
    if (_boardId == null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(l10n.createTaskBoardRequired)));
      return;
    }

    setState(() => _saving = true);
    try {
      final result = await Get.find<OfflineCreateTaskService>().save(
        boardId: _boardId!,
        title: title,
        priority: _priority,
        location:
            _assetCtrl.text.trim().isEmpty ? null : _assetCtrl.text.trim(),
        category: _category,
        assetLabel:
            _assetCtrl.text.trim().isEmpty ? null : _assetCtrl.text.trim(),
        photoPaths: List.from(_photoPaths),
        preferOnline: _isOnline,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.synced
                ? l10n.createTaskSavedOnline
                : l10n.createTaskSavedOffline,
          ),
        ),
      );
      context.pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$e')));
      }
    } finally {
      if (mounted) {
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final showOfflineChrome = !_isOnline;

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: Text(l10n.createTaskTitle),
        actions: [
          if (showOfflineChrome)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: Row(
                children: [
                  Icon(
                    Icons.cloud_off,
                    size: 20,
                    color: scheme.onSurfaceVariant,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    l10n.createTaskOfflineBadge,
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: scheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
      body: Stack(
        children: [
          if (_loadingBoard)
            const Center(child: CircularProgressIndicator())
          else
            ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 200),
              children: [
                if (_boardError != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 16),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: scheme.errorContainer.withValues(alpha: 0.35),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      l10n.createTaskBoardRequired,
                      style: TextStyle(color: scheme.onErrorContainer),
                    ),
                  ),
                _FieldLabel(l10n.createTaskFieldTitle),
                const SizedBox(height: 8),
                TextField(
                  controller: _titleCtrl,
                  decoration: InputDecoration(
                    hintText: l10n.createTaskTitleHint,
                    filled: true,
                    fillColor: scheme.surfaceContainerLow,
                    border: UnderlineInputBorder(
                      borderSide: BorderSide(color: scheme.outlineVariant),
                    ),
                    enabledBorder: UnderlineInputBorder(
                      borderSide: BorderSide(color: scheme.outlineVariant),
                    ),
                    focusedBorder: UnderlineInputBorder(
                      borderSide: BorderSide(color: scheme.primary, width: 2),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _FieldLabel(l10n.createTaskFieldCategory),
                const SizedBox(height: 8),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children:
                        _categories.map((c) {
                          final selected = c == _category;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(_categoryLabel(c, l10n)),
                              selected: selected,
                              onSelected: (_) => setState(() => _category = c),
                              selectedColor: scheme.primary,
                              labelStyle: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 12,
                                color:
                                    selected
                                        ? scheme.onPrimary
                                        : scheme.onSurfaceVariant,
                              ),
                              side: BorderSide(
                                color:
                                    selected
                                        ? scheme.primary
                                        : scheme.outlineVariant,
                              ),
                            ),
                          );
                        }).toList(),
                  ),
                ),
                const SizedBox(height: 24),
                _FieldLabel(l10n.createTaskFieldAsset),
                const SizedBox(height: 8),
                TextField(
                  controller: _assetCtrl,
                  decoration: InputDecoration(
                    hintText: l10n.createTaskAssetHint,
                    prefixIcon: Icon(
                      Icons.search,
                      color: scheme.onSurfaceVariant,
                    ),
                    filled: true,
                    fillColor: scheme.surfaceContainerLow,
                    border: UnderlineInputBorder(
                      borderSide: BorderSide(color: scheme.outlineVariant),
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                _FieldLabel(l10n.createTaskFieldPriority),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _PriorityTile(
                        label: l10n.createTaskPriorityLow,
                        icon: Icons.low_priority,
                        selected: _priority == 'LOW',
                        onTap: () => setState(() => _priority = 'LOW'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _PriorityTile(
                        label: l10n.createTaskPriorityMedium,
                        icon: Icons.priority_high,
                        selected: _priority == 'MEDIUM',
                        onTap: () => setState(() => _priority = 'MEDIUM'),
                        highlight: true,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _PriorityTile(
                        label: l10n.createTaskPriorityUrgent,
                        icon: Icons.warning_amber_rounded,
                        selected: _priority == 'HIGH',
                        onTap: () => setState(() => _priority = 'HIGH'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                _FieldLabel(l10n.createTaskFieldPhotos),
                const SizedBox(height: 8),
                if (_photoPaths.isNotEmpty)
                  SizedBox(
                    height: 88,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: _photoPaths.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 8),
                      itemBuilder: (context, i) {
                        return Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(10),
                              child: Image.file(
                                File(_photoPaths[i]),
                                width: 88,
                                height: 88,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              top: 4,
                              right: 4,
                              child: GestureDetector(
                                onTap:
                                    () =>
                                        setState(() => _photoPaths.removeAt(i)),
                                child: CircleAvatar(
                                  radius: 12,
                                  backgroundColor: scheme.inverseSurface,
                                  child: Icon(
                                    Icons.close,
                                    size: 14,
                                    color: scheme.onInverseSurface,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                if (_photoPaths.isNotEmpty) const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: _photoPaths.length >= 4 ? null : _addPhoto,
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(120),
                    side: BorderSide(color: scheme.outlineVariant, width: 2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: scheme.primary.withValues(alpha: 0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.add_a_photo,
                          color: scheme.primary,
                          size: 28,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        l10n.createTaskAddPhoto,
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                          color: scheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.createTaskPhotosHint,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant.withValues(alpha: 0.65),
                  ),
                ),
              ],
            ),
          if (showOfflineChrome)
            Positioned(
              top: 8,
              right: 16,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: scheme.inverseSurface.withValues(alpha: 0.9),
                    shape: BoxShape.circle,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(8),
                    child: Icon(
                      Icons.cloud_off,
                      color: scheme.onInverseSurface,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          decoration: BoxDecoration(
            color: scheme.surface,
            border: Border(top: BorderSide(color: scheme.outlineVariant)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (!_isOnline)
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.wifi_off,
                      size: 18,
                      color: scheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        l10n.createTaskOfflineFooter,
                        textAlign: TextAlign.center,
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ),
                  ],
                ),
              if (!_isOnline) const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _saving || _boardId == null ? null : _save,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                icon:
                    _saving
                        ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: scheme.onPrimary,
                          ),
                        )
                        : const Icon(Icons.save_outlined),
                label: Text(l10n.createTaskSave),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _categoryLabel(String key, AppLocalizations l10n) {
    switch (key) {
      case 'Maintenance':
        return l10n.createTaskCategoryMaintenance;
      case 'Repair':
        return l10n.createTaskCategoryRepair;
      case 'Safety':
        return l10n.createTaskCategorySafety;
      case 'Audit':
        return l10n.createTaskCategoryAudit;
      default:
        return key;
    }
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
        fontWeight: FontWeight.w800,
        letterSpacing: 0.6,
        color: Theme.of(context).colorScheme.outline,
      ),
    );
  }
}

class _PriorityTile extends StatelessWidget {
  const _PriorityTile({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.highlight = false,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final active = selected;
    final borderColor =
        active
            ? (highlight ? scheme.tertiary : scheme.primary)
            : scheme.outlineVariant;
    final fg =
        active
            ? (highlight ? scheme.tertiary : scheme.primary)
            : scheme.onSurfaceVariant;

    return Material(
      color:
          active
              ? (highlight
                  ? scheme.tertiary.withValues(alpha: 0.1)
                  : scheme.primary.withValues(alpha: 0.08))
              : scheme.surfaceContainerLow,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: active ? 2 : 1),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: fg, size: 22),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 11,
                  color: fg,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
