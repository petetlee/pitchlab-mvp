class VersionConfig {
  static const String appVersion = 'v0.9.5';
  static const String fullVersionString = 'PitchLab MVP v0.9.5';
  static const String changeId = 'PL-FIX-20261005-v0.9.5-01';
  static const String buildId = '1b52830';
  static const String deployedAtFormatted = '05 Oct 2026 22:00 NZST';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
