import 'package:flutter/material.dart';
import 'package:get/get.dart' hide FormData, MultipartFile, Response, Value;
import 'package:go_router/go_router.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

class TaskSubtaskVm {
  const TaskSubtaskVm({
    required this.id,
    required this.title,
    required this.status,
  });

  final String id;
  final String title;
  final String status;

  bool get isDone => status == 'COMPLETED';

  TaskSubtaskVm copyWith({String? status, String? title}) {
    return TaskSubtaskVm(
      id: id,
      title: title ?? this.title,
      status: status ?? this.status,
    );
  }

  factory TaskSubtaskVm.fromJson(Map<String, dynamic> json) {
    return TaskSubtaskVm(
      id: '${json['id'] ?? ''}',
      title: '${json['title'] ?? ''}',
      status: '${json['status'] ?? 'TODO'}',
    );
  }
}

/// Solo se redibuja cuando cambia la lista/progreso de subtareas (no toda la página).
class TaskDetailSubtasksSection extends StatelessWidget {
  const TaskDetailSubtasksSection({
    super.key,
    required this.subtasks,
    required this.submitting,
    required this.controller,
    required this.onToggle,
    required this.onSubmit,
  });

  final RxList<TaskSubtaskVm> subtasks;
  final RxBool submitting;
  final TextEditingController controller;
  final void Function(String id, String currentStatus) onToggle;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;

    return Obx(() {
      final items = subtasks.toList(growable: false);
      final total = items.length;
      final completed = items.where((s) => s.isDone).length;
      final percent = total > 0 ? ((completed / total) * 100).round() : 0;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                l10n.taskDetailSubtasks,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              if (total > 0)
                Text(
                  l10n.taskDetailSubtasksProgress(completed, total),
                  style: theme.textTheme.labelSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: scheme.onSurfaceVariant,
                  ),
                ),
            ],
          ),
          if (total > 0) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: percent / 100,
                minHeight: 6,
                backgroundColor: scheme.surfaceContainerHigh,
                color: scheme.primary,
              ),
            ),
          ],
          const SizedBox(height: 12),
          if (items.isEmpty)
            Text(
              l10n.taskDetailNoSubtasks,
              style: theme.textTheme.bodySmall?.copyWith(
                color: scheme.onSurfaceVariant,
              ),
            )
          else
            for (final sub in items)
              _SubtaskRow(
                key: ValueKey(sub.id),
                subtask: sub,
                onToggle: () => onToggle(sub.id, sub.status),
              ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => onSubmit(),
                  decoration: InputDecoration(
                    hintText: l10n.taskDetailSubtaskHint,
                    filled: true,
                    fillColor: scheme.surface,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: scheme.outlineVariant),
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 14,
                      vertical: 12,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Obx(() {
                final busy = submitting.value;
                return FilledButton(
                  onPressed: busy ? null : onSubmit,
                  child:
                      busy
                          ? SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: scheme.onPrimary,
                            ),
                          )
                          : const Icon(Icons.add),
                );
              }),
            ],
          ),
        ],
      );
    });
  }
}

class _SubtaskRow extends StatelessWidget {
  const _SubtaskRow({super.key, required this.subtask, required this.onToggle});

  final TaskSubtaskVm subtask;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final scheme = theme.colorScheme;
    final l10n = AppLocalizations.of(context)!;
    final done = subtask.isDone;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Material(
        color: scheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: () => context.push('/tasks/${subtask.id}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                IconButton(
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                  onPressed: onToggle,
                  icon: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 160),
                    child: Icon(
                      done ? Icons.check_circle : Icons.radio_button_unchecked,
                      key: ValueKey(done),
                      color: done ? scheme.primary : scheme.onSurfaceVariant,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    subtask.title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      decoration: done ? TextDecoration.lineThrough : null,
                      color: done ? scheme.onSurfaceVariant : scheme.onSurface,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: (done ? scheme.tertiary : scheme.onSurfaceVariant)
                        .withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    done
                        ? l10n.taskDetailSubtaskDone
                        : l10n.taskDetailSubtaskTodo,
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: done ? scheme.tertiary : scheme.onSurfaceVariant,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
