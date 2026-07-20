import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../features/auth/application/auth_repository.dart';
import '../../features/evidence/application/evidence_upload_worker.dart';
import 'connectivity_service.dart';
import 'outbox_sync_service.dart';

/// Escucha la red y vacía la cola de sincronización cuando vuelve la conexión.
class OfflineSyncListener extends StatefulWidget {
  const OfflineSyncListener({super.key, required this.child});

  final Widget child;

  @override
  State<OfflineSyncListener> createState() => _OfflineSyncListenerState();
}

class _OfflineSyncListenerState extends State<OfflineSyncListener> {
  Worker? _authWorker;
  Worker? _onlineWorker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      unawaited(_bootstrap());
    });
    final auth = Get.find<AuthController>();
    final connectivity = Get.find<ConnectivityService>();
    _authWorker = ever<AuthSession?>(auth.session, (session) async {
      if (session == null) return;
      if (!connectivity.online.value) return;
      await Get.find<OutboxSyncService>().processQueue();
      await Get.find<EvidenceUploadWorker>().processPending();
    });
    _onlineWorker = ever<bool>(connectivity.online, (isOnline) async {
      if (!isOnline) return;
      if (!auth.isLoggedIn) return;
      await Get.find<OutboxSyncService>().processQueue();
      await Get.find<EvidenceUploadWorker>().processPending();
    });
  }

  Future<void> _bootstrap() async {
    final list = await Connectivity().checkConnectivity();
    if (!mounted || !connectivityLooksOnline(list)) {
      return;
    }
    if (!Get.find<AuthController>().isLoggedIn) {
      return;
    }
    await Get.find<OutboxSyncService>().bootstrapFlush();
    await Get.find<EvidenceUploadWorker>().processPending();
  }

  @override
  void dispose() {
    _authWorker?.dispose();
    _onlineWorker?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
