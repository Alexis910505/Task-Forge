import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/env.dart';
import '../../features/auth/application/auth_repository.dart';

final dioProvider = Provider<Dio>((ref) {
  final auth = ref.watch(authRepositoryProvider);
  final dio = Dio(
    BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: const {'Content-Type': 'application/json'},
    ),
  );
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        // Multipart necesita boundary automático; no forzar application/json.
        if (options.data is FormData) {
          options.headers.remove('Content-Type');
          options.headers.remove('content-type');
        }
        final session = auth.maybeWhen(data: (v) => v, orElse: () => null);
        final token = session?.accessToken;
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (e, handler) async {
        final session = auth.maybeWhen(data: (v) => v, orElse: () => null);
        // FormData no se puede reenviar tras consumir el stream.
        if (e.requestOptions.data is FormData) {
          return handler.next(e);
        }
        if (e.response?.statusCode == 401 && session?.refreshToken != null) {
          final refreshed =
              await ref.read(authRepositoryProvider.notifier).tryRefreshSession();
          if (refreshed == true) {
            final latest = ref.read(authRepositoryProvider).maybeWhen(
                  data: (v) => v,
                  orElse: () => null,
                );
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
            await ref.read(authRepositoryProvider.notifier).clearLocalSession();
          }
        }
        return handler.next(e);
      },
    ),
  );
  ref.onDispose(dio.close);
  return dio;
});
