import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_repository.dart';
import '../../features/evidence/application/evidence_upload_worker.dart';
import 'offline_providers.dart';

/// Escucha la red y vacía la cola de sincronización cuando vuelve la conexión.
class OfflineSyncListener extends ConsumerStatefulWidget {
  const OfflineSyncListener({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<OfflineSyncListener> createState() => _OfflineSyncListenerState();
}

class _OfflineSyncListenerState extends ConsumerState<OfflineSyncListener> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_bootstrap());
    });
  }

  Future<void> _bootstrap() async {
    final list = await Connectivity().checkConnectivity();
    if (!mounted || !connectivityLooksOnline(list)) {
      return;
    }
    final auth = ref.read(authRepositoryProvider);
    if (!auth.hasValue || auth.asData?.value == null) {
      return;
    }
    await ref.read(outboxSyncServiceProvider).bootstrapFlush();
    await ref.read(evidenceUploadWorkerProvider).processPending();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authRepositoryProvider, (prev, next) {
      next.whenData((session) async {
        if (session == null) {
          return;
        }
        final list = await Connectivity().checkConnectivity();
        if (!mounted || !connectivityLooksOnline(list)) {
          return;
        }
        await ref.read(outboxSyncServiceProvider).processQueue();
        await ref.read(evidenceUploadWorkerProvider).processPending();
      });
    });
    ref.listen(connectivityProvider, (prev, next) {
      next.whenData((list) async {
        if (!connectivityLooksOnline(list)) {
          return;
        }
        final auth = ref.read(authRepositoryProvider);
        if (!auth.hasValue || auth.asData?.value == null) {
          return;
        }
        await ref.read(outboxSyncServiceProvider).processQueue();
        await ref.read(evidenceUploadWorkerProvider).processPending();
      });
    });
    return widget.child;
  }
}
