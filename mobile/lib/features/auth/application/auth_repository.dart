import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response;

import '../../../core/auth/jwt_utils.dart';
import '../../../core/config/env.dart';
import '../../../core/network/dio_provider.dart';
import '../../../core/storage/client_session.dart';

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

class AuthController extends GetxController {
  final isBootstrapping = true.obs;
  final session = Rxn<AuthSession>();
  final authError = Rxn<Object>();

  bool _persistSessionOnDisk = true;
  Future<(String access, String refresh)?>? _refreshInFlight;
  Future<bool?>? _tryRefreshInFlight;

  FlutterSecureStorage get _storage => Get.find<FlutterSecureStorage>();
  Dio get _plainDio => Get.find<ApiClient>().plainDio;
  ClientSessionHelper get _clientSession => Get.find<ClientSessionHelper>();

  AuthSession? get currentSession => session.value;
  bool get isLoggedIn => session.value != null;

  String? get currentUserId {
    final fromProfile = session.value?.profile?['id']?.toString();
    if (fromProfile != null && fromProfile.isNotEmpty) {
      return fromProfile;
    }
    final token = session.value?.accessToken;
    if (token == null || token.isEmpty) {
      return null;
    }
    return JwtUtils.userId(token);
  }

  @override
  void onInit() {
    super.onInit();
    unawaited(_restore());
  }

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
    await _storage.write(key: _kAccess, value: access);
    await _storage.write(key: _kRefresh, value: refresh);
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
      final res = await _plainDio.post<Map<String, dynamic>>(
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
    final me = await _plainDio.get<Map<String, dynamic>>(
      '/users/me',
      options: Options(
        headers: {'Authorization': 'Bearer $accessToken'},
      ),
    );
    return me.data;
  }

  Future<void> _restore() async {
    isBootstrapping.value = true;
    authError.value = null;
    try {
      final access = await _storage.read(key: _kAccess);
      final refresh = await _storage.read(key: _kRefresh);
      if (access == null || refresh == null) {
        _persistSessionOnDisk = false;
        session.value = null;
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
          session.value = AuthSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
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
          if (_isTransientError(e2) || e2.response?.statusCode != 401) {
            session.value = AuthSession(
              accessToken: accessToken,
              refreshToken: refreshToken,
            );
            return;
          }
          await clearLocalSession();
          return;
        }
      }

      session.value = AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile,
      );
    } catch (_) {
      session.value = null;
    } finally {
      isBootstrapping.value = false;
    }
  }

  Future<bool?> tryRefreshSession() async {
    if (_tryRefreshInFlight != null) {
      return _tryRefreshInFlight;
    }
    _tryRefreshInFlight = _tryRefreshSessionImpl();
    try {
      return await _tryRefreshInFlight;
    } finally {
      _tryRefreshInFlight = null;
    }
  }

  Future<bool?> _tryRefreshSessionImpl() async {
    final current = session.value;
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
    isBootstrapping.value = true;
    authError.value = null;
    try {
      final clientPayload = await _clientSession.apiPayload();
      final res = await _plainDio.post<Map<String, dynamic>>(
        '/auth/login',
        data: {
          'organizationSlug': organizationSlug.trim().toLowerCase(),
          'email': email,
          'password': password,
          ...clientPayload,
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
        await _storage.delete(key: _kAccess);
        await _storage.delete(key: _kRefresh);
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

      session.value = AuthSession(
        accessToken: access,
        refreshToken: refresh,
        profile: me.data,
      );
    } catch (e) {
      authError.value = e;
      session.value = null;
      rethrow;
    } finally {
      isBootstrapping.value = false;
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
    isBootstrapping.value = true;
    authError.value = null;
    try {
      final clientPayload = await _clientSession.apiPayload();
      final res = await _plainDio.post<Map<String, dynamic>>(
        '/auth/register',
        data: {
          'organizationSlug': organizationSlug.trim().toLowerCase(),
          'email': email,
          'password': password,
          'firstName': firstName,
          'lastName': lastName,
          ...clientPayload,
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
        await _storage.delete(key: _kAccess);
        await _storage.delete(key: _kRefresh);
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

      session.value = AuthSession(
        accessToken: access,
        refreshToken: refresh,
        profile: me.data,
      );
    } catch (e) {
      authError.value = e;
      session.value = null;
      rethrow;
    } finally {
      isBootstrapping.value = false;
    }
  }

  Future<void> applyRefreshedTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await _persistTokens(accessToken, refreshToken);
    final current = session.value;
    session.value = (current ??
            AuthSession(accessToken: accessToken, refreshToken: refreshToken))
        .copyWith(accessToken: accessToken, refreshToken: refreshToken);
  }

  Future<void> clearLocalSession() async {
    await _storage.delete(key: _kAccess);
    await _storage.delete(key: _kRefresh);
    _persistSessionOnDisk = false;
    session.value = null;
    isBootstrapping.value = false;
  }

  Future<void> logout() async {
    final current = session.value;
    if (current != null) {
      try {
        await _plainDio.post<void>(
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
