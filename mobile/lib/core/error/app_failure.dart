import 'package:freezed_annotation/freezed_annotation.dart';

part 'app_failure.freezed.dart';

/// Fallos de dominio / red reutilizables (Clean Architecture, capa de aplicación).
@freezed
class AppFailure with _$AppFailure {
  const factory AppFailure.network({String? message}) = _Network;

  const factory AppFailure.unauthorized() = _Unauthorized;

  const factory AppFailure.notFound({String? message}) = _NotFound;

  const factory AppFailure.validation({String? message}) = _Validation;

  const factory AppFailure.unknown({String? message}) = _Unknown;
}
