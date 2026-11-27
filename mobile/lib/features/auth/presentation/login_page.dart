import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';

import '../../../core/branding/app_logo.dart';
import '../../../core/config/env.dart';
import '../application/auth_repository.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;
  bool _keepSignedIn = true;
  bool _microsoft = false;

  @override
  void initState() {
    super.initState();
    Get.find<AuthController>().microsoftEnabled().then((on) {
      if (mounted) setState(() => _microsoft = on);
    });
  }

  String _microsoftError(String code, AppLocalizations l10n) {
    switch (code) {
      case 'not_registered':
        return l10n.ssoErrorNotRegistered;
      case 'other_account':
        return l10n.ssoErrorOtherAccount;
      case 'tenant':
        return l10n.ssoErrorTenant;
      case 'session':
        return l10n.ssoErrorSession;
      case 'cancelled':
        return l10n.ssoErrorCancelled;
      default:
        return l10n.ssoErrorFailed;
    }
  }

  Future<void> _signInWithMicrosoft() async {
    final l10n = AppLocalizations.of(context)!;
    final auth = Get.find<AuthController>();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final url = await auth.microsoftStartUrl(
        organizationSlug: Env.organizationSlug,
      );
      // Abre Microsoft en una pestaña segura del navegador y espera la vuelta a taskforge://
      final result = await FlutterWebAuth2.authenticate(
        url: url,
        callbackUrlScheme: 'taskforge',
      );
      final params = Uri.parse(result).queryParameters;
      final code = params['code'];
      if (code == null) {
        setState(
          () => _error = _microsoftError(params['error'] ?? 'failed', l10n),
        );
        return;
      }
      await auth.loginWithMicrosoftCode(
        code,
        persistSessionOnDisk: _keepSignedIn,
      );
      if (mounted) context.go('/dashboard');
    } on PlatformException catch (e) {
      if (mounted) {
        setState(
          () =>
              _error =
                  e.code == 'CANCELED'
                      ? l10n.ssoErrorCancelled
                      : l10n.ssoErrorFailed,
        );
      }
    } catch (e) {
      if (mounted) setState(() => _error = _formatLoginError(e, l10n));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  String _formatLoginError(Object e, AppLocalizations l10n) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map) {
        final m = data['message'];
        if (m is String && m.isNotEmpty) {
          return m;
        }
        if (m is List) {
          return m.map((x) => '$x').join(', ');
        }
      }
      return e.message ?? l10n.genericRequestError;
    }
    return e.toString();
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Get.find<AuthController>().login(
        organizationSlug: Env.organizationSlug,
        email: _email.text.trim(),
        password: _password.text,
        persistSessionOnDisk: _keepSignedIn,
      );
      if (mounted) {
        context.go('/dashboard');
      }
    } catch (e) {
      setState(() => _error = _formatLoginError(e, l10n));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;

    return Scaffold(
      body: DecoratedBox(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: const Alignment(1.0, -1.0),
            radius: 1.15,
            colors: [scheme.primaryFixed, scheme.surface],
            stops: const [0.0, 0.62],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Material(
                  color: scheme.surfaceContainerLowest,
                  elevation: 0,
                  shadowColor: scheme.shadow,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: scheme.outlineVariant),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 28,
                      vertical: 36,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Center(child: AppLogo(size: 64)),
                        const SizedBox(height: 24),
                        Text(
                          l10n.loginWelcomeTitle,
                          style: theme.textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: scheme.onSurface,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          l10n.loginWelcomeSubtitle,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                            height: 1.35,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 28),
                        if (_microsoft) ...[
                          OutlinedButton(
                            onPressed: _busy ? null : _signInWithMicrosoft,
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size.fromHeight(56),
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF5E5E5E),
                              side: const BorderSide(color: Color(0xFF8C8C8C)),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(6),
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const _MicrosoftLogo(),
                                const SizedBox(width: 12),
                                Text(
                                  l10n.ssoSignInMicrosoft,
                                  style: const TextStyle(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            l10n.ssoMicrosoftHint,
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 20),
                          Row(
                            children: [
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                ),
                                child: Text(
                                  l10n.ssoOrWithPassword,
                                  style: theme.textTheme.labelSmall?.copyWith(
                                    color: scheme.onSurfaceVariant,
                                  ),
                                ),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                          const SizedBox(height: 20),
                        ],
                        Text(
                          l10n.emailLabel.toUpperCase(),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          decoration: InputDecoration(
                            hintText: l10n.loginEmailPlaceholder,
                            prefixIcon: Icon(
                              Icons.mail_outlined,
                              color: scheme.onSurfaceVariant,
                              size: 22,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                        Text(
                          l10n.passwordLabel.toUpperCase(),
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: scheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: _password,
                          obscureText: true,
                          decoration: InputDecoration(
                            hintText: '••••••••',
                            prefixIcon: Icon(
                              Icons.lock_outline,
                              color: scheme.onSurfaceVariant,
                              size: 22,
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        CheckboxListTile(
                          value: _keepSignedIn,
                          onChanged:
                              _busy
                                  ? null
                                  : (v) {
                                    if (v == null) return;
                                    setState(() => _keepSignedIn = v);
                                  },
                          controlAffinity: ListTileControlAffinity.leading,
                          contentPadding: EdgeInsets.zero,
                          title: Text(l10n.loginKeepSignedInTitle),
                          subtitle: Text(
                            l10n.loginKeepSignedInSubtitle,
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: scheme.onSurfaceVariant,
                            ),
                          ),
                        ),
                        if (_error != null) ...[
                          const SizedBox(height: 12),
                          Text(
                            _error!,
                            style: TextStyle(
                              color: scheme.error,
                              fontSize: 13,
                              height: 1.3,
                            ),
                          ),
                        ],
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child:
                              _busy
                                  ? SizedBox(
                                    height: 22,
                                    width: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: scheme.onPrimary,
                                    ),
                                  )
                                  : Text(l10n.submitLogin.toUpperCase()),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Logotipo de Microsoft (cuatro cuadros), según su guía de marca.
class _MicrosoftLogo extends StatelessWidget {
  const _MicrosoftLogo();

  @override
  Widget build(BuildContext context) {
    Widget sq(Color c) => Container(width: 10, height: 10, color: c);
    return SizedBox(
      width: 22,
      height: 22,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              sq(const Color(0xFFF25022)),
              sq(const Color(0xFF7FBA00)),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              sq(const Color(0xFF00A4EF)),
              sq(const Color(0xFFFFB900)),
            ],
          ),
        ],
      ),
    );
  }
}
