import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_repository.dart';
import 'role_permissions.dart';

final currentUserRoleProvider = Provider<String?>((ref) {
  final profile = ref.watch(authRepositoryProvider).valueOrNull?.profile;
  return roleNameFromProfile(profile);
});

final canReadReportsProvider = Provider<bool>((ref) {
  return roleHasPermission(ref.watch(currentUserRoleProvider), 'reports:read');
});

final canExportReportsProvider = Provider<bool>((ref) {
  return roleHasPermission(ref.watch(currentUserRoleProvider), 'reports:export');
});

final canReadOrganizationProvider = Provider<bool>((ref) {
  return roleHasPermission(ref.watch(currentUserRoleProvider), 'organizations:read');
});

final canWriteOrganizationProvider = Provider<bool>((ref) {
  return roleHasPermission(ref.watch(currentUserRoleProvider), 'organizations:write');
});
