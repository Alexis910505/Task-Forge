import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import 'asset_catalog.dart';

class AssetFormResult {
  const AssetFormResult({
    required this.name,
    required this.code,
    required this.category,
    required this.status,
    this.location,
    this.maintenanceDate,
  });

  final String name;
  final String code;
  final String category;
  final String status;
  final String? location;
  final String? maintenanceDate;
}

Future<AssetFormResult?> showAssetFormDialog({
  required BuildContext context,
  required AppLocalizations l10n,
  required List<AssetCatalogOption> categories,
  required List<AssetCatalogOption> statuses,
  String? initialName,
  String? initialCode,
  String? initialCategory,
  String? initialStatus,
  String? initialLocation,
  String? initialMaintenanceDate,
  bool isEdit = false,
}) async {
  if (categories.isEmpty || statuses.isEmpty) {
    return null;
  }

  final nameCtrl = TextEditingController(text: initialName ?? '');
  final codeCtrl = TextEditingController(text: initialCode ?? '');
  final locationCtrl = TextEditingController(text: initialLocation ?? '');
  final maintenanceCtrl = TextEditingController(
    text: _toDateInput(initialMaintenanceDate),
  );

  var category =
      _resolveCode(categories, initialCategory) ??
      defaultCatalogOption(categories)!.code;
  var status =
      _resolveCode(statuses, initialStatus) ??
      defaultCatalogOption(statuses)!.code;

  final submitted = await showDialog<bool>(
    context: context,
    builder: (ctx) {
      return StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            title: Text(isEdit ? l10n.assetDetailEdit : l10n.assetsCreateTitle),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: nameCtrl,
                    decoration: InputDecoration(labelText: l10n.assetsFieldName),
                    textCapitalization: TextCapitalization.sentences,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: codeCtrl,
                    decoration: InputDecoration(labelText: l10n.assetsFieldCode),
                    textCapitalization: TextCapitalization.characters,
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: category,
                    decoration: InputDecoration(
                      labelText: l10n.assetsFieldCategory,
                    ),
                    items:
                        categories
                            .map(
                              (row) => DropdownMenuItem<String>(
                                value: row.code,
                                child: Text(row.name),
                              ),
                            )
                            .toList(),
                    onChanged: (v) {
                      if (v == null) return;
                      setDialogState(() => category = v);
                    },
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: status,
                    decoration: InputDecoration(
                      labelText: l10n.assetsFieldStatus,
                    ),
                    items:
                        statuses
                            .map(
                              (row) => DropdownMenuItem<String>(
                                value: row.code,
                                child: Text(row.name),
                              ),
                            )
                            .toList(),
                    onChanged: (v) {
                      if (v == null) return;
                      setDialogState(() => status = v);
                    },
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: locationCtrl,
                    decoration: InputDecoration(
                      labelText: l10n.assetsFieldLocation,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: maintenanceCtrl,
                    readOnly: true,
                    decoration: InputDecoration(
                      labelText: l10n.assetsFieldMaintenance,
                      suffixIcon: const Icon(Icons.calendar_today_outlined),
                    ),
                    onTap: () async {
                      final now = DateTime.now();
                      final initial =
                          DateTime.tryParse(maintenanceCtrl.text) ?? now;
                      final picked = await showDatePicker(
                        context: ctx,
                        initialDate: initial,
                        firstDate: DateTime(now.year - 5),
                        lastDate: DateTime(now.year + 10),
                      );
                      if (picked == null) return;
                      setDialogState(() {
                        maintenanceCtrl.text =
                            '${picked.year.toString().padLeft(4, '0')}-'
                            '${picked.month.toString().padLeft(2, '0')}-'
                            '${picked.day.toString().padLeft(2, '0')}';
                      });
                    },
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx, false),
                child: Text(l10n.settingsCancel),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(
                  isEdit ? l10n.assetsSaveChanges : l10n.assetsCreateSubmit,
                ),
              ),
            ],
          );
        },
      );
    },
  );

  final name = nameCtrl.text.trim();
  final code = codeCtrl.text.trim();
  final location = locationCtrl.text.trim();
  final maintenance = maintenanceCtrl.text.trim();
  nameCtrl.dispose();
  codeCtrl.dispose();
  locationCtrl.dispose();
  maintenanceCtrl.dispose();

  if (submitted != true) return null;
  if (name.isEmpty || code.isEmpty) return null;

  return AssetFormResult(
    name: name,
    code: code.toUpperCase(),
    category: category,
    status: status,
    location: location.isEmpty ? null : location,
    maintenanceDate: maintenance.isEmpty ? null : maintenance,
  );
}

String? _resolveCode(List<AssetCatalogOption> options, String? code) {
  if (code == null || code.isEmpty) return null;
  for (final o in options) {
    if (o.code == code) return o.code;
  }
  return null;
}

String _toDateInput(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  final local = dt.toLocal();
  return '${local.year.toString().padLeft(4, '0')}-'
      '${local.month.toString().padLeft(2, '0')}-'
      '${local.day.toString().padLeft(2, '0')}';
}
