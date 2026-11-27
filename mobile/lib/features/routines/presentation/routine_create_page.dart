import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import '../../../core/network/dio_provider.dart';

/// Crear una rutina personal desde el móvil (las compartidas se crean en la web).
class RoutineCreatePage extends StatefulWidget {
  const RoutineCreatePage({super.key});

  @override
  State<RoutineCreatePage> createState() => _RoutineCreatePageState();
}

class _RoutineCreatePageState extends State<RoutineCreatePage> {
  final _nameCtrl = TextEditingController();
  final _stepCtrl = TextEditingController();
  final List<String> _steps = [];
  final Set<int> _days = {1, 2, 3, 4, 5};
  bool _saving = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _stepCtrl.dispose();
    super.dispose();
  }

  void _addStep() {
    final s = _stepCtrl.text.trim();
    if (s.isEmpty) return;
    setState(() {
      _steps.add(s);
      _stepCtrl.clear();
    });
  }

  void _snack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    _addStep();
    final name = _nameCtrl.text.trim();
    if (name.isEmpty) return _snack(l10n.routinesCreateErrName);
    if (_days.isEmpty) return _snack(l10n.routinesCreateErrDays);
    if (_steps.isEmpty) return _snack(l10n.routinesCreateErrSteps);
    setState(() => _saving = true);
    try {
      await Get.find<ApiClient>().dio.post<dynamic>(
        '/routines',
        data: {
          'name': name,
          'personal': true,
          'weekdays': (_days.toList()..sort()),
          'items': [
            for (final s in _steps) {'title': s},
          ],
        },
      );
      if (mounted) context.pop(true);
    } on DioException catch (e) {
      if (mounted) _snack('${e.response?.data ?? e.message}');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final dayLabels = l10n.routinesWeekdaysShort.split(',');

    Widget label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: theme.textTheme.labelSmall?.copyWith(
          fontWeight: FontWeight.w800,
          letterSpacing: 0.6,
          color: scheme.outline,
        ),
      ),
    );

    return Scaffold(
      backgroundColor: scheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: Text(l10n.routinesNew),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 140),
        children: [
          label(l10n.routinesCreateName),
          TextField(
            controller: _nameCtrl,
            maxLength: 120,
            decoration: InputDecoration(
              hintText: l10n.routinesCreateNameHint,
              filled: true,
              fillColor: scheme.surfaceContainerLow,
              counterText: '',
            ),
          ),
          const SizedBox(height: 24),
          label(l10n.routinesCreateDays),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (var d = 1; d <= 7; d++)
                _DayToggle(
                  label: d - 1 < dayLabels.length ? dayLabels[d - 1] : '$d',
                  selected: _days.contains(d),
                  onTap:
                      () => setState(
                        () =>
                            _days.contains(d) ? _days.remove(d) : _days.add(d),
                      ),
                ),
            ],
          ),
          const SizedBox(height: 24),
          label(l10n.routinesCreateSteps),
          for (var i = 0; i < _steps.length; i++)
            ListTile(
              contentPadding: EdgeInsets.zero,
              dense: true,
              leading: CircleAvatar(
                radius: 13,
                backgroundColor: scheme.primary.withValues(alpha: 0.12),
                child: Text(
                  '${i + 1}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: scheme.primary,
                  ),
                ),
              ),
              title: Text(_steps[i], style: const TextStyle(fontSize: 15)),
              trailing: IconButton(
                icon: Icon(Icons.delete_outline, color: scheme.error),
                onPressed: () => setState(() => _steps.removeAt(i)),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _stepCtrl,
                  maxLength: 200,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _addStep(),
                  decoration: InputDecoration(
                    hintText: l10n.routinesCreateStepHint,
                    filled: true,
                    fillColor: scheme.surfaceContainerLow,
                    counterText: '',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton.filledTonal(
                onPressed: _addStep,
                icon: const Icon(Icons.add),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            l10n.routinesCreateSharedOnWeb,
            style: theme.textTheme.bodySmall?.copyWith(
              color: scheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: FilledButton.icon(
            onPressed: _saving ? null : _save,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(52),
            ),
            icon:
                _saving
                    ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                    : const Icon(Icons.save_outlined),
            label: Text(l10n.routinesCreateSave),
          ),
        ),
      ),
    );
  }
}

class _DayToggle extends StatelessWidget {
  const _DayToggle({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Semantics(
      selected: selected,
      button: true,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: CircleAvatar(
          radius: 21,
          backgroundColor:
              selected ? scheme.primary : scheme.surfaceContainerHigh,
          child: Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              color: selected ? scheme.onPrimary : scheme.onSurfaceVariant,
            ),
          ),
        ),
      ),
    );
  }
}
