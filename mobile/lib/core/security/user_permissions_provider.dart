import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;

import '../../features/auth/application/auth_repository.dart';
import 'role_permissions.dart';

bool _can(String permission) => profileHasPermission(
  Get.find<AuthController>().currentSession?.profile,
  permission,
);

bool canReadReports() => _can('reports:read');

bool canExportReports() => _can('reports:export');

bool canReadOrganization() => _can('organizations:read');

bool canWriteOrganization() => _can('organizations:write');

bool canReadAssets() => _can('assets:read');

bool canWriteAssets() => _can('assets:write');
