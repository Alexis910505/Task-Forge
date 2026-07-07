import 'dart:convert';
import 'dart:io';

import 'package:drift/drift.dart';

import 'app_database.dart';
import 'cache_keys.dart';

/// Caché JSON + tareas materializadas en SQLite (Drift).
class LocalDataService {
  LocalDataService(this._db);

  final AppDatabase _db;

  Future<void> saveBoard(String boardId, Map<String, dynamic> board) async {
    await _db.into(_db.cacheEntries).insertOnConflictUpdate(
      CacheEntriesCompanion.insert(
        entryKey: CacheKeys.board(boardId),
        payload: jsonEncode(board),
        updatedAt: DateTime.now(),
      ),
    );
    await _replaceCachedTasksForBoard(boardId, board);
  }

  Future<Map<String, dynamic>?> readBoard(String boardId) async {
    final row = await (_db.select(_db.cacheEntries)
          ..where((t) => t.entryKey.equals(CacheKeys.board(boardId))))
        .getSingleOrNull();
    if (row == null) {
      return null;
    }
    return jsonDecode(row.payload) as Map<String, dynamic>;
  }

  Future<void> saveDashboard(Map<String, dynamic> data) async {
    await _db.into(_db.cacheEntries).insertOnConflictUpdate(
      CacheEntriesCompanion.insert(
        entryKey: CacheKeys.dashboardSummary,
        payload: jsonEncode(data),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<Map<String, dynamic>?> readDashboard() async {
    final row = await (_db.select(_db.cacheEntries)
          ..where((t) => t.entryKey.equals(CacheKeys.dashboardSummary)))
        .getSingleOrNull();
    if (row == null) {
      return null;
    }
    return jsonDecode(row.payload) as Map<String, dynamic>;
  }

  Future<List<CachedTask>> tasksForBoard(String boardId) {
    return (_db.select(_db.cachedTasks)..where((t) => t.boardId.equals(boardId))).get();
  }

  Future<void> saveDefaultBoardId(String boardId) async {
    await _db.into(_db.cacheEntries).insertOnConflictUpdate(
      CacheEntriesCompanion.insert(
        entryKey: CacheKeys.defaultBoardId,
        payload: jsonEncode({'boardId': boardId}),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<String?> readDefaultBoardId() async {
    final row = await (_db.select(_db.cacheEntries)
          ..where((t) => t.entryKey.equals(CacheKeys.defaultBoardId)))
        .getSingleOrNull();
    if (row == null) return null;
    final data = jsonDecode(row.payload);
    if (data is Map && data['boardId'] is String) {
      return data['boardId'] as String;
    }
    return null;
  }

  Future<String?> firstCachedBoardId() async {
    final saved = await readDefaultBoardId();
    if (saved != null && saved.isNotEmpty) return saved;
    final rows = await _db.select(_db.cacheEntries).get();
    for (final row in rows) {
      if (row.entryKey.startsWith('board:')) {
        return row.entryKey.substring('board:'.length);
      }
    }
    return null;
  }

  Future<void> upsertCachedTask({
    required String id,
    required String boardId,
    required String title,
    required String status,
    required Map<String, dynamic> payload,
  }) async {
    await _db.into(_db.cachedTasks).insertOnConflictUpdate(
      CachedTasksCompanion.insert(
        id: id,
        boardId: boardId,
        title: title,
        status: status,
        payload: jsonEncode(payload),
        updatedAt: DateTime.now(),
      ),
    );
  }

  Future<void> remapEvidenceTaskId(String fromId, String toId) async {
    final rows = await (_db.select(_db.evidenceUploadQueue)
          ..where((t) => t.taskId.equals(fromId)))
        .get();
    for (final row in rows) {
      await (_db.update(_db.evidenceUploadQueue)..where((t) => t.id.equals(row.id))).write(
            EvidenceUploadQueueCompanion(taskId: Value(toId)),
          );
    }
  }

  Future<int> outboxCount() async {
    final rows = await _db.select(_db.outboxOperations).get();
    return rows.length;
  }

  Stream<int> watchOutboxCount() {
    return _db.select(_db.outboxOperations).watch().map((r) => r.length);
  }

  Future<DateTime?> lastCacheUpdatedAt() async {
    final rows = await _db.select(_db.cacheEntries).get();
    if (rows.isEmpty) {
      return null;
    }
    var latest = rows.first.updatedAt;
    for (final row in rows.skip(1)) {
      if (row.updatedAt.isAfter(latest)) {
        latest = row.updatedAt;
      }
    }
    return latest;
  }

  /// Borra caché y cola (p. ej. al cerrar sesión).
  Future<void> clearAllUserData() async {
    final evidenceRows = await _db.select(_db.evidenceUploadQueue).get();
    for (final r in evidenceRows) {
      try {
        await File(r.localPath).delete();
      } catch (_) {}
    }
    await _db.transaction(() async {
      await _db.delete(_db.cacheEntries).go();
      await _db.delete(_db.cachedTasks).go();
      await _db.delete(_db.outboxOperations).go();
      await _db.delete(_db.evidenceUploadQueue).go();
    });
  }

  Future<void> _replaceCachedTasksForBoard(String boardId, Map<String, dynamic> board) {
    return _db.transaction(() async {
      await (_db.delete(_db.cachedTasks)..where((t) => t.boardId.equals(boardId))).go();
      final columns = (board['columns'] as List?) ?? [];
      final now = DateTime.now();
      for (final col in columns) {
        final m = col as Map<String, dynamic>;
        final colStatus = '${m['status']}';
        final tasks = (m['tasks'] as List?) ?? [];
        for (final raw in tasks) {
          final tm = Map<String, dynamic>.from(raw as Map);
          final tid = '${tm['id']}';
          final title = '${tm['title']}';
          final status = '${tm['status'] ?? colStatus}';
          await _db.into(_db.cachedTasks).insert(
                CachedTasksCompanion.insert(
                  id: tid,
                  boardId: boardId,
                  title: title,
                  status: status,
                  payload: jsonEncode(tm),
                  updatedAt: now,
                ),
              );
        }
      }
    });
  }
}
