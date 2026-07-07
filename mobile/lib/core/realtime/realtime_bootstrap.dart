import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_repository.dart';
import 'realtime_providers.dart';

/// Conecta Socket.IO cuando hay sesión y desconecta al cerrar sesión.
class RealtimeBootstrap extends ConsumerStatefulWidget {
  const RealtimeBootstrap({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<RealtimeBootstrap> createState() => _RealtimeBootstrapState();
}

class _RealtimeBootstrapState extends ConsumerState<RealtimeBootstrap> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = ref.read(authRepositoryProvider).valueOrNull;
      if (session != null) {
        ref.read(realtimeServiceProvider).connect(session.accessToken);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authRepositoryProvider, (prev, next) {
      next.whenData((session) {
        if (session == null) {
          ref.read(realtimeServiceProvider).disconnect();
        } else {
          ref.read(realtimeServiceProvider).connect(session.accessToken);
        }
      });
    });
    return widget.child;
  }
}
