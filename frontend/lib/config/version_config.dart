class VersionConfig {
  static const String appVersion = 'v0.9.3';
  static const String fullVersionString = 'PitchLab MVP v0.9.3';
  static const String buildId = '885aa22';
  static const String deployedAtFormatted = '01 Oct 2026 08:28 NZST';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
