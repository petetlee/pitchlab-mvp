class VersionConfig {
  static const String appVersion = 'v0.10.1';
  static const String fullVersionString = 'PitchLab MVP v0.10.1';
  static const String changeId = 'PL-FIX-20261009-002';
  static const String parentChangeId = 'PL-FIX-20261009-001';
  static const String buildId = 'a4d92ef';
  static const String deployedAtFormatted = '09 Oct 2026 20:55 NZDT';

  static String get displayMarker => '$fullVersionString • Build $buildId';
  static String get pdfFooterMarker => '$fullVersionString • Build $buildId';
}

