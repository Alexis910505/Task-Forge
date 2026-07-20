import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/network/api_urls.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/offline/app_database.dart';
import '../application/evidence_capture_service.dart';
import '../application/evidence_upload_worker.dart';

class TaskEvidencePage extends StatefulWidget {
  const TaskEvidencePage({super.key, required this.taskId});

  final String taskId;

  @override
  State<TaskEvidencePage> createState() => _TaskEvidencePageState();
}

class _TaskEvidencePageState extends State<TaskEvidencePage> {
  bool _includeGps = false;
  bool _busy = false;
  List<dynamic> _serverAttachments = const [];
  List<EvidenceUploadQueueData> _pendingRows = const [];
  StreamSubscription<List<EvidenceUploadQueueData>>? _pendingSubscription;
  String? _serverError;

  @override
  void initState() {
    super.initState();
    final db = Get.find<AppDatabase>();
    _pendingSubscription = (db.select(
      db.evidenceUploadQueue,
    )..where((row) => row.taskId.equals(widget.taskId))).watch().listen((rows) {
      final previousLength = _pendingRows.length;
      if (mounted) {
        setState(() => _pendingRows = rows);
      }
      if (rows.length < previousLength) {
        _refreshServer();
      }
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshServer();
    });
  }

  @override
  void dispose() {
    _pendingSubscription?.cancel();
    super.dispose();
  }

  Future<void> _refreshServer() async {
    setState(() {
      _serverError = null;
    });
    try {
      final dio = Get.find<ApiClient>().dio;
      final res = await dio.get<dynamic>('/tasks/${widget.taskId}/attachments');
      final data = res.data;
      if (mounted) {
        setState(() {
          _serverAttachments =
              data is List ? List<dynamic>.from(data) : const [];
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _serverError = e is DioException ? (e.message ?? '$e') : '$e',
        );
      }
    }
  }

  Future<void> _captureAndEnqueue(String kind) async {
    if (_busy) {
      return;
    }
    setState(() => _busy = true);
    try {
      final path = await EvidenceCaptureService.captureCompressedJpeg();
      if (path == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'No se pudo obtener la foto (permiso o cámara cancelada).',
              ),
            ),
          );
        }
        return;
      }
      final captured = DateTime.now().toUtc();
      final (lat, lng) = await EvidenceCaptureService.optionalLocation(
        _includeGps,
      );
      final result = await Get.find<EvidenceUploadWorker>().enqueue(
        taskId: widget.taskId,
        evidenceKind: kind,
        localPath: path,
        capturedAtIso: captured.toIso8601String(),
        latitude: lat,
        longitude: lng,
      );
      if (mounted) {
        final scheme = Theme.of(context).colorScheme;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.uploaded
                  ? 'Evidencia subida correctamente.'
                  : (result.error ??
                      'Foto en cola; se reintentará al recuperar la conexión.'),
            ),
            backgroundColor: result.uploaded ? null : scheme.errorContainer,
          ),
        );
        if (result.uploaded) {
          await _refreshServer();
        }
      }
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Evidencia fotográfica'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshServer,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Tarea',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          SelectableText(widget.taskId, style: theme.textTheme.bodySmall),
          const SizedBox(height: 16),
          SwitchListTile(
            title: const Text('Incluir geolocalización'),
            subtitle: const Text(
              'Opcional: se adjunta lat/lng al registrar la evidencia.',
            ),
            value: _includeGps,
            onChanged: _busy ? null : (v) => setState(() => _includeGps = v),
          ),
          const SizedBox(height: 8),
          Text(
            'Marca temporal',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Se envía automáticamente la hora UTC de captura al servidor (metadato capturedAt).',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: _busy ? null : () => _captureAndEnqueue('BEFORE'),
                  icon: const Icon(Icons.photo_camera_outlined),
                  label: const Text('Foto BEFORE'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: FilledButton.icon(
                  onPressed: _busy ? null : () => _captureAndEnqueue('AFTER'),
                  icon: const Icon(Icons.photo_camera),
                  label: const Text('Foto AFTER'),
                ),
              ),
            ],
          ),
          if (_busy) ...[
            const SizedBox(height: 16),
            const Center(child: CircularProgressIndicator()),
          ],
          const SizedBox(height: 28),
          Text(
            'Pendiente de subir (este dispositivo)',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          if (_pendingRows.isEmpty)
            Text(
              'Nada en cola.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            )
          else
            Column(
              children:
                  _pendingRows.map((r) {
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.cloud_upload_outlined),
                        title: Text(
                          '${r.evidenceKind} · intentos ${r.attempts}',
                        ),
                        subtitle: Text(
                          '${r.capturedAtIso}\n${r.localPath}',
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing:
                            r.lastError != null
                                ? Icon(
                                  Icons.error_outline,
                                  color: theme.colorScheme.error,
                                )
                                : null,
                        onTap:
                            r.lastError != null
                                ? () {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(r.lastError!)),
                                  );
                                }
                                : null,
                      ),
                    );
                  }).toList(),
            ),
          const SizedBox(height: 28),
          _ServerEvidenceSection(
            error: _serverError,
            attachments: _serverAttachments,
          ),
        ],
      ),
    );
  }
}

/// Galería compacta de evidencias ya subidas al servidor.
class _ServerEvidenceSection extends StatelessWidget {
  const _ServerEvidenceSection({
    required this.error,
    required this.attachments,
  });

  final String? error;
  final List<dynamic> attachments;

  List<Map<String, dynamic>> get _evidenceItems {
    return attachments
        .whereType<Map>()
        .map((m) => Map<String, dynamic>.from(m))
        .where((a) {
          final kind = '${a['evidenceKind'] ?? ''}'.toUpperCase();
          if (kind == 'BEFORE' || kind == 'AFTER') return true;
          final mime = '${a['mimeType'] ?? ''}';
          final name = '${a['filename'] ?? ''}';
          return mime.startsWith('image/') ||
              RegExp(
                r'\.(jpe?g|png|webp|gif)$',
                caseSensitive: false,
              ).hasMatch(name);
        })
        .toList();
  }

  void _openPreview(BuildContext context, Map<String, dynamic> item) {
    final url = resolveUploadUrl('${item['url'] ?? ''}');
    if (url.isEmpty) return;
    showDialog<void>(
      context: context,
      builder:
          (ctx) => Dialog(
            insetPadding: const EdgeInsets.all(20),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: InteractiveViewer(
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder:
                      (_, __, ___) => const Padding(
                        padding: EdgeInsets.all(32),
                        child: Icon(Icons.broken_image_outlined, size: 48),
                      ),
                ),
              ),
            ),
          ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final items = _evidenceItems;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Text(
              'En servidor',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: scheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                '${items.length}',
                style: theme.textTheme.labelSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (error != null)
          Text(
            error!,
            style: theme.textTheme.bodySmall?.copyWith(color: scheme.error),
          )
        else if (items.isEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: scheme.outlineVariant.withValues(alpha: 0.6),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.photo_library_outlined,
                  size: 18,
                  color: scheme.onSurfaceVariant,
                ),
                const SizedBox(width: 10),
                Text(
                  'Sin fotos en el servidor',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          )
        else
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: scheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: scheme.outlineVariant.withValues(alpha: 0.5),
              ),
            ),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
                childAspectRatio: 0.82,
              ),
              itemCount: items.length,
              itemBuilder:
                  (context, i) => _EvidenceThumbTile(
                    item: items[i],
                    onTap: () => _openPreview(context, items[i]),
                  ),
            ),
          ),
      ],
    );
  }
}

class _EvidenceThumbTile extends StatelessWidget {
  const _EvidenceThumbTile({required this.item, required this.onTap});

  final Map<String, dynamic> item;
  final VoidCallback onTap;

  static String _formatCaptured(String? raw) {
    if (raw == null || raw.isEmpty) return '';
    final d = DateTime.tryParse(raw);
    if (d == null) return '';
    return DateFormat('d MMM · HH:mm').format(d.toLocal());
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final kind = '${item['evidenceKind'] ?? ''}'.toUpperCase();
    final isBefore = kind == 'BEFORE';
    final isAfter = kind == 'AFTER';
    final url = resolveUploadUrl('${item['url'] ?? ''}');
    final captured = _formatCaptured('${item['capturedAt'] ?? ''}');
    final hasGps = item['latitude'] != null && item['longitude'] != null;

    final badgeBg =
        isBefore
            ? scheme.secondaryContainer
            : isAfter
            ? scheme.tertiaryContainer
            : scheme.surfaceContainerHighest;
    final badgeFg =
        isBefore
            ? scheme.onSecondaryContainer
            : isAfter
            ? scheme.onTertiaryContainer
            : scheme.onSurfaceVariant;
    final badgeLabel =
        isBefore
            ? 'ANTES'
            : isAfter
            ? 'DESPUÉS'
            : (kind.isNotEmpty ? kind : 'FOTO');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    ColoredBox(
                      color: scheme.surfaceContainerHigh,
                      child:
                          url.isEmpty
                              ? Icon(
                                Icons.image_outlined,
                                color: scheme.onSurfaceVariant,
                                size: 22,
                              )
                              : Image.network(
                                url,
                                fit: BoxFit.cover,
                                errorBuilder:
                                    (_, __, ___) => Icon(
                                      Icons.broken_image_outlined,
                                      color: scheme.onSurfaceVariant,
                                      size: 22,
                                    ),
                              ),
                    ),
                    Positioned(
                      top: 4,
                      left: 4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 5,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: badgeBg.withValues(alpha: 0.95),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          badgeLabel,
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.3,
                            color: badgeFg,
                          ),
                        ),
                      ),
                    ),
                    if (hasGps)
                      Positioned(
                        top: 4,
                        right: 4,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.45),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.all(2),
                            child: Icon(
                              Icons.location_on,
                              size: 11,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            if (captured.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                captured,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  fontSize: 9,
                  color: scheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
