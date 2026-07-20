import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;

import '../../../core/offline/app_database.dart';

enum SyncQueueItemStatus { syncing, paused, waiting, error }

class SyncQueueItem {
  const SyncQueueItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.status,
  });

  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final SyncQueueItemStatus status;
}

class ReportsSyncQueueController extends GetxController {
  final items = <SyncQueueItem>[].obs;
  StreamSubscription<List<SyncQueueItem>>? _subscription;

  @override
  void onInit() {
    super.onInit();
    _subscription = _watchSyncQueue(
      Get.find<AppDatabase>(),
    ).listen(items.assignAll, onError: (_) => items.clear());
  }

  @override
  void onClose() {
    _subscription?.cancel();
    super.onClose();
  }
}

Stream<List<SyncQueueItem>> _watchSyncQueue(AppDatabase db) {
  late final StreamSubscription<dynamic> sub1;
  late final StreamSubscription<dynamic> sub2;
  final controller = StreamController<List<SyncQueueItem>>();

  Future<void> emit() async {
    if (controller.isClosed) {
      return;
    }
    try {
      controller.add(await _loadSyncQueue(db));
    } catch (e, st) {
      if (!controller.isClosed) {
        controller.addError(e, st);
      }
    }
  }

  sub1 = db.select(db.outboxOperations).watch().listen((_) => emit());
  sub2 = db.select(db.evidenceUploadQueue).watch().listen((_) => emit());
  emit();

  controller.onCancel = () async {
    await sub1.cancel();
    await sub2.cancel();
  };

  return controller.stream;
}

Future<List<SyncQueueItem>> _loadSyncQueue(AppDatabase db) async {
  final items = <SyncQueueItem>[];
  final outbox = await db.select(db.outboxOperations).get();
  for (final row in outbox) {
    items.add(await _outboxItem(row));
  }
  final evidence = await db.select(db.evidenceUploadQueue).get();
  for (final row in evidence) {
    items.add(await _evidenceItem(row));
  }
  return items;
}

Future<SyncQueueItem> _outboxItem(OutboxOperation row) async {
  Map<String, dynamic>? body;
  if (row.bodyJson != null && row.bodyJson!.isNotEmpty) {
    try {
      final decoded = jsonDecode(row.bodyJson!);
      if (decoded is Map) {
        body = Map<String, dynamic>.from(decoded);
      }
    } catch (_) {}
  }
  final title =
      row.path == '/tasks' && body?['title'] != null
          ? '${body!['title']}'
          : row.path.startsWith('/tasks/')
          ? 'Task update'
          : row.path;
  final status =
      row.attempts >= 3
          ? SyncQueueItemStatus.error
          : row.attempts > 0
          ? SyncQueueItemStatus.waiting
          : SyncQueueItemStatus.syncing;

  return SyncQueueItem(
    id: 'outbox-${row.id}',
    title: title,
    subtitle:
        row.lastError != null && row.lastError!.isNotEmpty
            ? row.lastError!
            : '${row.method} ${row.path}',
    icon: Icons.description_outlined,
    status: status,
  );
}

Future<SyncQueueItem> _evidenceItem(EvidenceUploadQueueData row) async {
  final file = File(row.localPath);
  var sizeLabel = '';
  if (await file.exists()) {
    final bytes = await file.length();
    sizeLabel = _formatBytes(bytes);
  }
  final name = row.localPath.split(Platform.pathSeparator).last;
  final paused = row.attempts > 0 && row.attempts < 10;

  return SyncQueueItem(
    id: 'evidence-${row.id}',
    title: name.isNotEmpty ? name : 'Photo evidence',
    subtitle:
        row.lastError != null && row.lastError!.isNotEmpty
            ? row.lastError!
            : sizeLabel.isEmpty
            ? 'Pending upload'
            : 'Pending upload • $sizeLabel',
    icon: Icons.photo_outlined,
    status:
        row.attempts >= 10
            ? SyncQueueItemStatus.error
            : paused
            ? SyncQueueItemStatus.paused
            : SyncQueueItemStatus.syncing,
  );
}

String _formatBytes(int bytes) {
  if (bytes < 1024) {
    return '${bytes}B';
  }
  if (bytes < 1024 * 1024) {
    return '${(bytes / 1024).toStringAsFixed(1)}KB';
  }
  return '${(bytes / (1024 * 1024)).toStringAsFixed(1)}MB';
}
