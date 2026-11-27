import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/network/dio_provider.dart';
import 'routines_page.dart';

/// Tarjeta del panel: progreso de las rutinas de hoy; abre la pantalla de rutinas.
class RoutinesDashboardCard extends StatefulWidget {
  const RoutinesDashboardCard({super.key});

  @override
  State<RoutinesDashboardCard> createState() => _RoutinesDashboardCardState();
}

class _RoutinesDashboardCardState extends State<RoutinesDashboardCard> {
  int _done = 0;
  int _total = 0;
  int _steps = 0;
  int _stepsTotal = 0;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await Get.find<ApiClient>().dio.get<List<dynamic>>(
        '/routines/today',
        queryParameters: {'date': routinesLocalToday()},
      );
      final list = (res.data ?? const []).whereType<Map>().toList();
      if (!mounted) return;
      setState(() {
        _total = list.length;
        _done = list.where((r) => r['completed'] == true).length;
        _steps = list.fold(
          0,
          (n, r) => n + ((r['done'] as num?)?.toInt() ?? 0),
        );
        _stepsTotal = list.fold(
          0,
          (n, r) => n + ((r['total'] as num?)?.toInt() ?? 0),
        );
        _loaded = true;
      });
    } catch (_) {
      if (mounted) setState(() => _loaded = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final pct = _stepsTotal > 0 ? _steps / _stepsTotal : 0.0;
    return Material(
      color: scheme.surfaceContainerLowest,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () async {
          await context.push('/routines');
          if (mounted) await _load();
        },
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: scheme.outlineVariant),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: scheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.checklist, color: scheme.primary),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.routinesDashboardCard,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      !_loaded
                          ? '…'
                          : _total == 0
                          ? l10n.routinesNoneTodayShort
                          : l10n.routinesDashboardProgress(_done, _total),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                      ),
                    ),
                    if (_total > 0) ...[
                      const SizedBox(height: 8),
                      LinearProgressIndicator(
                        value: pct,
                        minHeight: 6,
                        borderRadius: BorderRadius.circular(3),
                        backgroundColor: scheme.surfaceContainerHigh,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.chevron_right, color: scheme.onSurfaceVariant),
            ],
          ),
        ),
      ),
    );
  }
}
