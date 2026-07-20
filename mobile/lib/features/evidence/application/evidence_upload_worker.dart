import 'dart:async';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:path/path.dart' as p;

import '../../../core/network/dio_provider.dart';
import '../../../core/offline/app_database.dart';
import '../../auth/application/auth_repository.dart';

class EvidenceEnqueueResult {
  const EvidenceEnqueueResult({required this.uploaded, this.error});

  final bool uploaded;
  final String? error;
}

String _formatUploadError(Object e) {
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
    final code = e.response?.statusCode;
    if (code != null) {
      return 'Error $code: ${e.message ?? e}';
    }
    return e.message ?? '$e';
  }
  return '$e';
}

/// Sube evidencias encoladas en SQLite (multipart) cuando hay sesión y red.
class EvidenceUploadWorker {
  EvidenceUploadWorker();
  static const int maxAttempts = 12;

  Future<int>? _processChain;

  Future<int> processPending() {
    _processChain ??= _runProcessPending().whenComplete(() {
      _processChain = null;
    });
    return _processChain!;
  }

  Future<int> _runProcessPending() async {
    var completed = 0;
    final session = Get.find<AuthController>().currentSession;
    if (session == null) {
      return 0;
    }

    final db = Get.find<AppDatabase>();
    final dio = Get.find<ApiClient>().dio;
    final rows = await db.select(db.evidenceUploadQueue).get();

    for (final row in rows) {
      if (row.attempts >= maxAttempts) {
        continue;
      }
      if (!File(row.localPath).existsSync()) {
        await (db.delete(db.evidenceUploadQueue)
          ..where((t) => t.id.equals(row.id))).go();
        continue;
      }
      try {
        final form = FormData.fromMap({
          'file': await MultipartFile.fromFile(
            row.localPath,
            filename:
                p.basename(row.localPath).endsWith('.jpg')
                    ? p.basename(row.localPath)
                    : '${p.basenameWithoutExtension(row.localPath)}.jpg',
            contentType: DioMediaType.parse('image/jpeg'),
          ),
          'evidenceKind': row.evidenceKind,
          'capturedAt': row.capturedAtIso,
          if (row.latitude != null) 'latitude': row.latitude.toString(),
          if (row.longitude != null) 'longitude': row.longitude.toString(),
        });
        await dio.post<dynamic>(
          '/tasks/${row.taskId}/attachments/upload',
          data: form,
          options: Options(
            sendTimeout: const Duration(minutes: 2),
            receiveTimeout: const Duration(seconds: 60),
          ),
        );
        try {
          await File(row.localPath).delete();
        } catch (_) {}
        await (db.delete(db.evidenceUploadQueue)
          ..where((t) => t.id.equals(row.id))).go();
        completed++;
      } catch (e) {
        await (db.update(db.evidenceUploadQueue)
          ..where((t) => t.id.equals(row.id))).write(
          EvidenceUploadQueueCompanion(
            attempts: Value(row.attempts + 1),
            lastError: Value(_formatUploadError(e)),
          ),
        );
      }
    }
    return completed;
  }

  Future<EvidenceEnqueueResult> enqueue({
    required String taskId,
    required String evidenceKind,
    required String localPath,
    required String capturedAtIso,
    double? latitude,
    double? longitude,
  }) async {
    final session = Get.find<AuthController>().currentSession;
    if (session == null) {
      return const EvidenceEnqueueResult(
        uploaded: false,
        error: 'Inicia sesión para subir evidencias.',
      );
    }

    final db = Get.find<AppDatabase>();
    final rowId = await db
        .into(db.evidenceUploadQueue)
        .insert(
          EvidenceUploadQueueCompanion.insert(
            taskId: taskId,
            evidenceKind: evidenceKind,
            localPath: localPath,
            capturedAtIso: capturedAtIso,
            latitude: latitude == null ? const Value.absent() : Value(latitude),
            longitude:
                longitude == null ? const Value.absent() : Value(longitude),
          ),
        );
    await processPending();
    final remaining =
        await (db.select(db.evidenceUploadQueue)
          ..where((t) => t.id.equals(rowId))).getSingleOrNull();
    if (remaining == null) {
      return const EvidenceEnqueueResult(uploaded: true);
    }
    return EvidenceEnqueueResult(
      uploaded: false,
      error: remaining.lastError ?? 'No se pudo subir la foto.',
    );
  }
}
