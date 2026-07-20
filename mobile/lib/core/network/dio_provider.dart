import 'package:dio/dio.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response;

import '../../features/auth/application/auth_repository.dart';
import '../auth/token_refresh_service.dart';
import '../config/env.dart';

/// Cliente HTTP global (GetX). `dio` autentica; `plainDio` no.
class ApiClient extends GetxService {
  late final Dio plainDio;
  late final Dio dio;

  @override
  void onInit() {
    super.onInit();
    plainDio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: const {'Content-Type': 'application/json'},
      ),
    );

    dio = Dio(
      BaseOptions(
        baseUrl: Env.apiBaseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 20),
        headers: const {'Content-Type': 'application/json'},
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          if (options.data is FormData) {
            options.headers.remove('Content-Type');
            options.headers.remove('content-type');
          }

          final tokenRefresh = Get.find<TokenRefreshService>();
          final auth = Get.find<AuthController>();
          await tokenRefresh.ensureFreshAccessToken();
          final token = auth.currentSession?.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (e, handler) async {
          if (e.requestOptions.data is FormData) {
            return handler.next(e);
          }
          final auth = Get.find<AuthController>();
          final tokenRefresh = Get.find<TokenRefreshService>();
          final hadSession = auth.currentSession?.refreshToken != null;
          if (e.response?.statusCode == 401 && hadSession) {
            final refreshed = await tokenRefresh.refreshNow();
            if (refreshed == true) {
              final latest = auth.currentSession;
              if (latest != null) {
                e.requestOptions.headers['Authorization'] =
                    'Bearer ${latest.accessToken}';
              }
              try {
                final clone = await dio.fetch(e.requestOptions);
                return handler.resolve(clone);
              } catch (_) {
                return handler.next(e);
              }
            }
            if (refreshed == false) {
              await auth.clearLocalSession();
            }
          }
          return handler.next(e);
        },
      ),
    );
  }

  @override
  void onClose() {
    dio.close();
    plainDio.close();
    super.onClose();
  }
}
