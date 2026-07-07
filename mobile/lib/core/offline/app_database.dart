import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:sqlite3_flutter_libs/sqlite3_flutter_libs.dart';

part 'app_database.g.dart';

/// Caché clave-valor (JSON) para respuestas de API (dashboard, tableros, etc.).
class CacheEntries extends Table {
  TextColumn get entryKey => text()();
  TextColumn get payload => text()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>>? get primaryKey => {entryKey};
}

/// Cola de mutaciones pendientes de sincronizar con el servidor.
class OutboxOperations extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get method => text()();
  TextColumn get path => text()();
  TextColumn get bodyJson => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
}

/// Tareas materializadas para consultas locales y listados offline.
class CachedTasks extends Table {
  TextColumn get id => text()();
  TextColumn get boardId => text()();
  TextColumn get title => text()();
  TextColumn get status => text()();
  TextColumn get payload => text()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column<Object>>? get primaryKey => {id};
}

/// Cola de subidas de evidencia fotográfica (proceso en segundo plano cuando hay red).
class EvidenceUploadQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get taskId => text()();
  TextColumn get evidenceKind => text()();
  TextColumn get localPath => text()();
  TextColumn get capturedAtIso => text()();
  RealColumn get latitude => real().nullable()();
  RealColumn get longitude => real().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  IntColumn get attempts => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
}

@DriftDatabase(tables: [CacheEntries, OutboxOperations, CachedTasks, EvidenceUploadQueue])
class AppDatabase extends _$AppDatabase {
  AppDatabase([QueryExecutor? executor]) : super(executor ?? _openConnection());

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (Migrator m) async {
          await m.createAll();
        },
        onUpgrade: (Migrator m, int from, int to) async {
          if (from < 2) {
            await m.createTable(evidenceUploadQueue);
          }
        },
      );
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    if (Platform.isAndroid) {
      await applyWorkaroundToOpenSqlite3OnOldAndroidVersions();
    }
    final dir = await getApplicationSupportDirectory();
    final file = File(p.join(dir.path, 'task_forge_offline.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
