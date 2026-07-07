import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/layout/app_mobile_top_bar.dart';
import '../../auth/application/auth_repository.dart';

/// Organización actual y cambio (assets/taskforge_organization_mobile).
class OrganizationPage extends ConsumerWidget {
  const OrganizationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final profile = ref.watch(authRepositoryProvider).valueOrNull?.profile;
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return ListView(
      padding: EdgeInsets.fromLTRB(wide ? 16 : 20, wide ? 16 : 8, wide ? 16 : 20, 120),
      children: [
        if (!wide) AppMobileTopBar(profile: profile),
        Text(l10n.orgTitle, style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),
        Text(l10n.orgCurrentSection, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Icon(Icons.apartment)),
            title: Text(l10n.orgDemoName),
            subtitle: Text(l10n.orgPlanDemo),
            trailing: Icon(Icons.check, color: theme.colorScheme.primary),
          ),
        ),
        const SizedBox(height: 24),
        Text(l10n.orgChangeSection, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Card(
          child: ListTile(
            leading: const CircleAvatar(child: Text('A')),
            title: Text(l10n.orgAcme),
            subtitle: Text(l10n.orgInvitePending),
            onTap: () {},
          ),
        ),
      ],
    );
  }
}
