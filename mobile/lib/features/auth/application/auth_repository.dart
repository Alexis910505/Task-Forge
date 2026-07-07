import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/config/env.dart';
import '../../../core/network/plain_dio_provider.dart';
import '../../../core/storage/client_session.dart';
import '../../../core/storage/secure_storage_provider.dart';

const _kAccess = 'tf_access';
const _kRefresh = 'tf_refresh';

class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    this.profile,
  });

  final String accessToken;
  final String refreshToken;
  final Map<String, dynamic>? profile;

  AuthSession copyWith({
    String? accessToken,
    String? refreshToken,
    Map<String, dynamic>? profile,
  }) {
    return AuthSession(
      accessToken: accessToken ?? this.accessToken,
      refreshToken: refreshToken ?? this.refreshToken,
      profile: profile ?? this.profile,
    );
  }
}

class AuthRepository extends StateNotifier<AsyncValue<AuthSession?>> {
  AuthRepository(this._ref) : super(const AsyncValue.loading()) {
    _restore();
  }

  final Ref _ref;

  /// When true, tokens are persisted to secure storage across app restarts.
  bool _persistSessionOnDisk = true;

  Future<(String access, String refresh)?>? _refreshInFlight;

  AuthSession? get session => state.maybeWhen(data: (v) => v, orElse: () => null);

  bool _isTransientError(DioException e) {
    return e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError ||
        e.response == null;
  }

  Future<void> _persistTokens(String access, String refresh) async {
    if (!_persistSessionOnDisk) {
      return;
    }
    final storage = _ref.read(secureStorageProvider);
    await storage.write(key: _kAccess, value: access);
    await storage.write(key: _kRefresh, value: refresh);
  }

  Future<(String access, String refresh)?> _refreshTokens(String refreshToken) async {
    if (_refreshInFlight != null) {
      return _refreshInFlight!;
    }
    final future = _doRefresh(refreshToken);
    _refreshInFlight = future;
    try {
      return await future;
    } finally {
      _refreshInFlight = null;
    }
  }

  Future<(String access, String refresh)?> _doRefresh(String refreshToken) async {
    try {
      final dio = _ref.read(plainDioProvider);
      final res = await dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final data = res.data;
      if (data == null ||
          data['accessToken'] is! String ||
          data['refreshToken'] is! String) {
        return null;
      }
      return (data['accessToken'] as String, data['refreshToken'] as String);
    } on DioException catch (e) {
      if (e.response?.statusCode == 401 || e.response?.statusCode == 403) {
        return null;
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> _fetchProfile(String accessToken) async {
    final dio = _ref.read(plainDioProvider);
    final me = await dio.get<Map<String, dynamic>>(
      '/users/me',
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
    return me.data;
  }

  Future<void> _restore() async {
    state = const AsyncValue.loading();
    try {
      final storage = _ref.read(secureStorageProvider);
      final access = await storage.read(key: _kAccess);
      final refresh = await storage.read(key: _kRefresh);
      if (access == null || refresh == null) {
        _persistSessionOnDisk = false;
        state = const AsyncValue.data(null);
        return;
      }
      _persistSessionOnDisk = true;

      var accessToken = access;
      var refreshToken = refresh;
      Map<String, dynamic>? profile;

      try {
        profile = await _fetchProfile(accessToken);
      } on DioException catch (e) {
        if (e.response?.statusCode != 401) {
          if (_isTransientError(e)) {
            state = AsyncValue.data(
              AuthSession(accessToken: accessToken, refreshToken: refreshToken),
            );
            return;
          }
          state = AsyncValue.data(
            AuthSession(accessToken: accessToken, refreshToken: refreshToken),
          );
          return;
        }
        final refreshed = await _refreshTokens(refreshToken);
        if (refreshed == null) {
          await clearLocalSession();
          return;
        }
        accessToken = refreshed.$1;
        refreshToken = refreshed.$2;
        await _persistTokens(accessToken, refreshToken);
        try {
          profile = await _fetchProfile(accessToken);
        } on DioException catch (e2) {
          if (_isTransientError(e2)) {
            state = AsyncValue.data(
              AuthSession(
                accessToken: accessToken,
                refreshToken: refreshToken,
              ),
            );
            return;
          }
          if (e2.response?.statusCode == 401) {
            await clearLocalSession();
            return;
          }
          state = AsyncValue.data(
            AuthSession(
              accessToken: accessToken,
              refreshToken: refreshToken,
            ),
          );
          return;
        }
      }

      state = AsyncValue.data(
        AuthSession(
          accessToken: accessToken,
          refreshToken: refreshToken,
          profile: profile,
        ),
      );
    } catch (_) {
      state = const AsyncValue.data(null);
    }
  }

  /// Refresca tokens del usuario actual.
  /// `true` = éxito, `false` = sesión inválida, `null` = error de red (no borrar sesión).
  Future<bool?> tryRefreshSession() async {
    final current = session;
    if (current == null) {
      return false;
    }
    try {
      final refreshed = await _refreshTokens(current.refreshToken);
      if (refreshed == null) {
        return false;
      }
      await applyRefreshedTokens(
        accessToken: refreshed.$1,
        refreshToken: refreshed.$2,
      );
      return true;
    } on DioException catch (e) {
      if (_isTransientError(e)) {
        return null;
      }
      return false;
    }
  }

  Future<void> login({
    required String organizationSlug,
    required String email,
    required String password,
    bool persistSessionOnDisk = true,
  }) async {
    state = const AsyncValue.loading();
    try {
      final dio = _ref.read(plainDioProvider);
      final session = await _ref.read(clientSessionProvider).apiPayload();
      final res = await dio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'organizationSlug': organizationSlug.trim().toLowerCase(),
          'email': email,
          'password': password,
          ...session,
        },
      );
      final data = res.data;
      if (data == null ||
          data['accessToken'] is! String ||
          data['refreshToken'] is! String) {
        throw StateError('Respuesta inválida');
      }
      final access = data['accessToken'] as String;
      final refresh = data['refreshToken'] as String;
      _persistSessionOnDisk = persistSessionOnDisk;
      if (persistSessionOnDisk) {
        await _persistTokens(access, refresh);
      } else {
        final storage = _ref.read(secureStorageProvider);
        await storage.delete(key: _kAccess);
        await storage.delete(key: _kRefresh);
      }

      final authed = Dio(
        BaseOptions(
          baseUrl: Env.apiBaseUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $access',
          },
        ),
      );
      final me = await authed.get<Map<String, dynamic>>('/users/me');
      authed.close();

      state = AsyncValue.data(
        AuthSession(accessToken: access, refreshToken: refresh, profile: me.data),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> register({
    required String organizationSlug,
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    bool persistSessionOnDisk = true,
  }) async {
    state = const AsyncValue.loading();
    try {
      final dio = _ref.read(plainDioProvider);
      final session = await _ref.read(clientSessionProvider).apiPayload();
      final res = await dio.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'organizationSlug': organizationSlug.trim().toLowerCase(),
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          ...session,
        },
      );
      final data = res.data;
      if (data == null ||
          data['accessToken'] is! String ||
          data['refreshToken'] is! String) {
        throw StateError('Respuesta inválida');
      }
      final access = data['accessToken'] as String;
      final refresh = data['refreshToken'] as String;
      _persistSessionOnDisk = persistSessionOnDisk;
      if (persistSessionOnDisk) {
        await _persistTokens(access, refresh);
      } else {
        final storage = _ref.read(secureStorageProvider);
        await storage.delete(key: _kAccess);
        await storage.delete(key: _kRefresh);
      }

      final authed = Dio(
        BaseOptions(
          baseUrl: Env.apiBaseUrl,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $access',
          },
        ),
      );
      final me = await authed.get<Map<String, dynamic>>('/users/me');
      authed.close();

      state = AsyncValue.data(
        AuthSession(accessToken: access, refreshToken: refresh, profile: me.data),
      );
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      rethrow;
    }
  }

  Future<void> applyRefreshedTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _persistTokens(accessToken, refreshToken);
    final current = state.maybeWhen(data: (v) => v, orElse: () => null);
    state = AsyncValue.data(
      (current ?? AuthSession(accessToken: accessToken, refreshToken: refreshToken))
          .copyWith(accessToken: accessToken, refreshToken: refreshToken),
    );
  }

  /// Borra tokens locales sin llamar al API (p. ej. refresh inválido).
  Future<void> clearLocalSession() async {
    final storage = _ref.read(secureStorageProvider);
    await storage.delete(key: _kAccess);
    await storage.delete(key: _kRefresh);
    _persistSessionOnDisk = false;
    state = const AsyncValue.data(null);
  }

  Future<void> logout() async {
    final current = state.maybeWhen(data: (v) => v, orElse: () => null);
    if (current != null) {
      try {
        final dio = _ref.read(plainDioProvider);
        await dio.post<void>(
          '/auth/logout',
          data: {'refreshToken': current.refreshToken},
          options: Options(
            headers: {'Authorization': 'Bearer ${current.accessToken}'},
          ),
        );
      } catch (_) {
        /* red o sesión ya inválida */
      }
    }
    await clearLocalSession();
  }
}

final authRepositoryProvider =
    StateNotifierProvider<AuthRepository, AsyncValue<AuthSession?>>((ref) {
  return AuthRepository(ref);
});
