import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

class AssetCatalogOption {
  const AssetCatalogOption({
    required this.id,
    required this.code,
    required this.name,
    required this.color,
    this.icon,
    this.isDefault = false,
    this.sortOrder = 0,
  });

  final String id;
  final String code;
  final String name;
  final String color;
  final String? icon;
  final bool isDefault;
  final int sortOrder;

  factory AssetCatalogOption.fromJson(Map<String, dynamic> json) {
    return AssetCatalogOption(
      id: '${json['id'] ?? ''}',
      code: '${json['code'] ?? ''}',
      name: '${json['name'] ?? json['code'] ?? ''}',
      color: '${json['color'] ?? '#6750A4'}',
      icon: json['icon']?.toString(),
      isDefault: json['isDefault'] == true,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

Color? assetHexColor(String? value) {
  if (value == null) return null;
  final hex = value.replaceFirst('#', '');
  if (hex.length != 6) return null;
  final parsed = int.tryParse('FF$hex', radix: 16);
  return parsed == null ? null : Color(parsed);
}

Future<List<AssetCatalogOption>> fetchAssetCategories(Dio dio) async {
  final res = await dio.get<List<dynamic>>('/assets/catalog/categories');
  return _parseCatalog(res.data);
}

Future<List<AssetCatalogOption>> fetchAssetStatuses(Dio dio) async {
  final res = await dio.get<List<dynamic>>('/assets/catalog/statuses');
  return _parseCatalog(res.data);
}

Future<({List<AssetCatalogOption> categories, List<AssetCatalogOption> statuses})>
    fetchAssetCatalogs(Dio dio) async {
  final results = await Future.wait([
    fetchAssetCategories(dio),
    fetchAssetStatuses(dio),
  ]);
  return (categories: results[0], statuses: results[1]);
}

List<AssetCatalogOption> _parseCatalog(List<dynamic>? raw) {
  if (raw == null) return const [];
  final items =
      raw
          .whereType<Map>()
          .map((m) => AssetCatalogOption.fromJson(Map<String, dynamic>.from(m)))
          .where((o) => o.code.isNotEmpty)
          .toList()
        ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  return items;
}

AssetCatalogOption? defaultCatalogOption(List<AssetCatalogOption> options) {
  if (options.isEmpty) return null;
  for (final o in options) {
    if (o.isDefault) return o;
  }
  return options.first;
}
