import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _localeKey = 'tf_app_locale';

class LocaleController extends GetxController {
  final locale = const Locale('es').obs;

  @override
  void onInit() {
    super.onInit();
    unawaited(_restore());
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_localeKey);
    if (code == 'en' || code == 'es') {
      locale.value = Locale(code!);
    }
  }

  Future<void> setLocale(Locale value) async {
    if (value.languageCode != 'en' && value.languageCode != 'es') {
      return;
    }
    locale.value = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_localeKey, value.languageCode);
  }
}
