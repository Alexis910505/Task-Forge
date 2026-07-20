import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'token_refresh_service.dart';

/// Activa el scheduler de refresh y renueva al volver a primer plano.
class TokenRefreshBootstrap extends StatefulWidget {
  const TokenRefreshBootstrap({super.key, required this.child});

  final Widget child;

  @override
  State<TokenRefreshBootstrap> createState() => _TokenRefreshBootstrapState();
}

class _TokenRefreshBootstrapState extends State<TokenRefreshBootstrap>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Get.find<TokenRefreshService>().start();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      Get.find<TokenRefreshService>().onAppResumed();
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
