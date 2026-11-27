import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/network/dio_provider.dart';

/// Fecha local del dispositivo (YYYY-MM-DD): el día de la rutina es el del usuario.
String routinesLocalToday() => DateFormat('yyyy-MM-dd').format(DateTime.now());

/// Rutinas de hoy: pasos para marcar, progreso, racha y cumplimiento.
class RoutinesPage extends StatefulWidget {
  const RoutinesPage({super.key});

  @override
  State<RoutinesPage> createState() => _RoutinesPageState();
}

class _RoutinesPageState extends State<RoutinesPage> {
  final String _date = routinesLocalToday();
  List<Map<String, dynamic>> _routines = [];
  bool _loading = true;
  String? _error;
  final Set<String> _busy = {};

  Dio get _dio => Get.find<ApiClient>().dio;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final res = await _dio.get<List<dynamic>>(
        '/routines/today',
        queryParameters: {'date': _date},
      );
      if (!mounted) return;
      setState(() {
        _routines =
            (res.data ?? const [])
                .whereType<Map>()
                .map((e) => Map<String, dynamic>.from(e))
                .toList();
        _error = null;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _toggle(String routineId, String itemId, bool checked) async {
    final l10n = AppLocalizations.of(context)!;
    setState(() {
      _busy.add(itemId);
      // Cambio inmediato; la respuesta del servidor lo confirma.
      for (final r in _routines) {
        if (r['id'] != routineId) continue;
        for (final i in (r['items'] as List)) {
          if (i is Map && i['id'] == itemId) i['checked'] = checked;
        }
      }
    });
    try {
      final res = await _dio.post<Map<String, dynamic>>(
        '/routines/$routineId/check',
        data: {'date': _date, 'itemId': itemId, 'checked': checked},
      );
      final fresh = res.data;
      if (fresh != null && mounted) {
        setState(() {
          _routines = [
            for (final r in _routines) r['id'] == routineId ? fresh : r,
          ];
        });
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(l10n.routinesCheckFailed)));
        await _load();
      }
    } finally {
      if (mounted) setState(() => _busy.remove(itemId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        title: Text(l10n.routinesTitle),
        actions: [
          IconButton(onPressed: _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final created = await context.push<bool>('/routines/new');
          if (created == true) await _load();
        },
        icon: const Icon(Icons.add),
        label: Text(l10n.routinesNew),
      ),
      body:
          _loading
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 120),
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(
                          _error!,
                          style: TextStyle(color: scheme.error),
                        ),
                      ),
                    Text(
                      l10n.routinesToday.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: scheme.outline,
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_routines.isEmpty && _error == null)
                      Container(
                        padding: const EdgeInsets.all(24),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: scheme.outlineVariant),
                        ),
                        child: Text(
                          l10n.routinesNoneToday,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: scheme.onSurfaceVariant),
                        ),
                      ),
                    for (final r in _routines)
                      _RoutineCard(
                        routine: r,
                        busy: _busy,
                        onToggle:
                            (itemId, checked) =>
                                _toggle('${r['id']}', itemId, checked),
                      ),
                  ],
                ),
              ),
    );
  }
}

class _RoutineCard extends StatelessWidget {
  const _RoutineCard({
    required this.routine,
    required this.busy,
    required this.onToggle,
  });

  final Map<String, dynamic> routine;
  final Set<String> busy;
  final void Function(String itemId, bool checked) onToggle;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final items = (routine['items'] as List? ?? const []).whereType<Map>();
    final done = items.where((i) => i['checked'] == true).length;
    final total = items.length;
    final complete = total > 0 && done >= total;
    final streak = (routine['streak'] as num?)?.toInt() ?? 0;
    final rate = (routine['completionRate'] as num?)?.toInt();
    final ok = Colors.green.shade700;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: scheme.surfaceContainerLowest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: complete ? ok.withValues(alpha: 0.5) : scheme.outlineVariant,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(
                width: 48,
                height: 48,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CircularProgressIndicator(
                      value: total > 0 ? done / total : 0,
                      strokeWidth: 5,
                      backgroundColor: scheme.surfaceContainerHigh,
                      color: complete ? ok : scheme.primary,
                    ),
                    complete
                        ? Icon(Icons.check, color: ok)
                        : Text(
                          '$done/$total',
                          style: theme.textTheme.labelSmall?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                  ],
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${routine['name']}',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    Text(
                      [
                        routine['personal'] == true
                            ? l10n.routinesPersonal
                            : l10n.routinesShared,
                        if (complete) l10n.routinesCompletedToday,
                      ].join(' · '),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: complete ? ok : scheme.onSurfaceVariant,
                        fontWeight: complete ? FontWeight.w700 : null,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final i in items)
            CheckboxListTile(
              value: i['checked'] == true,
              onChanged:
                  busy.contains(i['id'])
                      ? null
                      : (v) => onToggle('${i['id']}', v ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              dense: true,
              title: Text(
                '${i['title']}',
                style: TextStyle(
                  fontSize: 15,
                  decoration:
                      i['checked'] == true ? TextDecoration.lineThrough : null,
                  color:
                      i['checked'] == true
                          ? scheme.onSurfaceVariant
                          : scheme.onSurface,
                ),
              ),
            ),
          const Divider(height: 20),
          Row(
            children: [
              Icon(
                Icons.local_fire_department,
                size: 18,
                color: scheme.primary,
              ),
              const SizedBox(width: 4),
              Text(
                l10n.routinesStreak(streak),
                style: theme.textTheme.labelMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const Spacer(),
              Text(
                rate == null ? l10n.routinesNoRateYet : l10n.routinesRate(rate),
                style: theme.textTheme.labelMedium?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
