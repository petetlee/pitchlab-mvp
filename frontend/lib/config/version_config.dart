class VersionConfig {
  static const String appVersion = 'v0.10.0';
  static const String fullVersionString = 'PitchLab MVP v0.10.0';
  static const String changeId = 'PL-FIX-20261009-001';
  static const String parentChangeId = 'PL-20261009-TEXTCOLOR-01';
  static const String buildId = '8f4b11c';
  static const String deployedAtFormatted = '09 Oct 2026 20:10 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}
