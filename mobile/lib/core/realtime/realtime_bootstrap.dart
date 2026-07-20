import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../features/auth/application/auth_repository.dart';
import 'realtime_service.dart';

/// Conecta Socket.IO cuando hay sesión y desconecta al cerrar sesión.
class RealtimeBootstrap extends StatefulWidget {
  const RealtimeBootstrap({super.key, required this.child});

  final Widget child;

  @override
  State<RealtimeBootstrap> createState() => _RealtimeBootstrapState();
}

class _RealtimeBootstrapState extends State<RealtimeBootstrap> {
  Worker? _worker;
  String? _connectedToken;

  @override
  void initState() {
    super.initState();
    final auth = Get.find<AuthController>();
    final rt = Get.find<RealtimeService>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final session = auth.currentSession;
      if (session != null) {
        _connect(rt, session.accessToken);
      }
    });
    _worker = ever<AuthSession?>(auth.session, (session) {
      if (session == null) {
        _connectedToken = null;
        rt.disconnect();
      } else {
        // Evita reconectar en cada refresh de tokens si el socket sigue vivo.
        _connect(rt, session.accessToken);
      }
    });
  }

  void _connect(RealtimeService rt, String token) {
    if (_connectedToken == token) return;
    _connectedToken = token;
    rt.connect(token);
  }

  @override
  void dispose() {
    _worker?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
