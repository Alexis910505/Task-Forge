import 'package:flutter/material.dart';
import 'package:task_forge_app/l10n/gen/app_localizations.dart';

import 'asset_catalog.dart';

class AssetStatusVisual {
  const AssetStatusVisual({
    required this.label,
    required this.background,
    required this.foreground,
  });

  final String label;
  final Color background;
  final Color foreground;
}

AssetStatusVisual assetStatusVisual(
  String status,
  ColorScheme scheme,
  AppLocalizations l10n, {
  String? customLabel,
  String? customColor,
}) {
  if (customLabel != null && customLabel.isNotEmpty) {
    final color = assetHexColor(customColor) ?? scheme.primary;
    return AssetStatusVisual(
      label: customLabel,
      background: color.withValues(alpha: 0.16),
      foreground: color,
    );
  }
  switch (status) {
    case 'OPERATIONAL':
      return AssetStatusVisual(
        label: l10n.assetStatusActive,
        background: scheme.tertiaryFixed,
        foreground: scheme.onTertiaryFixed,
      );
    case 'MAINTENANCE':
      return AssetStatusVisual(
        label: l10n.assetStatusMaintenance,
        background: scheme.secondaryContainer,
        foreground: scheme.onSecondaryContainer,
      );
    case 'OFFLINE':
      return AssetStatusVisual(
        label: l10n.assetStatusOffline,
        background: scheme.errorContainer,
        foreground: scheme.onErrorContainer,
      );
    case 'RETIRED':
      return AssetStatusVisual(
        label: l10n.assetStatusRetired,
        background: scheme.surfaceContainerHigh,
        foreground: scheme.onSurfaceVariant,
      );
    case 'RESERVED':
      return AssetStatusVisual(
        label: l10n.assetStatusReserved,
        background: scheme.primaryContainer.withValues(alpha: 0.35),
        foreground: scheme.primary,
      );
    default:
      return AssetStatusVisual(
        label: status.isEmpty ? '—' : status,
        background: scheme.surfaceContainerHigh,
        foreground: scheme.onSurfaceVariant,
      );
  }
}

String assetCategoryLabel(
  String category,
  AppLocalizations l10n, {
  String? customLabel,
}) {
  if (customLabel != null && customLabel.isNotEmpty) {
    return customLabel;
  }
  switch (category) {
    case 'VEHICLE':
      return l10n.assetCategoryVehicles;
    case 'TOOL':
      return l10n.assetCategoryTools;
    case 'MACHINERY':
      return l10n.assetCategoryMachinery;
    case 'EQUIPMENT':
      return l10n.assetCategoryEquipment;
    case 'HVAC':
      return l10n.assetCategoryHvac;
    case 'ELECTRICAL':
      return l10n.assetCategoryElectrical;
    case 'BUILDING':
      return l10n.assetCategoryBuilding;
    case 'ROOM':
      return l10n.assetCategoryRoom;
    case 'OTHER':
      return l10n.assetCategoryOther;
    default:
      return category.isEmpty ? '—' : category;
  }
}

String assetHistoryActionLabel(String action, AppLocalizations l10n) {
  switch (action) {
    case 'ASSET_CREATED':
      return l10n.assetHistoryCreated;
    case 'ASSET_UPDATED':
      return l10n.assetHistoryUpdated;
    case 'PHOTO_ADDED':
      return l10n.assetHistoryPhotoAdded;
    case 'PHOTO_REMOVED':
      return l10n.assetHistoryPhotoRemoved;
    case 'LINKED_TO_TASK':
      return l10n.assetHistoryLinkedTask;
    case 'UNLINKED_FROM_TASK':
      return l10n.assetHistoryUnlinkedTask;
    default:
      return action.isEmpty ? '—' : action.replaceAll('_', ' ');
  }
}
