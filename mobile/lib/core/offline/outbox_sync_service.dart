import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:drift/drift.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;

import '../../features/auth/application/auth_repository.dart';
import '../network/dio_provider.dart';
import 'app_database.dart';
import 'local_data_service.dart';

/// Procesa la cola de operaciones pendientes (PATCH, POST, etc.) cuando hay sesión y red.
class OutboxSyncService extends GetxService {
  static const int maxAttempts = 10;

  bool _sessionOk() => Get.find<AuthController>().isLoggedIn;

  Future<void> enqueuePatch(String path, Map<String, dynamic>? body) async {
    await _enqueue('PATCH', path, body);
  }

  Future<void> enqueuePost(String path, Map<String, dynamic> body) async {
    await _enqueue('POST', path, body);
  }

  Future<void> _enqueue(String method, String path, Map<String, dynamic>? body) async {
    final db = Get.find<AppDatabase>();
    await db.into(db.outboxOperations).insert(
          OutboxOperationsCompanion.insert(
            method: method,
            path: path,
            bodyJson: body == null ? const Value.absent() : Value(jsonEncode(body)),
          ),
        );
  }

  Future<int> bootstrapFlush() async {
    if (!_sessionOk()) {
      return 0;
    }
    return processQueue();
  }

  Future<int> processQueue() async {
    if (!_sessionOk()) {
      return 0;
    }
    final db = Get.find<AppDatabase>();
    final dio = Get.find<ApiClient>().dio;
    final local = LocalDataService(db);
    final rows = await db.select(db.outboxOperations).get();
    var completed = 0;
    for (final row in rows) {
      if (row.attempts >= maxAttempts) {
        continue;
      }
      try {
        Map<String, dynamic>? body;
        if (row.bodyJson != null && row.bodyJson!.isNotEmpty) {
          body = Map<String, dynamic>.from(jsonDecode(row.bodyJson!) as Map);
        }
        final clientTempId = body?['clientTempId']?.toString();
        if (clientTempId != null) {
          body = Map<String, dynamic>.from(body!)..remove('clientTempId');
        }

        final res = await dio.request<dynamic>(
          row.path,
          data: body,
          options: Options(
            method: row.method,
            headers: const {'Content-Type': 'application/json'},
          ),
        );

        if (row.method == 'POST' &&
            row.path == '/tasks' &&
            clientTempId != null &&
            res.data is Map) {
          final created = Map<String, dynamic>.from(res.data as Map);
          final serverId = created['id']?.toString();
          if (serverId != null) {
            await local.remapEvidenceTaskId(clientTempId, serverId);
            await (db.delete(db.cachedTasks)..where((t) => t.id.equals(clientTempId))).go();
          }
        }

        await (db.delete(db.outboxOperations)..where((t) => t.id.equals(row.id))).go();
        completed++;
      } catch (e) {
        await (db.update(db.outboxOperations)..where((t) => t.id.equals(row.id))).write(
              OutboxOperationsCompanion(
                attempts: Value(row.attempts + 1),
                lastError: Value('$e'),
              ),
            );
      }
    }
    return completed;
  }
}
