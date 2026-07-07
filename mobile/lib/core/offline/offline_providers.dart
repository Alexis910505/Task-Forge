import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'database_provider.dart';
import 'local_data_service.dart';
import 'outbox_sync_service.dart';

final localDataServiceProvider = Provider<LocalDataService>((ref) {
  return LocalDataService(ref.watch(appDatabaseProvider));
});

final outboxSyncServiceProvider = Provider<OutboxSyncService>((ref) {
  return OutboxSyncService(ref);
});

final connectivityProvider = StreamProvider<List<ConnectivityResult>>((ref) {
  return Connectivity().onConnectivityChanged;
});

bool connectivityLooksOnline(List<ConnectivityResult> results) {
  if (results.isEmpty) {
    return false;
  }
  return results.any((r) => r != ConnectivityResult.none);
}

/// Número de operaciones pendientes de sincronizar (cola outbox).
final pendingOutboxCountProvider = StreamProvider<int>((ref) {
  return ref.watch(localDataServiceProvider).watchOutboxCount();
});
