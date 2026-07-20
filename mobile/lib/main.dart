import 'package:flutter/material.dart';

import 'app/task_forge_app.dart';
import 'core/di/initial_binding.dart';
import 'core/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  InitialBinding().dependencies();
  initAppRouter();
  runApp(const TaskForgeApp());
}
