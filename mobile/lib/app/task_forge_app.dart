import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:get/get.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../core/auth/token_refresh_bootstrap.dart';
import '../core/i18n/locale_controller.dart';
import '../core/offline/offline_sync_listener.dart';
import '../core/realtime/realtime_bootstrap.dart';
import '../core/router/app_router.dart';
import '../core/theme/app_theme.dart';

class TaskForgeApp extends StatelessWidget {
  const TaskForgeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return OfflineSyncListener(
      child: TokenRefreshBootstrap(
        child: RealtimeBootstrap(
          child: Obx(() {
            final locale = Get.find<LocaleController>().locale.value;
            return MaterialApp.router(
              title: 'TaskForge',
              debugShowCheckedModeBanner: false,
              theme: AppTheme.light,
              darkTheme: AppTheme.dark,
              themeMode: ThemeMode.system,
              locale: locale,
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: const [
                AppLocalizations.delegate,
                GlobalMaterialLocalizations.delegate,
                GlobalWidgetsLocalizations.delegate,
                GlobalCupertinoLocalizations.delegate,
              ],
              routerConfig: appRouter,
            );
          }),
        ),
      ),
    );
  }
}
