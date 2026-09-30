class VersionConfig {
  static const String appVersion = 'v0.9.4';
  static const String fullVersionString = 'PitchLab MVP v0.9.4';
  static const String buildId = '3c7a9f2';
  static const String deployedAtFormatted = '01 Oct 2026 10:45 NZST';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
