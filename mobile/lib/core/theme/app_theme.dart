import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'taskforge_palette.dart';

/// Tema alineado con `assets/taskforge/DESIGN.md` y maquetas `taskforge_*` (Inter + M3).
class AppTheme {
  static const _radiusLg = 8.0;
  static const _radiusXl = 12.0;

  static ColorScheme _lightScheme() {
    return ColorScheme.light(
      primary: TaskForgePalette.primary,
      onPrimary: TaskForgePalette.onPrimary,
      primaryContainer: TaskForgePalette.primaryContainer,
      onPrimaryContainer: TaskForgePalette.onPrimaryContainer,
      secondary: TaskForgePalette.secondary,
      onSecondary: TaskForgePalette.onSecondary,
      secondaryContainer: TaskForgePalette.secondaryContainer,
      onSecondaryContainer: TaskForgePalette.onSecondaryContainer,
      tertiary: TaskForgePalette.tertiary,
      onTertiary: TaskForgePalette.onTertiary,
      tertiaryContainer: TaskForgePalette.tertiaryContainer,
      onTertiaryContainer: TaskForgePalette.onTertiaryContainer,
      error: TaskForgePalette.error,
      onError: TaskForgePalette.onError,
      errorContainer: TaskForgePalette.errorContainer,
      onErrorContainer: TaskForgePalette.onErrorContainer,
      surface: TaskForgePalette.surface,
      onSurface: TaskForgePalette.onSurface,
      onSurfaceVariant: TaskForgePalette.onSurfaceVariant,
      outline: TaskForgePalette.outline,
      outlineVariant: TaskForgePalette.outlineVariant,
      inverseSurface: TaskForgePalette.inverseSurface,
      onInverseSurface: TaskForgePalette.inverseOnSurface,
      surfaceTint: TaskForgePalette.primary,
      surfaceContainerLowest: TaskForgePalette.surfaceContainerLowest,
      surfaceContainerLow: TaskForgePalette.surfaceContainerLow,
      surfaceContainer: TaskForgePalette.surfaceContainer,
      surfaceContainerHigh: TaskForgePalette.surfaceContainerHigh,
      surfaceContainerHighest: TaskForgePalette.surfaceContainerHighest,
      inversePrimary: TaskForgePalette.inversePrimary,
      primaryFixed: TaskForgePalette.primaryFixed,
      onPrimaryFixed: TaskForgePalette.onPrimaryFixed,
    );
  }

  static ColorScheme _darkScheme() {
    return ColorScheme.dark(
      primary: TaskForgePalette.inversePrimary,
      onPrimary: TaskForgePalette.onPrimaryFixed,
      primaryContainer: const Color(0xFF3C3BA8),
      onPrimaryContainer: TaskForgePalette.inverseOnSurface,
      secondary: TaskForgePalette.secondaryFixedDim,
      onSecondary: TaskForgePalette.onSecondaryFixed,
      secondaryContainer: const Color(0xFF3A485B),
      onSecondaryContainer: TaskForgePalette.secondaryFixed,
      tertiary: TaskForgePalette.tertiaryFixedDim,
      onTertiary: TaskForgePalette.onTertiaryFixed,
      tertiaryContainer: const Color(0xFF005321),
      onTertiaryContainer: TaskForgePalette.tertiaryFixed,
      error: const Color(0xFFFFB4AB),
      onError: const Color(0xFF690005),
      errorContainer: const Color(0xFF93000A),
      onErrorContainer: const Color(0xFFFFDAD6),
      surface: TaskForgePalette.inverseSurface,
      onSurface: TaskForgePalette.inverseOnSurface,
      onSurfaceVariant: TaskForgePalette.secondaryFixedDim,
      outline: const Color(0xFF8E9099),
      outlineVariant: const Color(0xFF46474E),
      inverseSurface: TaskForgePalette.surface,
      onInverseSurface: TaskForgePalette.onSurface,
      surfaceTint: TaskForgePalette.inversePrimary,
      surfaceContainerLowest: const Color(0xFF1B1F2A),
      surfaceContainerLow: const Color(0xFF222530),
      surfaceContainer: const Color(0xFF283044),
      surfaceContainerHigh: const Color(0xFF323848),
      surfaceContainerHighest: const Color(0xFF3D4454),
      inversePrimary: TaskForgePalette.primary,
    );
  }

  static TextTheme _interTextTheme(TextTheme base, ColorScheme scheme) {
    TextStyle apply(TextStyle? s, {double? letterSpacing, FontWeight? weight}) {
      final t = GoogleFonts.inter(textStyle: s);
      return t.copyWith(letterSpacing: letterSpacing, fontWeight: weight);
    }

    return base.copyWith(
      displayLarge: apply(base.displayLarge, letterSpacing: -0.02, weight: FontWeight.w700),
      headlineMedium: apply(base.headlineMedium, letterSpacing: -0.01, weight: FontWeight.w600),
      headlineSmall: apply(base.headlineSmall, weight: FontWeight.w600),
      titleLarge: apply(base.titleLarge, weight: FontWeight.w600),
      titleMedium: apply(base.titleMedium, weight: FontWeight.w600),
      bodyLarge: apply(base.bodyLarge),
      bodyMedium: apply(base.bodyMedium),
      bodySmall: apply(base.bodySmall),
      labelLarge: apply(base.labelLarge, letterSpacing: 0.05, weight: FontWeight.w700),
    );
  }

  static ThemeData get light {
    final scheme = _lightScheme();
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );
    return base.copyWith(
      scaffoldBackgroundColor: scheme.surface,
      textTheme: _interTextTheme(base.textTheme, scheme),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: scheme.primary,
        ),
        shape: Border(bottom: BorderSide(color: scheme.outlineVariant, width: 1)),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shadowColor: scheme.onSurface.withValues(alpha: 0.08),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusXl),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        color: scheme.surfaceContainerLowest,
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radiusXl)),
          textStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.2),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusLg),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusLg),
          borderSide: BorderSide(color: scheme.outlineVariant),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_radiusLg),
          borderSide: BorderSide(color: scheme.primary, width: 2),
        ),
        labelStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: scheme.onSurfaceVariant,
        ),
        floatingLabelStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: scheme.primary,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: scheme.primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((s) {
          final selected = s.contains(WidgetState.selected);
          return GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.4,
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((s) {
          final selected = s.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? scheme.primary : scheme.onSurfaceVariant,
            size: 24,
          );
        }),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.inverseSurface,
        indicatorColor: scheme.secondaryContainer.withValues(alpha: 0.3),
        selectedIconTheme: IconThemeData(color: scheme.inversePrimary),
        selectedLabelTextStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: scheme.inversePrimary,
        ),
        unselectedIconTheme: IconThemeData(color: scheme.onInverseSurface.withValues(alpha: 0.8)),
        unselectedLabelTextStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.6,
          color: scheme.onInverseSurface.withValues(alpha: 0.8),
        ),
      ),
      drawerTheme: DrawerThemeData(
        backgroundColor: scheme.inverseSurface,
        surfaceTintColor: Colors.transparent,
      ),
      dividerTheme: DividerThemeData(color: scheme.outlineVariant, thickness: 1),
    );
  }

  static ThemeData get dark {
    final scheme = _darkScheme();
    final base = ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      visualDensity: VisualDensity.adaptivePlatformDensity,
    );
    return base.copyWith(
      scaffoldBackgroundColor: scheme.surface,
      textTheme: _interTextTheme(base.textTheme, scheme),
      appBarTheme: AppBarTheme(
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        backgroundColor: scheme.surface,
        foregroundColor: scheme.onSurface,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: GoogleFonts.inter(
          fontSize: 18,
          fontWeight: FontWeight.w800,
          color: scheme.primary,
        ),
        shape: Border(bottom: BorderSide(color: scheme.outlineVariant, width: 1)),
      ),
      cardTheme: CardThemeData(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_radiusXl),
          side: BorderSide(color: scheme.outlineVariant),
        ),
        color: scheme.surfaceContainerLow,
        margin: EdgeInsets.zero,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radiusXl)),
          textStyle: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.2),
        ),
      ),
      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: scheme.surfaceContainerLow,
        selectedIconTheme: IconThemeData(color: scheme.primary),
        selectedLabelTextStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w700,
          color: scheme.primary,
        ),
      ),
    );
  }
}
