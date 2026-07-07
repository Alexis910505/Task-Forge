import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import 'task_status_presentation.dart';

class TaskDetailMobilePage extends ConsumerStatefulWidget {
  const TaskDetailMobilePage({super.key, required this.taskId});

  final String taskId;

  @override
  ConsumerState<TaskDetailMobilePage> createState() => _TaskDetailMobilePageState();
}

class _TaskDetailMobilePageState extends ConsumerState<TaskDetailMobilePage> {
  Map<String, dynamic>? _task;
  String? _error;
  bool _loading = true;
  bool _statusUpdating = false;
  bool _commentSending = false;
  final _commentCtrl = TextEditingController();

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  String get _displayId {
    final id = widget.taskId;
    if (id.length <= 8) return '#$id';
    return '#TF-${id.substring(id.length - 4).toUpperCase()}';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get<Map<String, dynamic>>('/tasks/${widget.taskId}');
      if (mounted) {
        setState(() => _task = res.data);
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

  Future<void> _changeStatus(String status) async {
    if (_task == null || _task!['status'] == status) return;
    setState(() => _statusUpdating = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.patch<Map<String, dynamic>>(
        '/tasks/${widget.taskId}',
        data: {'status': status},
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.taskDetailStatusUpdated)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_formatError(e))),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _statusUpdating = false);
      }
    }
  }

  Future<void> _submitComment() async {
    final content = _commentCtrl.text.trim();
    if (content.isEmpty) return;
    setState(() => _commentSending = true);
    try {
      final dio = ref.read(dioProvider);
      await dio.post('/tasks/${widget.taskId}/comments', data: {'content': content});
      _commentCtrl.clear();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context)!.taskDetailCommentFailed)),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _commentSending = false);
      }
    }
  }

  void _openStatusSheet() {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    final current = '${_task?['status'] ?? ''}';
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Text(
                  l10n.taskDetailChangeStatus,
                  style: Theme.of(ctx).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              for (final status in kTaskStatuses)
                ListTile(
                  leading: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: taskStatusVisual(status, scheme, l10n).dotColor,
                      shape: BoxShape.circle,
                    ),
                  ),
                  title: Text(taskStatusVisual(status, scheme, l10n).label),
                  trailing: current == status ? Icon(Icons.check, color: scheme.primary) : null,
                  onTap: () {
                    Navigator.pop(ctx);
                    void change() => _changeStatus(status);
                    change();
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  List<Map<String, dynamic>> _evidencePhotos() {
    final attachments = _task?['attachments'];
    if (attachments is! List) return [];
    return attachments
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .where((a) {
          final kind = '${a['evidenceKind'] ?? ''}';
          if (kind == 'BEFORE' || kind == 'AFTER') return true;
          final mime = '${a['mimeType'] ?? ''}';
          final name = '${a['filename'] ?? ''}';
          return mime.startsWith('image/') || RegExp(r'\.(jpe?g|png|webp|gif)$', caseSensitive: false).hasMatch(name);
        })
        .toList();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;

    if (_loading) {
      return Scaffold(
        body: Center(child: CircularProgressIndicator(color: scheme.primary)),
      );
    }

    if (_error != null || _task == null) {
      return Scaffold(
        appBar: AppBar(leading: BackButton(onPressed: () => context.pop())),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error ?? l10n.genericRequestError, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(onPressed: _load, child: Text(l10n.dashboardRetry)),
              ],
            ),
          ),
        ),
      );
    }

    final task = _task!;
    final title = '${task['title'] ?? ''}';
    final status = '${task['status'] ?? 'TODO'}';
    final visual = taskStatusVisual(status, scheme, l10n);
    final description = '${task['description'] ?? ''}'.trim();
    final photos = _evidencePhotos();

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
                    onPressed: () => context.pop(true),
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Text(
                      title.isEmpty ? l10n.myTasksTitle : title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: scheme.primary,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: _load,
                    icon: const Icon(Icons.refresh),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 20, 20, 120),
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              l10n.taskDetailTaskId(_displayId),
                              style: theme.textTheme.labelSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                                letterSpacing: 0.6,
                                color: scheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  width: 8,
                                  height: 8,
                                  decoration: BoxDecoration(
                                    color: visual.dotColor,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  visual.label.toUpperCase(),
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.8,
                                    color: visual.color,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.tonal(
                        onPressed: _statusUpdating ? null : _openStatusSheet,
                        style: FilledButton.styleFrom(
                          backgroundColor: scheme.secondaryContainer,
                          foregroundColor: scheme.onSecondaryContainer,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_statusUpdating)
                              SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: scheme.onSecondaryContainer,
                                ),
                              )
                            else ...[
                              Text(
                                l10n.taskDetailChangeStatus,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.4,
                                ),
                              ),
                              const Icon(Icons.expand_more, size: 18),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),
                  Text(
                    l10n.taskDetailDescription,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: scheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: scheme.outlineVariant),
                    ),
                    child: Text(
                      description.isEmpty ? l10n.taskDetailNoDescription : description,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: scheme.onSurfaceVariant,
                        height: 1.45,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    height: 96,
                    child: FilledButton(
                      onPressed: () async {
                        await context.push('/tasks/${widget.taskId}/evidence');
                        if (mounted) await _load();
                      },
                      style: FilledButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.add_a_photo_outlined, size: 32),
                          const SizedBox(height: 6),
                          Text(
                            l10n.taskDetailAddEvidence,
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        l10n.taskDetailEvidenceGallery,
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        l10n.taskDetailPhotosCount(photos.length),
                        style: theme.textTheme.labelSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: scheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (photos.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(24),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border.all(color: scheme.outlineVariant),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        l10n.taskDetailNoPhotos,
                        style: theme.textTheme.bodySmall?.copyWith(color: scheme.onSurfaceVariant),
                      ),
                    )
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: photos.length,
                      itemBuilder: (context, i) {
                        final url = resolveUploadUrl('${photos[i]['url'] ?? ''}');
                        return ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Container(
                            decoration: BoxDecoration(
                              border: Border.all(color: scheme.outlineVariant),
                            ),
                            child: Image.network(
                              url,
                              fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => ColoredBox(
                                color: scheme.surfaceContainerHigh,
                                child: Icon(Icons.broken_image_outlined, color: scheme.onSurfaceVariant),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            Material(
              elevation: 8,
              color: scheme.surfaceContainerLow,
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _commentCtrl,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _submitComment(),
                          decoration: InputDecoration(
                            hintText: l10n.taskDetailCommentHint,
                            filled: true,
                            fillColor: scheme.surface,
                            prefixIcon: Icon(Icons.comment_outlined, color: scheme.onSurfaceVariant),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: scheme.outline),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(999),
                              borderSide: BorderSide(color: scheme.outline),
                            ),
                            contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Material(
                        color: scheme.primaryContainer,
                        shape: const CircleBorder(),
                        child: InkWell(
                          onTap: _commentSending ? null : _submitComment,
                          customBorder: const CircleBorder(),
                          child: SizedBox(
                            width: 48,
                            height: 48,
                            child: _commentSending
                                ? Padding(
                                    padding: const EdgeInsets.all(12),
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: scheme.onPrimaryContainer,
                                    ),
                                  )
                                : Icon(Icons.send, color: scheme.onPrimaryContainer),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
